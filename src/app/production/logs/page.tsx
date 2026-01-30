'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Activity, Search, Filter, Package, FileCheck, Loader2, ChevronDown, ChevronUp, Trash2, Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CloudDownload, Database, Download } from 'lucide-react';
import { ImportModal } from '@/components/ImportModal';
import { getProcessColor } from '@/lib/process-colors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type ProductionLog = {
  id: string;
  processType: string;
  dateProcessed: string;
  processedQty: number;
  remainingQty: number;
  processingTeam: string | null;
  processingLocation: string | null;
  remarks: string | null;
  qcStatus: string;
  qcRequired: boolean;
  createdAt: string;
  source: string | null;
  externalRef: string | null;
  assemblyPart: {
    id: string;
    partDesignation: string;
    name: string;
    quantity: number;
    netWeightTotal: number | null;
    netAreaTotal: number | null;
    source: string | null;
    project: { id: string; name: string; projectNumber: string };
    building: { id: string; name: string; designation: string } | null;
  };
  rfiProductionLogs: Array<{
    rfiRequest: {
      rfiNumber: string | null;
      status: string;
    };
  }>;
};

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProductionLogsPage() {
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [processFilter, setProcessFilter] = useState('all');
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [showRFIDialog, setShowRFIDialog] = useState(false);
  const [creatingRFI, setCreatingRFI] = useState(false);
  const [qcUsers, setQcUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [assignedQCId, setAssignedQCId] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 100, total: 0, totalPages: 0 });
  const [pageSize, setPageSize] = useState(100);
  const [showRectifyDialog, setShowRectifyDialog] = useState(false);
  const [rectifyingLog, setRectifyingLog] = useState<ProductionLog | null>(null);
  const [rectifyRemarks, setRectifyRemarks] = useState('');
  const [qcStatusFilter, setQcStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [isProcessStatsCollapsed, setIsProcessStatsCollapsed] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProjectId, setImportProjectId] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; projectNumber: string; name: string }>>([]);
  const [totalStats, setTotalStats] = useState<{ totalWeight: number; processStats: Array<{ processType: string; count: number; weight: number; percentage: number }> } | null>(null);
  const { toast } = useToast();

  const fetchLogs = useCallback(async (page = 1, search = searchQuery, limit = pageSize) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (search) params.set('search', search);
      if (processFilter !== 'all') params.set('process', processFilter);
      if (projectFilter !== 'all') params.set('projectId', projectFilter);

      const response = await fetch(`/api/production/logs?${params}`);
      if (response.ok) {
        const result = await response.json();
        setLogs(result.data || []);
        setPagination(result.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 });
        setTotalStats(result.totalStats || null);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, processFilter, projectFilter, pageSize]);

  useEffect(() => {
    fetchLogs(1);
  }, [processFilter, projectFilter, pageSize]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    fetchLogs(1, searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchLogs(page);
    }
  };

  const getSourceBadge = (source: string | null) => {
    if (source === 'PTS') {
      return (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">
          <CloudDownload className="h-3 w-3 mr-1" />
          PTS
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 text-xs">
        <Database className="h-3 w-3 mr-1" />
        OTS
      </Badge>
    );
  };

  const fetchQCUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Filter for QC users (you can adjust the role name as needed)
        const qcFilteredUsers = data.filter((user: any) => 
          user.role?.name === 'QC' || user.role?.name === 'Quality Control'
        );
        setQcUsers(qcFilteredUsers);
      }
    } catch (error) {
      console.error('Error fetching QC users:', error);
    }
  };

  const handleSelectLog = (logId: string) => {
    const log = logs.find(l => l.id === logId);
    
    // Prevent selecting items that are already submitted or approved
    if (log && (log.qcStatus === 'Pending Inspection' || log.qcStatus === 'Approved')) {
      alert(`Cannot select this item: It is already ${log.qcStatus === 'Approved' ? 'QC Approved' : 'submitted for QC inspection'}`);
      return;
    }
    
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const handleSelectAll = () => {
    // Filter out items that are already submitted or approved
    const selectableLogs = filteredLogs.filter(
      log => log.qcStatus !== 'Pending Inspection' && log.qcStatus !== 'Approved'
    );
    
    if (selectedLogs.size === selectableLogs.length && selectableLogs.length > 0) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(selectableLogs.map(log => log.id)));
    }
  };

  const handleRequestQC = () => {
    if (selectedLogs.size === 0) return;
    
    // Double-check that none of the selected items are already submitted or approved
    const invalidSelections = Array.from(selectedLogs)
      .map(id => logs.find(l => l.id === id))
      .filter(log => log && (log.qcStatus === 'Pending Inspection' || log.qcStatus === 'Approved'));
    
    if (invalidSelections.length > 0) {
      alert('Some selected items are already submitted or approved. Please deselect them first.');
      // Remove invalid selections
      const validSelections = Array.from(selectedLogs).filter(
        id => !invalidSelections.find(inv => inv?.id === id)
      );
      setSelectedLogs(new Set(validSelections));
      return;
    }
    
    fetchQCUsers();
    setShowRFIDialog(true);
  };

  const handleCreateRFI = async () => {
    try {
      setCreatingRFI(true);
      console.log('Creating RFI for logs:', Array.from(selectedLogs));
      console.log('Assigned QC ID:', assignedQCId);
      
      const response = await fetch('/api/qc/rfi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionLogIds: Array.from(selectedLogs),
          assignedToId: assignedQCId || null,
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setShowRFIDialog(false);
        setSelectedLogs(new Set());
        setAssignedQCId('');
        fetchLogs(); // Refresh to show updated QC status
        
        // Build success message with RFI numbers
        const rfiCount = data.rfis?.length || 0;
        const rfiNumbers = data.rfis?.map((rfi: any) => rfi.rfiNumber).filter(Boolean).join('\n') || '';
        const successMessage = rfiNumbers 
          ? `${rfiCount} RFI(s) created successfully!\n\n${rfiNumbers}`
          : `${rfiCount} RFI(s) created successfully!`;
        
        alert(successMessage);
      } else {
        const errorMsg = data.details 
          ? `${data.error}\n\nDetails: ${data.details}\n\n${data.hint || ''}` 
          : data.error || 'Unknown error';
        alert(`Failed to create RFI:\n\n${errorMsg}`);
      }
    } catch (error) {
      console.error('Error creating RFI:', error);
      alert('Failed to create RFI: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setCreatingRFI(false);
    }
  };

  const handleRectify = (log: ProductionLog) => {
    setRectifyingLog(log);
    setRectifyRemarks('');
    setShowRectifyDialog(true);
  };

  const handleSubmitRectification = async () => {
    if (!rectifyingLog) return;

    try {
      setCreatingRFI(true);
      
      // Create a new RFI for the rectified item
      const response = await fetch('/api/qc/rfi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionLogIds: [rectifyingLog.id],
          assignedToId: null,
          rectificationRemarks: rectifyRemarks,
        }),
      });

      if (response.ok) {
        setShowRectifyDialog(false);
        setRectifyingLog(null);
        setRectifyRemarks('');
        fetchLogs();
        alert('Item resubmitted for QC inspection!');
      } else {
        const data = await response.json();
        alert(`Failed to resubmit: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error resubmitting for QC:', error);
      alert('Failed to resubmit item');
    } finally {
      setCreatingRFI(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) return;

    setDeleting(true);
    try {
      const ids = Array.from(selectedLogs).join(',');
      const response = await fetch(`/api/production/logs?ids=${ids}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message || `Deleted ${data.deletedCount} production log(s)`,
        });
        setShowDeleteDialog(false);
        setSelectedLogs(new Set());
        fetchLogs();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete production logs',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting production logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete production logs',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getQCStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending Inspection':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pending QC</span>;
      case 'Approved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">QC Approved</span>;
      case 'Rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">QC Rejected</span>;
      default:
        return null;
    }
  };

  // Logs are now filtered server-side, apply only QC status filter client-side
  const filteredLogs = logs.filter((log) => {
    const matchesQCStatus = qcStatusFilter === 'all' || log.qcStatus === qcStatusFilter;
    return matchesQCStatus;
  });

  const uniqueProcessTypes = Array.from(new Set(logs.map(log => log.processType))).sort();
  const uniqueProjects = Array.from(new Set(logs.map(log => log.assemblyPart.project.projectNumber))).sort();

  // Calculate statistics based on filtered logs
  const stats = {
    total: filteredLogs.length,
    totalQty: filteredLogs.reduce((sum, log) => sum + log.processedQty, 0),
    pendingQC: filteredLogs.filter(log => log.qcStatus === 'Pending Inspection').length,
    approved: filteredLogs.filter(log => log.qcStatus === 'Approved').length,
    rejected: filteredLogs.filter(log => log.qcStatus === 'Rejected').length,
    withRFI: filteredLogs.filter(log => log.rfiProductionLogs && log.rfiProductionLogs.length > 0).length,
    notRequired: filteredLogs.filter(log => log.qcStatus === 'Not Required').length,
    totalWeight: filteredLogs.reduce((sum, log) => sum + (Number(log.assemblyPart.netWeightTotal) || 0), 0) / 1000, // Convert to tons
    totalArea: filteredLogs.reduce((sum, log) => sum + (Number(log.assemblyPart.netAreaTotal) || 0), 0),
  };

  // Calculate completion % per process
  const processStats: { [key: string]: { count: number; weight: number; percentage: number } } = {};
  const totalProjectWeight = logs.reduce((sum, log) => sum + (Number(log.assemblyPart.netWeightTotal) || 0), 0) / 1000;
  
  filteredLogs.forEach(log => {
    if (!processStats[log.processType]) {
      processStats[log.processType] = { count: 0, weight: 0, percentage: 0 };
    }
    processStats[log.processType].count++;
    processStats[log.processType].weight += (Number(log.assemblyPart.netWeightTotal) || 0) / 1000;
  });

  // Calculate percentage for each process
  Object.keys(processStats).forEach(processType => {
    processStats[processType].percentage = totalProjectWeight > 0 
      ? (processStats[processType].weight / totalProjectWeight) * 100 
      : 0;
  });

  // Get latest RFIs from filtered logs - grouped by RFI number
  const rfiMap = new Map<string, {
    rfiNumber: string;
    status: string;
    parts: string[];
  }>();

  filteredLogs
    .filter(log => log.rfiProductionLogs && log.rfiProductionLogs.length > 0)
    .forEach(log => {
      const rfiNumber = log.rfiProductionLogs[0].rfiRequest.rfiNumber || '';
      const status = log.rfiProductionLogs[0].rfiRequest.status;
      const partDesignation = log.assemblyPart.partDesignation;

      if (!rfiMap.has(rfiNumber)) {
        rfiMap.set(rfiNumber, {
          rfiNumber,
          status,
          parts: [partDesignation],
        });
      } else {
        const existing = rfiMap.get(rfiNumber)!;
        if (!existing.parts.includes(partDesignation)) {
          existing.parts.push(partDesignation);
        }
      }
    });

  const latestRFIs = Array.from(rfiMap.values()).slice(0, 5); // Get latest 5 unique RFIs

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Production Logs
            {selectedLogs.size > 0 && (
              <span className="text-sm text-primary font-medium">
                ({selectedLogs.size} selected)
              </span>
            )}
          </h1>
          <div className="flex gap-2">
            {selectedLogs.size > 0 && (
              <>
                <Button onClick={handleRequestQC} variant="outline" size="sm">
                  <FileCheck className="mr-2 h-4 w-4" />
                  Request QC
                </Button>
                <Button 
                  onClick={() => setShowDeleteDialog(true)} 
                  variant="destructive" 
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedLogs.size})
                </Button>
              </>
            )}
            <a href="/templates/production-log-import-template.csv" download>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Link href="/production/mass-log">
              <Button size="sm">
                <Activity className="mr-2 h-4 w-4" />
                Mass Log Production
              </Button>
            </Link>
          </div>
        </div>

        {/* Compact Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 h-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <Button onClick={handleSearch} size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">All Projects</option>
            {uniqueProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <select
            value={processFilter}
            onChange={(e) => setProcessFilter(e.target.value)}
            className="h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">All Processes</option>
            {uniqueProcessTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={qcStatusFilter}
            onChange={(e) => setQcStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">All QC Status</option>
            <option value="Not Required">Not Required</option>
            <option value="Pending Inspection">Pending QC</option>
            <option value="Approved">QC Approved</option>
            <option value="Rejected">QC Rejected</option>
          </select>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {pagination.total > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 px-2 rounded-md border bg-background text-sm"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={pagination.page === 1}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToPage(pagination.totalPages)} disabled={pagination.page === pagination.totalPages}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">Total Logs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.totalWeight.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total Weight (tons)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalArea.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total Area (m²)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.totalQty}</div>
            <p className="text-xs text-muted-foreground">Total Pieces</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">QC Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Process Completion Stats - Uses total stats from API, not just page data */}
      {totalStats && totalStats.processStats.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setIsProcessStatsCollapsed(!isProcessStatsCollapsed)}>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Completion by Process (All Filtered Data)</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isProcessStatsCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          {!isProcessStatsCollapsed && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {totalStats.processStats
                  .sort((a, b) => {
                    // Define the correct process order
                    const processOrder = [
                      'Preparation',
                      'Fit-up',
                      'Welding',
                      'Visualization',
                      'Dispatch to Sandblasting',
                      'Sandblasting',
                      'Dispatch to Galvanization',
                      'Galvanization',
                      'Dispatch to Painting',
                      'Painting',
                      'Dispatch to Customs',
                      'Dispatch to Site',
                      'Dispatch to Customer',
                      'Erection'
                    ];
                    const indexA = processOrder.indexOf(a.processType);
                    const indexB = processOrder.indexOf(b.processType);
                    // If not in order list, put at end
                    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                  })
                  .map((data) => {
                    const colors = getProcessColor(data.processType);
                    return (
                      <div key={data.processType} className={`border-l-4 ${colors.border} pl-3 ${colors.bgLight} p-2 rounded-r`}>
                        <p className={`text-xs font-semibold ${colors.textDark}`}>{data.processType}</p>
                        <p className={`text-xl font-bold ${colors.textDark}`}>{data.percentage.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{data.weight.toFixed(2)} tons</p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Logs List */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {searchQuery || processFilter !== 'all'
                  ? 'No logs match your filters'
                  : 'No production logs yet'}
              </p>
              <Link href="/production/log">
                <Button>
                  <Activity className="mr-2 h-4 w-4" />
                  Log Production
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={selectedLogs.size === filteredLogs.length && filteredLogs.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="p-3 text-left text-sm font-medium">Part Designation</th>
                  <th className="p-3 text-left text-sm font-medium">Source</th>
                  <th className="p-3 text-left text-sm font-medium">Process</th>
                  <th className="p-3 text-left text-sm font-medium">Date</th>
                  <th className="p-3 text-left text-sm font-medium">Processed Qty</th>
                  <th className="p-3 text-left text-sm font-medium">Total Qty</th>
                  <th className="p-3 text-left text-sm font-medium">QC Status</th>
                  <th className="p-3 text-left text-sm font-medium">Team</th>
                  <th className="p-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isAlreadySubmitted = log.qcStatus === 'Pending Inspection' || log.qcStatus === 'Approved';
                  return (
                  <tr key={log.id} className={`border-t hover:bg-muted/50 ${isAlreadySubmitted ? 'opacity-60 bg-muted/20' : ''}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedLogs.has(log.id)}
                        onChange={() => handleSelectLog(log.id)}
                        disabled={isAlreadySubmitted}
                        className="rounded disabled:cursor-not-allowed"
                        title={isAlreadySubmitted ? 'Already submitted or approved' : ''}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{log.assemblyPart.partDesignation}</p>
                          <p className="text-xs text-muted-foreground">{log.assemblyPart.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {getSourceBadge(log.assemblyPart.source)}
                    </td>
                    <td className="p-3">
                      <div className="inline-flex px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                        {log.processType}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {new Date(log.dateProcessed).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-sm font-medium">{log.processedQty}</td>
                    <td className="p-3 text-sm font-medium">{log.assemblyPart.quantity}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {getQCStatusBadge(log.qcStatus)}
                        {log.rfiProductionLogs && log.rfiProductionLogs.length > 0 && (
                          <Link href="/qc/rfi" className="text-xs font-mono text-blue-600 hover:underline">
                            {log.rfiProductionLogs[0].rfiRequest.rfiNumber || 'N/A'}
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm">{log.processingTeam || '-'}</td>
                    <td className="p-3 text-sm">{log.processingLocation || '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/production/assembly-parts/${log.assemblyPart.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        {log.qcStatus === 'Rejected' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRectify(log)}
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          >
                            Rectify & Resubmit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* RFI Creation Dialog */}
        <Dialog open={showRFIDialog} onOpenChange={setShowRFIDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request QC Inspection</DialogTitle>
              <DialogDescription>
                Create RFI (Request for Inspection) for {selectedLogs.size} selected production log(s).
                Inspection type will be automatically determined based on the process type.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assignedQC">Assign to QC Inspector (Optional)</Label>
                <select
                  id="assignedQC"
                  value={assignedQCId}
                  onChange={(e) => setAssignedQCId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Auto-assign later</option>
                  {qcUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Selected Items:</p>
                <ul className="text-sm space-y-1">
                  {Array.from(selectedLogs).slice(0, 5).map((logId) => {
                    const log = logs.find(l => l.id === logId);
                    return log ? (
                      <li key={logId} className="flex items-center gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{log.assemblyPart.partDesignation}</span>
                        <span className="text-muted-foreground">({log.processType})</span>
                      </li>
                    ) : null;
                  })}
                  {selectedLogs.size > 5 && (
                    <li className="text-muted-foreground">
                      ... and {selectedLogs.size - 5} more
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRFIDialog(false)}
                disabled={creatingRFI}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateRFI} disabled={creatingRFI}>
                {creatingRFI ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating RFI...
                  </>
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Create RFI
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rectification Dialog */}
        <Dialog open={showRectifyDialog} onOpenChange={setShowRectifyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rectify & Resubmit for QC</DialogTitle>
              <DialogDescription>
                {rectifyingLog && (
                  <>
                    Part: {rectifyingLog.assemblyPart.partDesignation} •{' '}
                    {rectifyingLog.processType}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">
                  ⚠️ This item was rejected by QC
                </p>
                <p className="text-sm text-red-700">
                  Please describe what corrective actions were taken before resubmitting.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rectifyRemarks">Rectification Details *</Label>
                <Textarea
                  id="rectifyRemarks"
                  value={rectifyRemarks}
                  onChange={(e) => setRectifyRemarks(e.target.value)}
                  rows={4}
                  placeholder="Describe what was fixed/corrected..."
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRectifyDialog(false)}
                disabled={creatingRFI}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitRectification} 
                disabled={creatingRFI || !rectifyRemarks.trim()}
              >
                {creatingRFI ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resubmitting...
                  </>
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Resubmit for QC
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Production Logs</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedLogs.size} production log(s)? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Modal - Now supports multi-project import without requiring project selection */}
        <ImportModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            fetchLogs();
          }}
          title="Import Production Logs"
          fields={[
            { key: 'partDesignation', label: 'Part Designation', required: true },
            { key: 'processType', label: 'Process Type' },
            { key: 'dateProcessed', label: 'Date Processed' },
            { key: 'processedQty', label: 'Processed Qty' },
            { key: 'processingTeam', label: 'Processing Team' },
            { key: 'processingLocation', label: 'Processing Location' },
          ]}
          onImport={async (data, mapping) => {
            // No project selection required - parts are matched by designation across all projects
            const res = await fetch('/api/production/logs/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data, mapping }),
            });
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.message || 'Import failed');
            }
            const result = await res.json();
            return result.results;
          }}
          sampleData="Part Designation,Process Type,Date Processed,Processed Qty,Remaining Qty,Processing Team"
        />
    </div>
  );
}
