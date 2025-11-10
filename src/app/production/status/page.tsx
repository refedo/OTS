'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Loader2, Download, Search } from 'lucide-react';

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

type PartStatus = {
  id: string;
  partDesignation: string;
  assemblyMark: string;
  partMark: string;
  name: string;
  profile: string | null;
  quantity: number;
  processedQty: number;
  weight: number | null;
  processes: {
    [key: string]: {
      processed: number;
      percentage: number;
    };
  };
};

const PROCESS_COLUMNS = [
  { key: 'Preparation', label: 'Laser Cutting', color: 'bg-blue-500' },
  { key: 'Fit-up', label: 'Fit-up', color: 'bg-purple-500' },
  { key: 'Welding', label: 'Welding', color: 'bg-orange-500' },
  { key: 'Visualization', label: 'Visual Progress', color: 'bg-yellow-500' },
  { key: 'Sandblasting', label: 'Sandblasting', color: 'bg-gray-500' },
  { key: 'Painting', label: 'Painting', color: 'bg-pink-500' },
  { key: 'Galvanization', label: 'Galvanization', color: 'bg-cyan-500' },
];

export default function ProductionStatusPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<PartStatus[]>([]);
  const [projectData, setProjectData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
    // Fetch initial report with all projects and buildings
    fetchStatusReport();
  }, []);

  useEffect(() => {
    if (selectedProject && selectedProject !== 'all') {
      fetchBuildings(selectedProject);
    } else {
      setBuildings([]);
      if (selectedProject === 'all') {
        setSelectedBuilding('all');
      } else {
        setSelectedBuilding('');
      }
    }
  }, [selectedProject]);

  useEffect(() => {
    // Only fetch if both values are set
    if (selectedProject && selectedBuilding) {
      fetchStatusReport();
    }
  }, [selectedProject, selectedBuilding]);

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

  const fetchStatusReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/production/status?projectId=${selectedProject}&buildingId=${selectedBuilding}`
      );
      if (response.ok) {
        const data = await response.json();
        setStatusData(data.parts || []);
        setProjectData(data.project || null);
      } else {
        console.error('Failed to fetch status report:', response.statusText);
        setStatusData([]);
        setProjectData(null);
      }
    } catch (error) {
      console.error('Error fetching status report:', error);
      setStatusData([]);
      setProjectData(null);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage === 0) return 'bg-red-500';
    if (percentage === 100) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const exportToExcel = () => {
    // This will be implemented with a library like xlsx
    alert('Export to Excel functionality - to be implemented');
  };

  // Filter data based on search query
  const filteredData = statusData.filter((part) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      part.partDesignation.toLowerCase().includes(query) ||
      part.assemblyMark.toLowerCase().includes(query) ||
      part.partMark.toLowerCase().includes(query) ||
      part.name.toLowerCase().includes(query) ||
      (part.profile && part.profile.toLowerCase().includes(query))
    );
  });

  const totalQuantity = filteredData.reduce((sum, part) => sum + part.quantity, 0);
  const totalWeight = filteredData.reduce((sum, part) => sum + (part.weight || 0), 0);

  return (
    <div className="space-y-6">
      <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8" />
            Production Status Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Track production progress across all processes
          </p>
        </div>

      {/* Filters */}
      <Card>
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project Number *</Label>
                <select
                  id="project"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Project</option>
                  <option value="all">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="building">Building *</Label>
                <select
                  id="building"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  disabled={!selectedProject}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Building</option>
                  {selectedProject !== 'all' && <option value="all">All Buildings</option>}
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.designation} - {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="search">Search Parts</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by part designation, mark, name, or profile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={exportToExcel}
                disabled={statusData.length === 0}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="ghost"
                  size="sm"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </CardContent>
      </Card>

      {/* Status Report */}
      {loading ? (
        <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading production status...</p>
              </div>
            </CardContent>
        </Card>
      ) : statusData.length === 0 ? (
        <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {selectedProject && selectedBuilding
                    ? 'No parts found for the selected project and building'
                    : 'Please select a project and building to view the production status'}
                </p>
              </div>
            </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          {projectData && (
            <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Project</p>
                      <p className="text-lg font-semibold">{projectData.projectNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Building</p>
                      <p className="text-lg font-semibold">{projectData.building}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                      <p className="text-lg font-semibold">
                        {filteredData.length}
                        {searchQuery && statusData.length !== filteredData.length && (
                          <span className="text-sm text-muted-foreground ml-1">
                            / {statusData.length}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Quantity</p>
                      <p className="text-lg font-semibold">{totalQuantity} units</p>
                    </div>
                  </div>
                </CardContent>
            </Card>
          )}

          {/* Status Table */}
          <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold border-r">Part Designation</th>
                        <th className="px-3 py-3 text-left font-semibold border-r">Bundle</th>
                        <th className="px-3 py-3 text-left font-semibold border-r">Building Name</th>
                        <th className="px-3 py-3 text-left font-semibold border-r">Assembly Part</th>
                        <th className="px-3 py-3 text-left font-semibold border-r">Profile</th>
                        <th className="px-3 py-3 text-center font-semibold border-r">Qty</th>
                        <th className="px-3 py-3 text-center font-semibold border-r">Processed Qty</th>
                        <th className="px-3 py-3 text-center font-semibold border-r">Weight</th>
                        {PROCESS_COLUMNS.map((process) => (
                          <th
                            key={process.key}
                            className="px-3 py-3 text-center font-semibold border-r min-w-[120px]"
                          >
                            {process.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((part, index) => (
                        <tr
                          key={part.id}
                          className={`border-b hover:bg-muted/30 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                          }`}
                        >
                          <td className="px-3 py-2 font-medium border-r">{part.partDesignation}</td>
                          <td className="px-3 py-2 border-r">{part.assemblyMark}</td>
                          <td className="px-3 py-2 border-r">{projectData?.building || '-'}</td>
                          <td className="px-3 py-2 border-r">{part.name}</td>
                          <td className="px-3 py-2 border-r">{part.profile || '-'}</td>
                          <td className="px-3 py-2 text-center border-r font-semibold">{part.quantity}</td>
                          <td className="px-3 py-2 text-center border-r">{part.processedQty}</td>
                          <td className="px-3 py-2 text-center border-r">
                            {part.weight != null && typeof part.weight === 'number' ? part.weight.toFixed(2) : '-'}
                          </td>
                          {PROCESS_COLUMNS.map((process) => {
                            const processData = part.processes[process.key] || { processed: 0, percentage: 0 };
                            return (
                              <td key={process.key} className="px-2 py-2 border-r">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden relative">
                                    <div
                                      className={`h-full ${getProgressColor(processData.percentage)} transition-all duration-300`}
                                      style={{ width: `${processData.percentage}%` }}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                                      {processData.percentage}%
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{processData.processed} / {part.quantity}</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
