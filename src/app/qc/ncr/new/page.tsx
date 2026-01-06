'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  Loader2,
  ChevronLeft,
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

export default function CreateNCRPage() {
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
  const [selectedLog, setSelectedLog] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const severityOptions = ['Critical', 'High', 'Medium', 'Low'];

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    // Set default deadline to 7 days from now
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    setDeadline(defaultDeadline.toISOString().split('T')[0]);
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
    if (selectedBuilding) {
      fetchProductionLogs(selectedBuilding);
    } else {
      setProductionLogs([]);
      setSelectedLog('');
    }
  }, [selectedBuilding]);

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

  const fetchProductionLogs = async (buildingId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/production/logs?buildingId=${buildingId}&limit=500`);
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
    if (!selectedProject || !selectedBuilding || !selectedLog || !description || !deadline) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/qc/ncr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          buildingId: selectedBuilding,
          productionLogId: selectedLog,
          severity,
          description,
          rootCause: rootCause || undefined,
          correctiveAction: correctiveAction || undefined,
          assignedToId: assignedTo || undefined,
          deadline,
        }),
      });

      if (response.ok) {
        const ncr = await response.json();
        alert(`NCR ${ncr.ncrNumber} created successfully!`);
        router.push('/qc/ncr');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to create NCR'}`);
      }
    } catch (error) {
      console.error('Error creating NCR:', error);
      alert('Failed to create NCR');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'text-red-700 bg-red-100 border-red-300';
      case 'High': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'Medium': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'Low': return 'text-blue-700 bg-blue-100 border-blue-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 max-w-[1600px] max-lg:pt-20">
        <div className="mb-6">
          <Link href="/qc/ncr">
            <Button variant="ghost" size="sm" className="mb-4">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to NCR List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            Create NCR
          </h1>
          <p className="text-muted-foreground mt-1">
            Non-Conformance Report - Document quality issues
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>

            {/* Production Log Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Production Log *</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedBuilding ? (
                  <p className="text-muted-foreground text-center py-8">
                    Select a project and building first
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
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                            selectedLog === log.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedLog(log.id)}
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
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedLog === log.id
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {selectedLog === log.id && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* NCR Details */}
            <Card>
              <CardHeader>
                <CardTitle>NCR Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="description">Description of Non-Conformance *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the quality issue in detail..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="rootCause">Root Cause Analysis</Label>
                  <Textarea
                    id="rootCause"
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="What caused this issue?"
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="correctiveAction">Proposed Corrective Action</Label>
                  <Textarea
                    id="correctiveAction"
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    placeholder="How will this be corrected?"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Severity & Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Severity *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {severityOptions.map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`px-3 py-2 rounded border text-sm font-medium transition-colors ${
                          severity === sev
                            ? getSeverityColor(sev)
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="assignedTo">Assign To</Label>
                  <select
                    id="assignedTo"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background mt-1"
                  >
                    <option value="">Select assignee...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="deadline">Deadline *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1"
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
                    <span className="text-muted-foreground">Severity:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
                      {severity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span className="font-medium">{deadline || '-'}</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-6"
                  onClick={handleSubmit}
                  disabled={submitting || !selectedProject || !selectedBuilding || !selectedLog || !description || !deadline}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Create NCR
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
