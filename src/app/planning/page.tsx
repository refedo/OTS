'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Loader2,
  FileText,
  Plus,
  Trash2,
  Save,
  Upload,
  Download,
} from 'lucide-react';

type Project = {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  scopeOfWork?: string;
};

type Building = {
  id: string;
  name: string;
  designation: string;
  projectId: string;
};

type ScopeSchedule = {
  id?: string;
  scopeType: string;
  scopeLabel: string;
  startDate: string;
  endDate: string;
  projectId: string;
  buildingId: string;
  isNew?: boolean;
};

const SCOPE_OPTIONS = [
  { id: 'design', label: 'Design' },
  { id: 'shopDrawing', label: 'Shop Drawing' },
  { id: 'procurement', label: 'Procurement/Supply' },
  { id: 'fabrication', label: 'Fabrication' },
  { id: 'galvanization', label: 'Galvanization' },
  { id: 'painting', label: 'Painting' },
  { id: 'roofSheeting', label: 'Roof Sheeting' },
  { id: 'wallSheeting', label: 'Wall Sheeting' },
  { id: 'delivery', label: 'Delivery & Logistics' },
  { id: 'erection', label: 'Erection' },
];

export default function PlanningDashboardPage() {
  const [schedules, setSchedules] = useState<ScopeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch projects and schedules in parallel
      const [projectsRes, schedulesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/scope-schedules/all')
      ]);

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        const formattedSchedules = schedulesData.map((s: any) => ({
          ...s,
          startDate: s.startDate ? s.startDate.split('T')[0] : '',
          endDate: s.endDate ? s.endDate.split('T')[0] : '',
        }));
        setSchedules(formattedSchedules);
        
        // Extract unique buildings from schedules (they already include building data)
        const uniqueBuildings = schedulesData.reduce((acc: Building[], s: any) => {
          if (s.building && !acc.find(b => b.id === s.building.id)) {
            acc.push(s.building);
          }
          return acc;
        }, []);
        setAllBuildings(uniqueBuildings);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectData = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      // Fetch buildings for the selected project
      const buildingsRes = await fetch(`/api/projects/${projectId}/buildings`);
      if (buildingsRes.ok) {
        const buildingsData = await buildingsRes.json();
        setBuildings(buildingsData);
        
        // Also add these buildings to allBuildings if not already there
        setAllBuildings(prev => {
          const newBuildings = buildingsData.filter((b: Building) => 
            !prev.find(existing => existing.id === b.id)
          );
          return [...prev, ...newBuildings];
        });
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchProjectData(selectedProject);
    } else {
      // If no project selected, show all schedules
      setBuildings([]);
    }
  }, [selectedProject]);

  const filteredSchedules = schedules.filter(s => {
    // Filter by project
    if (selectedProject && s.projectId !== selectedProject) {
      return false;
    }
    
    // Filter by scope
    if (selectedScope && s.scopeType !== selectedScope) {
      return false;
    }
    
    // Filter by month (check if schedule overlaps with selected month)
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(month), 0);
      const scheduleStart = new Date(s.startDate);
      const scheduleEnd = new Date(s.endDate);
      
      // Check if schedule overlaps with selected month
      const overlaps = scheduleStart <= monthEnd && scheduleEnd >= monthStart;
      if (!overlaps) {
        return false;
      }
    }
    
    return true;
  });

  const getProjectScopes = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project?.scopeOfWork) return SCOPE_OPTIONS;
    
    // Parse scope of work text to get enabled scopes
    const scopeText = project.scopeOfWork.toLowerCase();
    return SCOPE_OPTIONS.filter(scope => 
      scopeText.includes(scope.label.toLowerCase())
    );
  };

  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const addSchedule = () => {
    if (projects.length === 0) {
      alert('No projects available. Please create a project first.');
      return;
    }
    
    // Create a new schedule with empty project/building - user will select
    const newSchedule: ScopeSchedule = {
      id: `temp-${Date.now()}`,
      projectId: '', // Empty - user must select
      buildingId: '', // Will be selected by user
      scopeType: SCOPE_OPTIONS[0].id,
      scopeLabel: SCOPE_OPTIONS[0].label,
      startDate: '',
      endDate: '',
      isNew: true,
    };
    setSchedules([...schedules, newSchedule]);
  };

  const removeSchedule = async (id: string) => {
    // If it's a new schedule (not saved yet), just remove from state
    if (!id || id.startsWith('temp-')) {
      setSchedules(schedules.filter(s => s.id !== id));
      return;
    }

    // If it's an existing schedule, delete from database
    if (confirm('Are you sure you want to delete this schedule?')) {
      try {
        const response = await fetch(`/api/scope-schedules/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSchedules(schedules.filter(s => s.id !== id));
        } else {
          alert('Failed to delete schedule');
        }
      } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Failed to delete schedule');
      }
    }
  };

  const updateSchedule = (id: string, field: keyof ScopeSchedule, value: string) => {
    setSchedules(prevSchedules => prevSchedules.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        if (field === 'scopeType') {
          const scope = SCOPE_OPTIONS.find(opt => opt.id === value);
          if (scope) updated.scopeLabel = scope.label;
        }
        return updated;
      }
      return s;
    }));
  };

  const saveSchedule = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    // Validate required fields
    if (!schedule.projectId || !schedule.buildingId || !schedule.startDate || !schedule.endDate) {
      alert('Please fill in all fields (project, building, start date, and end date) before saving');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/scope-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: schedule.projectId,
          buildingId: schedule.buildingId,
          scopeType: schedule.scopeType,
          scopeLabel: schedule.scopeLabel,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save schedule:', error);
        throw new Error('Failed to save schedule');
      }

      const savedSchedule = await response.json();
      
      // Update the schedule in state with the saved data
      setSchedules(prev => prev.map(s => 
        s.id === scheduleId 
          ? { ...savedSchedule, startDate: savedSchedule.startDate.split('T')[0], endDate: savedSchedule.endDate.split('T')[0], isNew: false }
          : s
      ));
      
      alert('Schedule saved successfully!');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/scope-schedules/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import schedules');
      }

      const result = await response.json();
      
      // Show results
      let message = `Import completed!\n\nSuccess: ${result.results.success}\nFailed: ${result.results.failed}`;
      if (result.results.errors.length > 0) {
        message += '\n\nErrors:\n' + result.results.errors.slice(0, 10).join('\n');
        if (result.results.errors.length > 10) {
          message += `\n... and ${result.results.errors.length - 10} more errors`;
        }
      }
      alert(message);

      // Refresh data
      if (result.results.success > 0) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error importing schedules:', error);
      alert(error instanceof Error ? error.message : 'Failed to import schedules');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const headers = ['Project', 'Building', 'Activity', 'Start Date', 'End Date'];
    const sampleData = [
      ['270', 'BLD1', 'Fabrication', '2025-01-15', '2025-02-15'],
      ['270', 'BLD1', 'Painting', '2025-02-16', '2025-03-01'],
      ['275', 'WH', 'Design', '2025-01-01', '2025-01-31'],
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'schedule-import-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
        <div className="container mx-auto p-6 lg:p-8 max-w-[1800px] max-lg:pt-20">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-[1800px] max-lg:pt-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8" />
            Project Planning
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage project timelines and phases
          </p>
        </div>

        {/* Filter and Actions */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Project:</Label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-64 h-10 px-3 rounded-md border bg-background"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Month:</Label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48 h-10 px-3 rounded-md border bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label>Scope:</Label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-56 h-10 px-3 rounded-md border bg-background"
              >
                <option value="">All Scopes</option>
                {SCOPE_OPTIONS.map((scope) => (
                  <option key={scope.id} value={scope.id}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </div>

            {(selectedProject || selectedMonth || selectedScope) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProject('');
                  setSelectedMonth('');
                  setSelectedScope('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            
            <Button 
              variant="outline" 
              disabled={importing}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Excel
                </>
              )}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              className="hidden"
            />
            
            <Button onClick={addSchedule} disabled={projects.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </div>
        </div>

        {/* Scope Schedules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Scope Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProject && buildings.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No buildings found for this project</p>
                <p className="text-sm text-muted-foreground mt-2">Add buildings to the project first</p>
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No scope schedules yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedProject ? 'Click "Add Schedule" to create one' : 'No schedules found across all projects'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Project</th>
                      <th className="px-4 py-3 text-left font-semibold">Building</th>
                      <th className="px-4 py-3 text-left font-semibold">Scope</th>
                      <th className="px-4 py-3 text-left font-semibold">Start Date</th>
                      <th className="px-4 py-3 text-left font-semibold">End Date</th>
                      <th className="px-4 py-3 text-center font-semibold">Duration</th>
                      <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedules.map((schedule: any, index) => {
                      const duration = schedule.startDate && schedule.endDate 
                        ? calculateDuration(schedule.startDate, schedule.endDate) 
                        : 0;
                      const building = buildings.find(b => b.id === schedule.buildingId);
                      
                      const isNewSchedule = schedule.isNew || schedule.id?.startsWith('temp-');
                      const projectBuildings = allBuildings.filter(b => b.projectId === schedule.projectId);
                      
                      return (
                        <tr
                          key={schedule.id}
                          className={`border-b ${
                            index % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                          }`}
                        >
                          <td className="px-4 py-3">
                            {isNewSchedule ? (
                              <select
                                value={schedule.projectId || ''}
                                onChange={async (e) => {
                                  const newProjectId = e.target.value;
                                  setSchedules(prev => prev.map(s => 
                                    s.id === schedule.id 
                                      ? { ...s, projectId: newProjectId, buildingId: '' }
                                      : s
                                  ));
                                  
                                  // Fetch buildings for the new project if not already loaded
                                  if (newProjectId) {
                                    const hasBuildings = allBuildings.some(b => b.projectId === newProjectId);
                                    if (!hasBuildings) {
                                      try {
                                        const res = await fetch(`/api/projects/${newProjectId}/buildings`);
                                        if (res.ok) {
                                          const buildingsData = await res.json();
                                          setAllBuildings(prev => [...prev, ...buildingsData]);
                                        }
                                      } catch (error) {
                                        console.error('Error fetching buildings:', error);
                                      }
                                    }
                                  }
                                }}
                                className="w-full h-9 px-2 rounded border bg-background text-sm"
                              >
                                <option value="">Select a project...</option>
                                {projects.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.projectNumber} - {p.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div>
                                <div className="font-medium">{schedule.project?.projectNumber}</div>
                                <div className="text-xs text-muted-foreground">{schedule.project?.name}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isNewSchedule ? (
                              <select
                                value={schedule.buildingId}
                                onChange={(e) => updateSchedule(schedule.id!, 'buildingId', e.target.value)}
                                className="w-full h-9 px-2 rounded border bg-background text-sm"
                              >
                                <option value="">Select building...</option>
                                {projectBuildings.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.designation} - {b.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div>
                                <div className="font-medium">{schedule.building?.designation}</div>
                                <div className="text-xs text-muted-foreground">{schedule.building?.name}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isNewSchedule ? (
                              <select
                                value={schedule.scopeType}
                                onChange={(e) => updateSchedule(schedule.id!, 'scopeType', e.target.value)}
                                className="w-full h-9 px-2 rounded border bg-background text-sm"
                              >
                                {getProjectScopes(schedule.projectId).map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                {schedule.scopeLabel}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isNewSchedule ? (
                              <Input
                                type="date"
                                value={schedule.startDate}
                                onChange={(e) => updateSchedule(schedule.id!, 'startDate', e.target.value)}
                                className="h-9 text-sm"
                              />
                            ) : (
                              formatDate(schedule.startDate)
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isNewSchedule ? (
                              <Input
                                type="date"
                                value={schedule.endDate}
                                onChange={(e) => updateSchedule(schedule.id!, 'endDate', e.target.value)}
                                className="h-9 text-sm"
                              />
                            ) : (
                              formatDate(schedule.endDate)
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-primary">
                              {duration > 0 ? `${duration} days` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isNewSchedule && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => saveSchedule(schedule.id!)}
                                  disabled={saving}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSchedule(schedule.id!)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
