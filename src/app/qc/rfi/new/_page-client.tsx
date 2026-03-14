'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FileCheck,
  Loader2,
  ChevronLeft,
  Check,
  Search,
} from 'lucide-react';
import Link from 'next/link';

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
  processedQty: number;
  processDate: string;
  assemblyPart: {
    id: string;
    partDesignation: string;
    name: string;
    assemblyMark: string;
    quantity: number;
  };
};

type User = {
  id: string;
  name: string;
  email: string;
};

export default function CreateRFIPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedProcess, setSelectedProcess] = useState('');
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [inspectionType, setInspectionType] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const processTypes = [
    'Fit-up',
    'Welding',
    'Visualization',
    'Painting',
    'Assembly',
    'Inspection',
  ];

  const inspectionTypesByProcess: { [key: string]: string[] } = {
    'Fit-up': ['Dimensional Inspection', 'Visual Inspection', 'Alignment Check'],
    'Welding': ['Welding Inspection', 'NDT Inspection', 'Visual Inspection', 'Dimensional Inspection'],
    'Visualization': ['Visual Inspection', 'Surface Inspection', 'Coating Inspection'],
    'Painting': ['Coating Inspection', 'Visual Inspection', 'Thickness Measurement'],
    'Assembly': ['Dimensional Inspection', 'Visual Inspection', 'Final Inspection'],
    'Inspection': ['Visual Inspection', 'Dimensional Inspection', 'Material Inspection', 'Final Inspection'],
  };

  const getInspectionTypesForProcess = (process: string) => {
    return inspectionTypesByProcess[process] || [];
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchBuildings(selectedProject);
    } else {
      setBuildings([]);
      setSelectedBuilding('');
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedBuilding && selectedProcess) {
      fetchProductionLogs(selectedBuilding, selectedProcess);
    } else {
      setProductionLogs([]);
      setSelectedLogs([]);
    }
  }, [selectedBuilding, selectedProcess]);

  useEffect(() => {
    // Reset inspection type when process changes
    if (selectedProcess) {
      setInspectionType('');
    }
  }, [selectedProcess]);

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
      const response = await fetch(`/api/projects/${projectId}/buildings`);
      if (response.ok) {
        const data = await response.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchProductionLogs = async (buildingId: string, processType: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/production/logs?buildingId=${buildingId}&process=${processType}&limit=500`);
      if (response.ok) {
        const result = await response.json();
        // API returns { data: [...], pagination: {...} }
        const logs = result.data || result.logs || (Array.isArray(result) ? result : []);
        setProductionLogs(logs);
      }
    } catch (error) {
      console.error('Error fetching production logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const toggleLog = (logId: string) => {
    setSelectedLogs(prev => {
      if (prev.includes(logId)) {
        return prev.filter(id => id !== logId);
      } else {
        return [...prev, logId];
      }
    });
  };

  const selectAll = () => {
    setSelectedLogs(filteredLogs.map(log => log.id));
  };

  const deselectAll = () => {
    setSelectedLogs([]);
  };

  const filteredLogs = productionLogs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.assemblyPart.partDesignation.toLowerCase().includes(query) ||
      log.assemblyPart.name.toLowerCase().includes(query) ||
      log.assemblyPart.assemblyMark.toLowerCase().includes(query) ||
      log.processType.toLowerCase().includes(query)
    );
  });

  const handleSubmit = async () => {
    if (!selectedProject || !selectedBuilding || selectedLogs.length === 0 || !inspectionType) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/qc/rfi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          buildingId: selectedBuilding,
          productionLogIds: selectedLogs,
          inspectionType,
          assignedToId: assignedTo || undefined,
          notes,
        }),
      });

      if (response.ok) {
        const rfi = await response.json();
        alert(`RFI ${rfi.rfiNumber || 'created'} successfully!`);
        router.push('/qc/rfi');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to create RFI'}`);
      }
    } catch (error) {
      console.error('Error creating RFI:', error);
      alert('Failed to create RFI');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 max-w-[1600px] max-lg:pt-20">
        <div className="mb-6">
          <Link href="/qc/rfi">
            <Button variant="ghost" size="sm" className="mb-4">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to RFI List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileCheck className="h-8 w-8" />
            Create RFI
          </h1>
          <p className="text-muted-foreground mt-1">
            Request for Inspection - Select production logs to inspect
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Selection */}
          <div className="xl:col-span-3 space-y-6">
            {/* Project & Building Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Project & Building</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="project">Project *</Label>
                    <select
                      id="project"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border bg-background mt-1"
                    >
                      <option value="">Select a project...</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.projectNumber} - {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="building">Building *</Label>
                    <select
                      id="building"
                      value={selectedBuilding}
                      onChange={(e) => setSelectedBuilding(e.target.value)}
                      disabled={!selectedProject}
                      className="w-full h-10 px-3 rounded-md border bg-background disabled:opacity-50 mt-1"
                    >
                      <option value="">Select a building...</option>
                      {buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.designation} - {building.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="process">Process Type *</Label>
                    <select
                      id="process"
                      value={selectedProcess}
                      onChange={(e) => setSelectedProcess(e.target.value)}
                      disabled={!selectedBuilding}
                      className="w-full h-10 px-3 rounded-md border bg-background disabled:opacity-50 mt-1"
                    >
                      <option value="">Select process...</option>
                      {processTypes.map((process) => (
                        <option key={process} value={process}>
                          {process}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Production Logs Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Select Production Logs *</span>
                  {selectedBuilding && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAll}>
                        Deselect All
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedBuilding || !selectedProcess ? (
                  <p className="text-muted-foreground text-center py-8">
                    Select a project, building, and process type first
                  </p>
                ) : loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : productionLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No production logs found for this building
                  </p>
                ) : (
                  <>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by part, name, or process..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                            selectedLogs.includes(log.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => toggleLog(log.id)}
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {log.assemblyPart.partDesignation}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.assemblyPart.name} • {log.processType} • Qty: {log.processedQty}
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedLogs.includes(log.id)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {selectedLogs.includes(log.id) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      {selectedLogs.length} of {filteredLogs.length} logs selected
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="inspectionType">Inspection Type *</Label>
                  <select
                    id="inspectionType"
                    value={inspectionType}
                    onChange={(e) => setInspectionType(e.target.value)}
                    disabled={!selectedProcess}
                    className="w-full h-10 px-3 rounded-md border bg-background disabled:opacity-50 mt-1"
                  >
                    <option value="">Select type...</option>
                    {selectedProcess && getInspectionTypesForProcess(selectedProcess).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="assignedTo">Assign To (QC Inspector)</Label>
                  <select
                    id="assignedTo"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background mt-1"
                  >
                    <option value="">Select inspector...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes or instructions..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected Logs:</span>
                    <span className="font-medium">{selectedLogs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inspection Type:</span>
                    <span className="font-medium">{inspectionType || '-'}</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-6"
                  onClick={handleSubmit}
                  disabled={submitting || !selectedProject || !selectedBuilding || selectedLogs.length === 0 || !inspectionType}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Create RFI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
