'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { 
  FileCheck, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type RFI = {
  id: string;
  rfiNumber: string | null;
  processType: string;
  inspectionType: string;
  requestDate: string;
  inspectionDate: string | null;
  status: string;
  qcComments: string | null;
  project: {
    id: string;
    projectNumber: string;
    name: string;
  };
  building: {
    id: string;
    designation: string;
    name: string;
  } | null;
  productionLogs: Array<{
    productionLog: {
      id: string;
      processType: string;
      assemblyPart: {
        partDesignation: string;
        name: string;
        assemblyMark: string;
        quantity: number;
      };
    };
  }>;
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  ncrReports: Array<{
    id: string;
    ncrNumber: string;
    status: string;
  }>;
};

// Individual RFI item (one row per production log)
type RFIItem = {
  rfiId: string;
  rfiNumber: string | null;
  productionLogId: string;
  partDesignation: string;
  partName: string;
  assemblyMark: string;
  quantity: number;
  processType: string;
  inspectionType: string;
  requestDate: string;
  inspectionDate: string | null;
  status: string;
  qcComments: string | null;
  project: {
    projectNumber: string;
    name: string;
  };
  building: {
    designation: string;
    name: string;
  } | null;
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  ncrReports: Array<{
    id: string;
    ncrNumber: string;
    status: string;
  }>;
};

