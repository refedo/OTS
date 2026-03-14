'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Search, 
  Filter,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';

type NCR = {
  id: string;
  ncrNumber: string;
  description: string;
  correctiveAction: string | null;
  rootCause: string | null;
  deadline: string;
  closedDate: string | null;
  status: string;
  severity: string;
  project: {
    projectNumber: string;
    name: string;
  };
  building: {
    designation: string;
    name: string;
  } | null;
  productionLog: {
    processType: string;
    assemblyPart: {
      partDesignation: string;
      name: string;
      assemblyMark: string;
    };
  };
  rfiRequest: {
    id: string;
    inspectionType: string;
    status: string;
  } | null;
  raisedBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  closedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export default function NCRListPage() {
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [filteredNcrs, setFilteredNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  
  const [selectedNCR, setSelectedNCR] = useState<NCR | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    correctiveAction: '',
    rootCause: '',
    preventiveAction: '',
  });

  useEffect(() => {
    fetchNCRs();
  }, []);

  useEffect(() => {
    filterNCRs();
  }, [ncrs, searchQuery, statusFilter, severityFilter]);

  const fetchNCRs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/qc/ncr');
      if (response.ok) {
        const data = await response.json();
        setNcrs(data);
      }
    } catch (error) {
      console.error('Error fetching NCRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNCRs = () => {
    let filtered = [...ncrs];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ncr) =>
          ncr.ncrNumber.toLowerCase().includes(query) ||
          ncr.productionLog.assemblyPart.partDesignation.toLowerCase().includes(query) ||
          ncr.project.projectNumber.toLowerCase().includes(query) ||
          ncr.description.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((ncr) => ncr.status === statusFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter((ncr) => ncr.severity === severityFilter);
    }

    setFilteredNcrs(filtered);
  };

  const handleUpdateNCR = (ncr: NCR) => {
    setSelectedNCR(ncr);
    setUpdateForm({
      status: ncr.status,
      correctiveAction: ncr.correctiveAction || '',
      rootCause: ncr.rootCause || '',
      preventiveAction: '',
    });
    setShowUpdateDialog(true);
  };

  const submitUpdate = async () => {
    if (!selectedNCR) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/qc/ncr/${selectedNCR.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm),
      });

      if (response.ok) {
        setShowUpdateDialog(false);
        fetchNCRs();
      }
    } catch (error) {
      console.error('Error updating NCR:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">Open</span>;
      case 'In Progress':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">In Progress</span>;
      case 'Closed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Closed</span>;
      case 'Overdue':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Overdue</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-200 text-red-800 font-semibold">Critical</span>;
      case 'High':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-200 text-orange-800 font-semibold">High</span>;
      case 'Medium':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-200 text-yellow-800">Medium</span>;
      case 'Low':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-200 text-blue-800">Low</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{severity}</span>;
    }
  };

  const isOverdue = (deadline: string, status: string) => {
    if (status === 'Closed') return false;
    return new Date(deadline) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <AlertTriangle className="h-8 w-8" />
              NCR List
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage Non-Conformance Reports
            </p>
          </div>
          <Link href="/qc/ncr/new">
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="mr-2 h-4 w-4" />
              New NCR
            </Button>
          </Link>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by NCR number, part, or project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <select
                  id="severity"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="all">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NCR Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading NCRs...</p>
              </div>
            ) : filteredNcrs.length === 0 ? (
              <div className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No NCRs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">NCR Number</th>
                      <th className="px-4 py-3 text-left font-semibold">Part Designation</th>
                      <th className="px-4 py-3 text-left font-semibold">Project</th>
                      <th className="px-4 py-3 text-left font-semibold">Description</th>
                      <th className="px-4 py-3 text-left font-semibold">Severity</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Deadline</th>
                      <th className="px-4 py-3 text-left font-semibold">Raised By</th>
                      <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNcrs.map((ncr, index) => (
                      <tr
                        key={ncr.id}
                        className={`border-b hover:bg-muted/30 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                        } ${isOverdue(ncr.deadline, ncr.status) ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium">{ncr.ncrNumber}</td>
                        <td className="px-4 py-3">
                          {ncr.productionLog.assemblyPart.partDesignation}
                          <p className="text-xs text-muted-foreground">
                            {ncr.productionLog.assemblyPart.name}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {ncr.project.projectNumber}
                          {ncr.building && (
                            <p className="text-xs text-muted-foreground">
                              {ncr.building.designation}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="truncate">{ncr.description}</p>
                        </td>
                        <td className="px-4 py-3">{getSeverityBadge(ncr.severity)}</td>
                        <td className="px-4 py-3">{getStatusBadge(ncr.status)}</td>
                        <td className="px-4 py-3">
                          <span className={isOverdue(ncr.deadline, ncr.status) ? 'text-red-600 font-semibold' : ''}>
                            {new Date(ncr.deadline).toLocaleDateString()}
                          </span>
                          {isOverdue(ncr.deadline, ncr.status) && (
                            <p className="text-xs text-red-600">Overdue!</p>
                          )}
                        </td>
                        <td className="px-4 py-3">{ncr.raisedBy.name}</td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateNCR(ncr)}
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Update NCR</DialogTitle>
              <DialogDescription>
                {selectedNCR && (
                  <>
                    {selectedNCR.ncrNumber} •{' '}
                    {selectedNCR.productionLog.assemblyPart.partDesignation}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedNCR && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Original Description:</p>
                  <p className="text-sm">{selectedNCR.description}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rootCause">Root Cause Analysis</Label>
                <Textarea
                  id="rootCause"
                  value={updateForm.rootCause}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, rootCause: e.target.value })
                  }
                  rows={3}
                  placeholder="Identify the root cause of the non-conformance..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="correctiveAction">Corrective Action</Label>
                <Textarea
                  id="correctiveAction"
                  value={updateForm.correctiveAction}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, correctiveAction: e.target.value })
                  }
                  rows={3}
                  placeholder="Describe the corrective action taken..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preventiveAction">Preventive Action</Label>
                <Textarea
                  id="preventiveAction"
                  value={updateForm.preventiveAction}
                  onChange={(e) =>
                    setUpdateForm({ ...updateForm, preventiveAction: e.target.value })
                  }
                  rows={3}
                  placeholder="Describe preventive measures to avoid recurrence..."
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
                  'Update NCR'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
