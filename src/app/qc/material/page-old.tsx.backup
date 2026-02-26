'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Search, 
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Project = {
  id: string;
  projectNumber: string;
  name: string;
};

type MaterialInspection = {
  id: string;
  inspectionNumber: string;
  projectId: string;
  materialType: string;
  grade: string;
  specification: string;
  supplier: string | null;
  heatNumber: string | null;
  millCertNumber: string | null;
  quantity: number;
  unit: string;
  inspectionDate: string;
  result: string;
  remarks: string | null;
  project: {
    id: string;
    projectNumber: string;
    name: string;
  };
  inspector: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
};

export default function MaterialInspectionPage() {
  const [inspections, setInspections] = useState<MaterialInspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    materialType: '',
    grade: '',
    specification: '',
    supplier: '',
    heatNumber: '',
    millCertNumber: '',
    quantity: '',
    unit: 'kg',
    inspectionDate: new Date().toISOString().split('T')[0],
    result: 'Pending',
    visualInspection: '',
    dimensionalCheck: '',
    remarks: '',
  });

  useEffect(() => {
    fetchInspections();
    fetchProjects();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await fetch('/api/qc/material');
      if (response.ok) {
        const data = await response.json();
        setInspections(data);
      }
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleCreateInspection = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/qc/material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        fetchInspections();
        // Reset form
        setFormData({
          projectId: '',
          materialType: '',
          grade: '',
          specification: '',
          supplier: '',
          heatNumber: '',
          millCertNumber: '',
          quantity: '',
          unit: 'kg',
          inspectionDate: new Date().toISOString().split('T')[0],
          result: 'Pending',
          visualInspection: '',
          dimensionalCheck: '',
          remarks: '',
        });
      }
    } catch (error) {
      console.error('Error creating inspection:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      inspection.inspectionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.materialType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.specification.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = projectFilter === 'all' || inspection.projectId === projectFilter;
    const matchesResult = resultFilter === 'all' || inspection.result === resultFilter;

    return matchesSearch && matchesProject && matchesResult;
  });

  const stats = {
    total: inspections.length,
    accepted: inspections.filter(i => i.result === 'Accepted').length,
    rejected: inspections.filter(i => i.result === 'Rejected').length,
    hold: inspections.filter(i => i.result === 'Hold').length,
    pending: inspections.filter(i => i.result === 'Pending').length,
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'Accepted':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Accepted</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3" /> Rejected</span>;
      case 'Hold':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3" /> Hold</span>;
      case 'Pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="h-3 w-3" /> Pending</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{result}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Material Inspection
          </h1>
          <p className="text-muted-foreground mt-1">
            Incoming material quality control and verification
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Inspection
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Inspections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.hold}</div>
            <p className="text-xs text-muted-foreground">On Hold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inspections..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectNumber}
                </option>
              ))}
            </select>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background"
            >
              <option value="all">All Results</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
              <option value="Hold">Hold</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Records ({filteredInspections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Inspection #</th>
                  <th className="text-left p-3 font-medium">Project</th>
                  <th className="text-left p-3 font-medium">Material Type</th>
                  <th className="text-left p-3 font-medium">Grade</th>
                  <th className="text-left p-3 font-medium">Specification</th>
                  <th className="text-left p-3 font-medium">Quantity</th>
                  <th className="text-left p-3 font-medium">Heat #</th>
                  <th className="text-left p-3 font-medium">Inspector</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-8 text-muted-foreground">
                      No material inspections found
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((inspection) => (
                    <tr key={inspection.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">{inspection.inspectionNumber}</td>
                      <td className="p-3 text-sm">{inspection.project.projectNumber}</td>
                      <td className="p-3 text-sm">{inspection.materialType}</td>
                      <td className="p-3 text-sm font-medium">{inspection.grade}</td>
                      <td className="p-3 text-sm">{inspection.specification}</td>
                      <td className="p-3 text-sm">{inspection.quantity} {inspection.unit}</td>
                      <td className="p-3 text-sm font-mono">{inspection.heatNumber || '-'}</td>
                      <td className="p-3 text-sm">{inspection.inspector.name}</td>
                      <td className="p-3 text-sm">{new Date(inspection.inspectionDate).toLocaleDateString()}</td>
                      <td className="p-3">{getResultBadge(inspection.result)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Material Inspection</DialogTitle>
            <DialogDescription>
              Record incoming material inspection details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project *</Label>
                <select
                  id="projectId"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspectionDate">Inspection Date</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="materialType">Material Type *</Label>
                <Input
                  id="materialType"
                  placeholder="e.g., Plate, Section, Bolt"
                  value={formData.materialType}
                  onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade *</Label>
                <Input
                  id="grade"
                  placeholder="e.g., S355, A36"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specification">Specification *</Label>
              <Input
                id="specification"
                placeholder="e.g., ASTM A572, EN 10025"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="kg">kg</option>
                  <option value="ton">ton</option>
                  <option value="pcs">pcs</option>
                  <option value="m">m</option>
                  <option value="m²">m²</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="result">Result</Label>
                <select
                  id="result"
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Hold">Hold</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  placeholder="Supplier name"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heatNumber">Heat Number</Label>
                <Input
                  id="heatNumber"
                  placeholder="Heat #"
                  value={formData.heatNumber}
                  onChange={(e) => setFormData({ ...formData, heatNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="millCertNumber">Mill Certificate #</Label>
                <Input
                  id="millCertNumber"
                  placeholder="Mill cert #"
                  value={formData.millCertNumber}
                  onChange={(e) => setFormData({ ...formData, millCertNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visualInspection">Visual Inspection Notes</Label>
              <Textarea
                id="visualInspection"
                rows={3}
                placeholder="Visual inspection findings..."
                value={formData.visualInspection}
                onChange={(e) => setFormData({ ...formData, visualInspection: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensionalCheck">Dimensional Check Notes</Label>
              <Textarea
                id="dimensionalCheck"
                rows={3}
                placeholder="Dimensional verification notes..."
                value={formData.dimensionalCheck}
                onChange={(e) => setFormData({ ...formData, dimensionalCheck: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">General Remarks</Label>
              <Textarea
                id="remarks"
                rows={3}
                placeholder="Additional remarks..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateInspection} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Inspection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
