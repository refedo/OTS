'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Flame, 
  Search, 
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
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

type Building = {
  id: string;
  designation: string;
  name: string;
};

type ProductionLog = {
  id: string;
  processType: string;
  assemblyPart: {
    partDesignation: string;
    name: string;
    assemblyMark: string;
  };
};

type WeldingInspection = {
  id: string;
  inspectionNumber: string;
  projectId: string;
  buildingId: string | null;
  productionLogId: string;
  wpsNumber: string | null;
  welderCode: string | null;
  jointType: string;
  jointLocation: string;
  weldingProcess: string;
  inspectionDate: string;
  visualResult: string;
  defectDescription: string | null;
  repairRequired: boolean;
  repairCompleted: boolean;
  result: string;
  remarks: string | null;
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
  productionLog: {
    assemblyPart: {
      partDesignation: string;
      name: string;
      assemblyMark: string;
    };
  };
  inspector: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
};

export default function WeldingInspectionPage() {
  const [inspections, setInspections] = useState<WeldingInspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    buildingId: '',
    productionLogId: '',
    wpsNumber: '',
    welderCode: '',
    jointType: '',
    jointLocation: '',
    weldingProcess: 'SMAW',
    inspectionDate: new Date().toISOString().split('T')[0],
    visualResult: 'Pending',
    defectDescription: '',
    repairRequired: false,
    repairCompleted: false,
    result: 'Pending',
    remarks: '',
  });

  useEffect(() => {
    fetchInspections();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      fetchBuildings(formData.projectId);
      fetchProductionLogs(formData.projectId);
    }
  }, [formData.projectId]);

  const fetchInspections = async () => {
    try {
      const response = await fetch('/api/qc/welding');
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

  const fetchBuildings = async (projectId: string) => {
    try {
      const response = await fetch(`/api/buildings?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchProductionLogs = async (projectId: string) => {
    try {
      const response = await fetch(`/api/production/logs?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        // Filter welding-related logs
        const weldingLogs = data.filter((log: ProductionLog) => 
          log.processType.toLowerCase().includes('weld') || 
          log.processType.toLowerCase().includes('fit')
        );
        setProductionLogs(weldingLogs);
      }
    } catch (error) {
      console.error('Error fetching production logs:', error);
    }
  };

  const handleCreateInspection = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/qc/welding', {
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
          buildingId: '',
          productionLogId: '',
          wpsNumber: '',
          welderCode: '',
          jointType: '',
          jointLocation: '',
          weldingProcess: 'SMAW',
          inspectionDate: new Date().toISOString().split('T')[0],
          visualResult: 'Pending',
          defectDescription: '',
          repairRequired: false,
          repairCompleted: false,
          result: 'Pending',
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
      inspection.jointType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.jointLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.weldingProcess.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.productionLog.assemblyPart.partDesignation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = projectFilter === 'all' || inspection.projectId === projectFilter;
    const matchesBuilding = buildingFilter === 'all' || inspection.buildingId === buildingFilter;
    const matchesResult = resultFilter === 'all' || inspection.result === resultFilter;

    return matchesSearch && matchesProject && matchesBuilding && matchesResult;
  });

  const stats = {
    total: inspections.length,
    accepted: inspections.filter(i => i.result === 'Accepted').length,
    rejected: inspections.filter(i => i.result === 'Rejected').length,
    pending: inspections.filter(i => i.result === 'Pending').length,
    repairRequired: inspections.filter(i => i.repairRequired && !i.repairCompleted).length,
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'Accepted':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" /> Accepted</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3" /> Rejected</span>;
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
            <Flame className="h-8 w-8" />
            Welding QC Inspection
          </h1>
          <p className="text-muted-foreground mt-1">
            Welding quality control and visual inspection records
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
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.repairRequired}</div>
            <p className="text-xs text-muted-foreground">Repair Required</p>
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
                  <th className="text-left p-3 font-medium">Part</th>
                  <th className="text-left p-3 font-medium">Joint Type</th>
                  <th className="text-left p-3 font-medium">Location</th>
                  <th className="text-left p-3 font-medium">Process</th>
                  <th className="text-left p-3 font-medium">WPS #</th>
                  <th className="text-left p-3 font-medium">Welder</th>
                  <th className="text-left p-3 font-medium">Visual</th>
                  <th className="text-left p-3 font-medium">Repair</th>
                  <th className="text-left p-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center p-8 text-muted-foreground">
                      No welding inspections found
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((inspection) => (
                    <tr key={inspection.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">{inspection.inspectionNumber}</td>
                      <td className="p-3 text-sm">{inspection.project.projectNumber}</td>
                      <td className="p-3 text-sm">{inspection.productionLog.assemblyPart.partDesignation}</td>
                      <td className="p-3 text-sm">{inspection.jointType}</td>
                      <td className="p-3 text-sm">{inspection.jointLocation}</td>
                      <td className="p-3 text-sm">{inspection.weldingProcess}</td>
                      <td className="p-3 text-sm font-mono">{inspection.wpsNumber || '-'}</td>
                      <td className="p-3 text-sm font-mono">{inspection.welderCode || '-'}</td>
                      <td className="p-3 text-sm">
                        {inspection.visualResult === 'Pass' ? (
                          <span className="text-green-600">✓ Pass</span>
                        ) : inspection.visualResult === 'Fail' ? (
                          <span className="text-red-600">✗ Fail</span>
                        ) : (
                          <span className="text-blue-600">Pending</span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {inspection.repairRequired ? (
                          inspection.repairCompleted ? (
                            <span className="text-green-600">✓ Done</span>
                          ) : (
                            <span className="text-orange-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Required
                            </span>
                          )
                        ) : (
                          '-'
                        )}
                      </td>
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
            <DialogTitle>New Welding Inspection</DialogTitle>
            <DialogDescription>
              Record welding quality control inspection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project *</Label>
                <select
                  id="projectId"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value, buildingId: '', productionLogId: '' })}
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
                <Label htmlFor="buildingId">Building</Label>
                <select
                  id="buildingId"
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  disabled={!formData.projectId}
                >
                  <option value="">Select Building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.designation} - {building.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productionLogId">Production Log *</Label>
              <select
                id="productionLogId"
                value={formData.productionLogId}
                onChange={(e) => setFormData({ ...formData, productionLogId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background"
                disabled={!formData.projectId}
              >
                <option value="">Select Production Log</option>
                {productionLogs.map((log) => (
                  <option key={log.id} value={log.id}>
                    {log.assemblyPart.partDesignation} - {log.assemblyPart.name} ({log.processType})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wpsNumber">WPS Number</Label>
                <Input
                  id="wpsNumber"
                  placeholder="e.g., WPS-001"
                  value={formData.wpsNumber}
                  onChange={(e) => setFormData({ ...formData, wpsNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welderCode">Welder Code</Label>
                <Input
                  id="welderCode"
                  placeholder="e.g., W-123"
                  value={formData.welderCode}
                  onChange={(e) => setFormData({ ...formData, welderCode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jointType">Joint Type *</Label>
                <select
                  id="jointType"
                  value={formData.jointType}
                  onChange={(e) => setFormData({ ...formData, jointType: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Joint Type</option>
                  <option value="Butt Joint">Butt Joint</option>
                  <option value="Fillet Weld">Fillet Weld</option>
                  <option value="Corner Joint">Corner Joint</option>
                  <option value="T-Joint">T-Joint</option>
                  <option value="Lap Joint">Lap Joint</option>
                  <option value="Edge Joint">Edge Joint</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weldingProcess">Welding Process *</Label>
                <select
                  id="weldingProcess"
                  value={formData.weldingProcess}
                  onChange={(e) => setFormData({ ...formData, weldingProcess: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="SMAW">SMAW (Stick)</option>
                  <option value="GMAW">GMAW (MIG)</option>
                  <option value="GTAW">GTAW (TIG)</option>
                  <option value="FCAW">FCAW (Flux-Cored)</option>
                  <option value="SAW">SAW (Submerged Arc)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jointLocation">Joint Location *</Label>
              <Input
                id="jointLocation"
                placeholder="e.g., Column-Beam Connection, Grid A-1"
                value={formData.jointLocation}
                onChange={(e) => setFormData({ ...formData, jointLocation: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inspectionDate">Inspection Date</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visualResult">Visual Result</Label>
                <select
                  id="visualResult"
                  value={formData.visualResult}
                  onChange={(e) => setFormData({ ...formData, visualResult: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="Pending">Pending</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defectDescription">Defect Description</Label>
              <Textarea
                id="defectDescription"
                rows={3}
                placeholder="Describe any defects found (porosity, cracks, undercut, etc.)..."
                value={formData.defectDescription}
                onChange={(e) => setFormData({ ...formData, defectDescription: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="repairRequired"
                  checked={formData.repairRequired}
                  onChange={(e) => setFormData({ ...formData, repairRequired: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="repairRequired">Repair Required</Label>
              </div>

              {formData.repairRequired && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="repairCompleted"
                    checked={formData.repairCompleted}
                    onChange={(e) => setFormData({ ...formData, repairCompleted: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="repairCompleted">Repair Completed</Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="result">Final Result</Label>
              <select
                id="result"
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
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