export default function RFIListPage() {
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [rfiItems, setRfiItems] = useState<RFIItem[]>([]); // Expanded items
  const [filteredRfiItems, setFilteredRfiItems] = useState<RFIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inspectionTypeFilter, setInspectionTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedRFIs, setSelectedRFIs] = useState<Set<string>>(new Set());
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    qcComments: '',
    inspectionDate: '',
    // Inspection-specific fields
    dimensionalLength: '',
    dimensionalWidth: '',
    dimensionalHeight: '',
    dimensionalRemarks: '',
    visualRemarks: '',
    weldingRemarks: '',
    coatingThickness: '',
    coatingRemarks: '',
    paintThickness: '',
    paintRemarks: '',
    // Rejection handling
    rejectionType: 'minor', // 'minor' or 'major'
    ncrRequired: false,
  });
  const [bulkComments, setBulkComments] = useState('');
  const [updating, setUpdating] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRFIs();
  }, []);

  useEffect(() => {
    // Expand RFIs into individual items
    const expanded = expandRFIsToItems(rfis);
    setRfiItems(expanded);
  }, [rfis]);

  useEffect(() => {
    filterRFIs();
  }, [rfiItems, searchQuery, statusFilter, inspectionTypeFilter, projectFilter, buildingFilter]);

  // Expand RFIs into individual items (one row per production log)
  const expandRFIsToItems = (rfis: RFI[]): RFIItem[] => {
    const items: RFIItem[] = [];
    
    rfis.forEach(rfi => {
      if (rfi.productionLogs && rfi.productionLogs.length > 0) {
        rfi.productionLogs.forEach(pl => {
          items.push({
            rfiId: rfi.id,
            rfiNumber: rfi.rfiNumber,
            productionLogId: pl.productionLog.id,
            partDesignation: pl.productionLog.assemblyPart.partDesignation,
            partName: pl.productionLog.assemblyPart.name,
            assemblyMark: pl.productionLog.assemblyPart.assemblyMark,
            quantity: pl.productionLog.assemblyPart.quantity,
            processType: rfi.processType,
            inspectionType: rfi.inspectionType,
            requestDate: rfi.requestDate,
            inspectionDate: rfi.inspectionDate,
            status: rfi.status,
            qcComments: rfi.qcComments,
            project: rfi.project,
            building: rfi.building,
            requestedBy: rfi.requestedBy,
            assignedTo: rfi.assignedTo,
            ncrReports: rfi.ncrReports,
          });
        });
      }
    });
    
    return items;
  };

  const fetchRFIs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qc/rfi');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched RFIs:', data);
        setRfis(data);
      } else {
        console.error('Failed to fetch RFIs:', response.status, response.statusText);
        const errorData = await response.json().catch(() => null);
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching RFIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRFIs = () => {
    let filtered = [...rfiItems];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.partDesignation.toLowerCase().includes(query) ||
          item.partName.toLowerCase().includes(query) ||
          item.project.projectNumber.toLowerCase().includes(query) ||
          item.inspectionType.toLowerCase().includes(query) ||
          (item.processType && item.processType.toLowerCase().includes(query)) ||
          (item.rfiNumber && item.rfiNumber.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (inspectionTypeFilter !== 'all') {
      filtered = filtered.filter((item) => item.inspectionType === inspectionTypeFilter);
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter((item) => item.project.projectNumber === projectFilter);
    }

    if (buildingFilter !== 'all') {
      filtered = filtered.filter((item) => item.building?.designation === buildingFilter);
    }

    setFilteredRfiItems(filtered);
  };

  const handleUpdateRFI = (item: RFIItem) => {
    // Find the full RFI from the original rfis array
    const rfi = rfis.find(r => r.id === item.rfiId);
    if (rfi) {
      setSelectedRFI(rfi);
      setUpdateForm({
        status: rfi.status,
        qcComments: rfi.qcComments || '',
        inspectionDate: rfi.inspectionDate || new Date().toISOString().split('T')[0],
        // Reset inspection-specific fields
        dimensionalLength: '',
        dimensionalWidth: '',
        dimensionalHeight: '',
        dimensionalRemarks: '',
        visualRemarks: '',
        weldingRemarks: '',
        coatingThickness: '',
        coatingRemarks: '',
        paintThickness: '',
        paintRemarks: '',
        rejectionType: 'minor',
        ncrRequired: false,
      });
      setShowUpdateDialog(true);
    }
  };

  const handleSelectRFI = (rfiId: string) => {
    const newSelected = new Set(selectedRFIs);
    if (newSelected.has(rfiId)) {
      newSelected.delete(rfiId);
    } else {
      newSelected.add(rfiId);
    }
    setSelectedRFIs(newSelected);
  };

  const handleSelectAll = () => {
    // Get unique RFI IDs from filtered items
    const uniqueRfiIds = Array.from(new Set(filteredRfiItems.map(item => item.rfiId)));
    if (selectedRFIs.size === uniqueRfiIds.length) {
      setSelectedRFIs(new Set());
    } else {
      setSelectedRFIs(new Set(uniqueRfiIds));
    }
  };

  const handleBulkApprove = () => {
    if (selectedRFIs.size === 0) return;
    setBulkComments('');
    setShowBulkApproveDialog(true);
  };

  const submitBulkApprove = async () => {
    try {
      setBulkApproving(true);
      
      const updatePromises = Array.from(selectedRFIs).map(rfiId =>
        fetch(`/api/qc/rfi/${rfiId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'QC Checked',
            qcComments: bulkComments,
            inspectionDate: new Date().toISOString().split('T')[0],
          }),
        })
      );

      await Promise.all(updatePromises);
      
      setShowBulkApproveDialog(false);
      setSelectedRFIs(new Set());
      setBulkComments('');
      fetchRFIs();
      alert(`${selectedRFIs.size} RFI(s) approved successfully!`);
    } catch (error) {
      console.error('Error bulk approving RFIs:', error);
      alert('Failed to approve some RFIs');
    } finally {
      setBulkApproving(false);
    }
  };

  const submitUpdate = async () => {
    if (!selectedRFI) return;

    try {
      setUpdating(true);
      
      // Build comprehensive QC comments with inspection data
      let fullComments = updateForm.qcComments;
      
      // Add inspection-specific data to comments
      if (selectedRFI.inspectionType === 'Dimension Check' && updateForm.dimensionalRemarks) {
        fullComments += `\n\nDIMENSIONAL DATA:\nLength: ${updateForm.dimensionalLength}mm, Width: ${updateForm.dimensionalWidth}mm, Height: ${updateForm.dimensionalHeight}mm\nRemarks: ${updateForm.dimensionalRemarks}`;
      }
      if (selectedRFI.inspectionType === 'Visual Check' && updateForm.visualRemarks) {
        fullComments += `\n\nVISUAL INSPECTION:\n${updateForm.visualRemarks}`;
      }
      if (selectedRFI.inspectionType === 'NDT (Non-Destructive Testing)' && updateForm.weldingRemarks) {
        fullComments += `\n\nWELDING/NDT INSPECTION:\n${updateForm.weldingRemarks}`;
      }
      if (selectedRFI.inspectionType === 'Coating Thickness Check' && updateForm.coatingThickness) {
        fullComments += `\n\nCOATING DATA:\nThickness: ${updateForm.coatingThickness}µm\nRemarks: ${updateForm.coatingRemarks}`;
      }
      if (selectedRFI.inspectionType === 'Paint Thickness & Quality Check' && updateForm.paintThickness) {
        fullComments += `\n\nPAINT DATA:\nThickness: ${updateForm.paintThickness}µm\nRemarks: ${updateForm.paintRemarks}`;
      }
      if (selectedRFI.inspectionType === 'Surface Preparation Check' && updateForm.visualRemarks) {
        fullComments += `\n\nSURFACE PREPARATION:\n${updateForm.visualRemarks}`;
      }
      
      // Update RFI
      const response = await fetch(`/api/qc/rfi/${selectedRFI.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updateForm,
          qcComments: fullComments,
        }),
      });

      if (response.ok) {
        // If major rejection, create NCR
        if (updateForm.status === 'Rejected' && updateForm.rejectionType === 'major') {
          // Create NCR for each production log in the RFI
          const ncrPromises = selectedRFI.productionLogs.map(async (pl) => {
            const ncrDescription = `MAJOR REJECTION - ${selectedRFI.inspectionType}\n\n` +
              `RFI: ${selectedRFI.rfiNumber}\n` +
              `Part: ${pl.productionLog.assemblyPart.partDesignation} - ${pl.productionLog.assemblyPart.name}\n` +
              `Process: ${selectedRFI.processType}\n\n` +
              `INSPECTION FINDINGS:\n${fullComments}`;

            return fetch('/api/qc/ncr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: selectedRFI.project.id,
                buildingId: selectedRFI.building?.id || null,
                productionLogId: pl.productionLog.id,
                rfiRequestId: selectedRFI.id,
                description: ncrDescription,
                severity: 'High',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
              }),
            });
          });

          const ncrResults = await Promise.all(ncrPromises);
          const ncrData = await Promise.all(ncrResults.map(r => r.json()));
          
          setShowUpdateDialog(false);
          
          // Show success message with NCR numbers
          const ncrNumbers = ncrData.map(ncr => ncr.ncrNumber).join(', ');
          alert(`RFI rejected and ${ncrData.length} NCR(s) created:\n${ncrNumbers}\n\nRedirecting to NCR page...`);
          
          // Redirect to NCR page
          window.location.href = '/qc/ncr';
        } else {
          setShowUpdateDialog(false);
          fetchRFIs();
          alert('RFI updated successfully!');
        }
      } else {
        const error = await response.json();
        alert(`Failed to update RFI: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating RFI:', error);
      alert('Failed to update RFI');
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedRFIs.size === 0) return;
    setShowDeleteDialog(true);
  };

  const submitBulkDelete = async () => {
    try {
      setDeleting(true);
      const deletePromises = Array.from(selectedRFIs).map(rfiId =>
        fetch(`/api/qc/rfi/${rfiId}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        alert(`Successfully deleted ${successCount} RFI(s)${failCount > 0 ? `, ${failCount} failed` : ''}`);
        setSelectedRFIs(new Set());
        fetchRFIs();
      } else {
        alert('Failed to delete RFIs');
      }
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting RFIs:', error);
      alert('Failed to delete RFIs');
    } finally {
      setDeleting(false);
    }
  };

  const isRectification = (rfi: RFI) => {
    return rfi.qcComments?.startsWith('RECTIFICATION:') || false;
  };

  const getRectificationRemarks = (rfi: RFI) => {
    if (!rfi.qcComments?.startsWith('RECTIFICATION:')) return null;
    return rfi.qcComments.replace('RECTIFICATION:', '').trim();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Waiting for Inspection':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'QC Checked':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Approved</span>;
      case 'Rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const uniqueInspectionTypes = Array.from(new Set(rfiItems.map((item) => item.inspectionType)));
  const uniqueProjects = Array.from(new Set(rfiItems.map((item) => item.project.projectNumber)));
  const uniqueBuildings = Array.from(new Set(rfiItems.map((item) => item.building?.designation).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileCheck className="h-8 w-8" />
              RFI List
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage Requests for Inspection
              {selectedRFIs.size > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  ({selectedRFIs.size} selected)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedRFIs.size > 0 ? (
              <>
                <Button onClick={handleBulkApprove} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Selected ({selectedRFIs.size})
                </Button>
                <Button onClick={handleBulkDelete} variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedRFIs.size})
                </Button>
              </>
            ) : (
              <Link href="/qc/rfi/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <FileCheck className="mr-2 h-4 w-4" />
                  New RFI
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by RFI number, part, project, or inspection type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <select
                  id="project"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="all">All Projects</option>
                  {uniqueProjects.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <select
                  id="building"
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="all">All Buildings</option>
                  {uniqueBuildings.map((building) => (
                    <option key={building} value={building}>
                      {building}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="all">All Statuses</option>
                  <option value="Waiting for Inspection">Pending</option>
                  <option value="QC Checked">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspectionType">Inspection Type</Label>
                <select
                  id="inspectionType"
                  value={inspectionTypeFilter}
                  onChange={(e) => setInspectionTypeFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="all">All Types</option>
                  {uniqueInspectionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RFI Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading RFIs...</p>
              </div>
            ) : filteredRfiItems.length === 0 ? (
              <div className="py-12 text-center">
                <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No RFIs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        <input
                          type="checkbox"
                          checked={selectedRFIs.size === filteredRfiItems.length && filteredRfiItems.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">RFI Number</th>
                      <th className="px-4 py-3 text-left font-semibold">Part Designation</th>
                      <th className="px-4 py-3 text-center font-semibold">Qty</th>
                      <th className="px-4 py-3 text-left font-semibold">Project</th>
                      <th className="px-4 py-3 text-left font-semibold">Process</th>
                      <th className="px-4 py-3 text-left font-semibold">Inspection Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Request Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Requested By</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">NCRs</th>
                      <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRfiItems.map((item, index) => (
                      <tr
                        key={`${item.rfiId}-${item.productionLogId}`}
                        className={`border-b hover:bg-muted/30 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                        } ${item.qcComments?.startsWith('RECTIFICATION:') ? 'border-l-4 border-l-orange-500' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRFIs.has(item.rfiId)}
                            onChange={() => handleSelectRFI(item.rfiId)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-primary">
                            {item.rfiNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {item.qcComments?.startsWith('RECTIFICATION:') && (
                              <span title="Resubmitted after rectification">
                                <RefreshCw className="h-4 w-4 text-orange-600" />
                              </span>
                            )}
                            <div>
                              {item.partDesignation}
                              <p className="text-xs text-muted-foreground">
                                {item.partName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3">
                          {item.project.projectNumber}
                          {item.building && (
                            <p className="text-xs text-muted-foreground">
                              {item.building.designation}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{item.processType || '-'}</span>
                        </td>
                        <td className="px-4 py-3">{item.inspectionType}</td>
                        <td className="px-4 py-3">
                          {new Date(item.requestDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">{item.requestedBy.name}</td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3">
                          {item.ncrReports.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {item.ncrReports.map((ncr) => (
                                <Link
                                  key={ncr.id}
                                  href="/qc/ncr"
                                  className="text-red-600 font-medium hover:text-red-800 hover:underline text-sm"
                                >
                                  {ncr.ncrNumber}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateRFI(item)}
                          >
                            Update
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update Dialog */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update RFI - {selectedRFI?.rfiNumber}</DialogTitle>
              <DialogDescription>
                {selectedRFI && (
                  <>
                    {selectedRFI.productionLogs.length} Item(s) • {selectedRFI.inspectionType} • {selectedRFI.project.projectNumber}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Rectification Notice */}
              {selectedRFI && isRectification(selectedRFI) && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Rectified & Resubmitted Item
                  </p>
                  <p className="text-sm text-orange-700">
                    <strong>Rectification Details:</strong> {getRectificationRemarks(selectedRFI)}
                  </p>
                </div>
              )}

              {/* Items List */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold mb-2">Items in this RFI:</p>
                <div className="space-y-1">
                  {selectedRFI?.productionLogs.map((pl, idx) => (
                    <div key={idx} className="text-sm">
                      • {pl.productionLog.assemblyPart.partDesignation} - {pl.productionLog.assemblyPart.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-2">
                <Label htmlFor="status">Inspection Result *</Label>
                <select
                  id="status"
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="Waiting for Inspection">Waiting for Inspection</option>
                  <option value="QC Checked">✓ Approved</option>
                  <option value="Rejected">✗ Rejected</option>
                </select>
              </div>

              {/* Rejection Type (only show if Rejected) */}
              {updateForm.status === 'Rejected' && (
                <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rejectionType">Rejection Type *</Label>
                    <select
                      id="rejectionType"
                      value={updateForm.rejectionType}
                      onChange={(e) => {
                        const isMajor = e.target.value === 'major';
                        setUpdateForm({ 
                          ...updateForm, 
                          rejectionType: e.target.value,
                          ncrRequired: isMajor 
                        });
                      }}
                      className="w-full h-10 px-3 rounded-md border bg-background"
                    >
                      <option value="minor">Minor - Rectification Required</option>
                      <option value="major">Major - NCR Required</option>
                    </select>
                  </div>

                  {updateForm.rejectionType === 'minor' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-300 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Minor Rejection:</strong> Item can be rectified and resubmitted for inspection.
                      </p>
                    </div>
                  )}

                  {updateForm.rejectionType === 'major' && (
                    <div className="p-3 bg-red-100 border border-red-400 rounded">
                      <p className="text-sm text-red-800 font-semibold">
                        <strong>Major Rejection:</strong> A Non-Conformance Report (NCR) will be created automatically.
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        This indicates a critical quality issue requiring formal investigation and corrective action.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Inspection-Specific Fields */}
              {selectedRFI && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-sm">Inspection Details - {selectedRFI.inspectionType}</h3>

                  {/* Dimension Check Fields */}
                  {selectedRFI.inspectionType === 'Dimension Check' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dimensionalLength">Length (mm)</Label>
                        <Input
                          id="dimensionalLength"
                          type="number"
                          step="0.1"
                          value={updateForm.dimensionalLength}
                          onChange={(e) => setUpdateForm({ ...updateForm, dimensionalLength: e.target.value })}
                          placeholder="e.g., 1500.5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dimensionalWidth">Width (mm)</Label>
                        <Input
                          id="dimensionalWidth"
                          type="number"
                          step="0.1"
                          value={updateForm.dimensionalWidth}
                          onChange={(e) => setUpdateForm({ ...updateForm, dimensionalWidth: e.target.value })}
                          placeholder="e.g., 300.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dimensionalHeight">Height (mm)</Label>
                        <Input
                          id="dimensionalHeight"
                          type="number"
                          step="0.1"
                          value={updateForm.dimensionalHeight}
                          onChange={(e) => setUpdateForm({ ...updateForm, dimensionalHeight: e.target.value })}
                          placeholder="e.g., 200.0"
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label htmlFor="dimensionalRemarks">Dimensional Remarks</Label>
                        <Textarea
                          id="dimensionalRemarks"
                          value={updateForm.dimensionalRemarks}
                          onChange={(e) => setUpdateForm({ ...updateForm, dimensionalRemarks: e.target.value })}
                          rows={3}
                          placeholder="Enter dimensional inspection remarks (tolerances, deviations, etc.)..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Visual Check Fields */}
                  {selectedRFI.inspectionType === 'Visual Check' && (
                    <div className="space-y-2">
                      <Label htmlFor="visualRemarks">Visual Inspection Remarks</Label>
                      <Textarea
                        id="visualRemarks"
                        value={updateForm.visualRemarks}
                        onChange={(e) => setUpdateForm({ ...updateForm, visualRemarks: e.target.value })}
                        rows={4}
                        placeholder="Enter visual inspection findings (surface quality, finish, appearance, defects, etc.)..."
                      />
                    </div>
                  )}

                  {/* NDT (Welding) Fields */}
                  {selectedRFI.inspectionType === 'NDT (Non-Destructive Testing)' && (
                    <div className="space-y-2">
                      <Label htmlFor="weldingRemarks">Welding/NDT Inspection Remarks</Label>
                      <Textarea
                        id="weldingRemarks"
                        value={updateForm.weldingRemarks}
                        onChange={(e) => setUpdateForm({ ...updateForm, weldingRemarks: e.target.value })}
                        rows={4}
                        placeholder="Enter welding inspection findings (weld quality, penetration, defects, test methods used, etc.)..."
                      />
                    </div>
                  )}

                  {/* Coating Thickness Check */}
                  {selectedRFI.inspectionType === 'Coating Thickness Check' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="coatingThickness">Coating Thickness (µm)</Label>
                        <Input
                          id="coatingThickness"
                          type="number"
                          step="0.1"
                          value={updateForm.coatingThickness}
                          onChange={(e) => setUpdateForm({ ...updateForm, coatingThickness: e.target.value })}
                          placeholder="e.g., 85.5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coatingRemarks">Coating Inspection Remarks</Label>
                        <Textarea
                          id="coatingRemarks"
                          value={updateForm.coatingRemarks}
                          onChange={(e) => setUpdateForm({ ...updateForm, coatingRemarks: e.target.value })}
                          rows={3}
                          placeholder="Enter coating inspection findings (uniformity, adhesion, coverage, etc.)..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Paint Thickness & Quality Check */}
                  {selectedRFI.inspectionType === 'Paint Thickness & Quality Check' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="paintThickness">Paint Thickness (µm)</Label>
                        <Input
                          id="paintThickness"
                          type="number"
                          step="0.1"
                          value={updateForm.paintThickness}
                          onChange={(e) => setUpdateForm({ ...updateForm, paintThickness: e.target.value })}
                          placeholder="e.g., 120.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paintRemarks">Paint Inspection Remarks</Label>
                        <Textarea
                          id="paintRemarks"
                          value={updateForm.paintRemarks}
                          onChange={(e) => setUpdateForm({ ...updateForm, paintRemarks: e.target.value })}
                          rows={3}
                          placeholder="Enter paint inspection findings (finish quality, color, coverage, defects, etc.)..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Surface Preparation Check */}
                  {selectedRFI.inspectionType === 'Surface Preparation Check' && (
                    <div className="space-y-2">
                      <Label htmlFor="visualRemarks">Surface Preparation Remarks</Label>
                      <Textarea
                        id="visualRemarks"
                        value={updateForm.visualRemarks}
                        onChange={(e) => setUpdateForm({ ...updateForm, visualRemarks: e.target.value })}
                        rows={4}
                        placeholder="Enter surface preparation findings (cleanliness, profile, contamination, etc.)..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* General Comments */}
              <div className="space-y-2">
                <Label htmlFor="inspectionDate">Inspection Date</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={updateForm.inspectionDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, inspectionDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qcComments">General QC Comments</Label>
                <Textarea
                  id="qcComments"
                  value={updateForm.qcComments}
                  onChange={(e) => setUpdateForm({ ...updateForm, qcComments: e.target.value })}
                  rows={3}
                  placeholder="Enter any additional general comments..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUpdateDialog(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button onClick={submitUpdate} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  updateForm.status === 'Rejected' && updateForm.rejectionType === 'major' 
                    ? 'Reject & Create NCR' 
                    : 'Update RFI'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Approve Dialog */}
        <Dialog open={showBulkApproveDialog} onOpenChange={setShowBulkApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Approve RFIs</DialogTitle>
              <DialogDescription>
                You are about to approve {selectedRFIs.size} RFI(s). This action will mark them as "QC Checked".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-1">
                  ✓ Approving {selectedRFIs.size} RFI(s)
                </p>
                <p className="text-sm text-green-700">
                  All selected items will be marked as approved and production can proceed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkComments">QC Comments (Optional)</Label>
                <Textarea
                  id="bulkComments"
                  value={bulkComments}
                  onChange={(e) => setBulkComments(e.target.value)}
                  rows={3}
                  placeholder="Add comments for all approved items..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBulkApproveDialog(false)}
                disabled={bulkApproving}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitBulkApprove} 
                disabled={bulkApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {bulkApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve {selectedRFIs.size} RFI(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete RFIs</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedRFIs.size} RFI(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-1">
                ⚠️ Warning: Permanent Deletion
              </p>
              <p className="text-sm text-red-700">
                Deleting these RFIs will also reset the QC status of linked production logs back to "Not Required".
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitBulkDelete} 
                disabled={deleting}
                variant="destructive"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {selectedRFIs.size} RFI(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
