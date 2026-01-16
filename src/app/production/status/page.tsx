'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Loader2, Download, Search, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  { key: 'Preparation', label: 'Laser Cutting', color: 'bg-blue-600', textColor: 'text-white' },
  { key: 'Fit-up', label: 'Fit-Up', color: 'bg-yellow-400', textColor: 'text-black' },
  { key: 'Welding', label: 'Welding', color: 'bg-red-600', textColor: 'text-white' },
  { key: 'Visualization', label: 'Visualization', color: 'bg-green-600', textColor: 'text-white' },
  { key: 'Dispatch to Sandblasting', label: 'Dispatched to sandblasting', color: 'bg-cyan-500', textColor: 'text-white' },
  { key: 'Dispatch to Galvanization', label: 'Dispatched to galvanization', color: 'bg-gray-500', textColor: 'text-white' },
  { key: 'Dispatch to Customer', label: 'Dispatched to customer', color: 'bg-purple-600', textColor: 'text-white' },
  { key: 'Painting', label: 'Painting', color: 'bg-orange-500', textColor: 'text-white' },
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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [logging, setLogging] = useState(false);
  const [commonData, setCommonData] = useState({
    dateProcessed: new Date().toISOString().split('T')[0],
    processingTeam: '',
    processingLocation: '',
  });
  const [partQuantities, setPartQuantities] = useState<{[key: string]: number}>({});
  const [partRemarks, setPartRemarks] = useState<{[key: string]: string}>({});
  const router = useRouter();
  const { toast } = useToast();

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

  const handleSelectPart = (partId: string) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedParts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedParts.size === sortedData.length && sortedData.length > 0) {
      setSelectedParts(new Set());
    } else {
      setSelectedParts(new Set(sortedData.map(part => part.id)));
    }
  };

  const handleOpenLogDialog = () => {
    if (selectedParts.size === 0) {
      toast({
        title: 'No parts selected',
        description: 'Please select at least one part to log',
        variant: 'destructive',
      });
      return;
    }
    
    // Initialize quantities for all selected parts
    const initialQuantities: {[key: string]: number} = {};
    selectedParts.forEach(partId => {
      initialQuantities[partId] = 1;
    });
    setPartQuantities(initialQuantities);
    setPartRemarks({});
    setShowLogDialog(true);
  };

  const handleLogAllProduction = async () => {
    if (!selectedProcess) {
      toast({
        title: 'No process selected',
        description: 'Please select a process type',
        variant: 'destructive',
      });
      return;
    }

    const selectedPartsArray = sortedData.filter(part => selectedParts.has(part.id));
    
    setLogging(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Log all parts in parallel
      const promises = selectedPartsArray.map(async (part) => {
        try {
          const payload = {
            assemblyPartId: part.id,
            processType: selectedProcess,
            dateProcessed: commonData.dateProcessed,
            processedQty: partQuantities[part.id] || 1,
            processingTeam: commonData.processingTeam || null,
            processingLocation: commonData.processingLocation || null,
            remarks: partRemarks[part.id] || null,
          };

          console.log(`Logging ${part.partDesignation}:`, payload);

          const response = await fetch('/api/production/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          });

          const responseText = await response.text();
          console.log(`Response for ${part.partDesignation} (${response.status}):`, responseText);

          if (!response.ok) {
            let errorMessage = 'Unknown error';
            try {
              const error = JSON.parse(responseText);
              errorMessage = error.error || error.message || JSON.stringify(error);
            } catch (e) {
              errorMessage = responseText || `HTTP ${response.status}`;
            }
            
            console.error(`Failed to log ${part.partDesignation}:`, errorMessage);
            errorCount++;
            return { success: false, part: part.partDesignation, error: errorMessage };
          }
          
          successCount++;
          return { success: true, part: part.partDesignation };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Network error';
          console.error(`Error logging ${part.partDesignation}:`, errorMsg);
          errorCount++;
          return { success: false, part: part.partDesignation, error: errorMsg };
        }
      });

      const results = await Promise.all(promises);

      // Collect error details
      const errors = results.filter(r => !r.success);
      const errorDetails = errors.map(e => `${e.part}: ${e.error}`).join('\n');

      // Show results
      if (errorCount === 0) {
        toast({
          title: 'Success',
          description: `Successfully logged ${successCount} part(s)`,
        });
      } else {
        // Show detailed error message
        const errorMessage = `Logged ${successCount} part(s), ${errorCount} failed:\n\n${errorDetails}`;
        
        toast({
          title: 'Partial Success',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Also show alert for better visibility
        alert(`Production Logging Results:\n\nSuccess: ${successCount}\nFailed: ${errorCount}\n\nErrors:\n${errorDetails}`);
      }

      // Close dialog and refresh
      setShowLogDialog(false);
      setSelectedParts(new Set());
      setSelectedProcess('');
      setPartQuantities({});
      setPartRemarks({});
      setCommonData({
        dateProcessed: new Date().toISOString().split('T')[0],
        processingTeam: '',
        processingLocation: '',
      });
      fetchStatusReport();
    } catch (error) {
      console.error('Error logging production:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while logging production',
        variant: 'destructive',
      });
    } finally {
      setLogging(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-40" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1 inline" /> : 
      <ArrowDown className="h-4 w-4 ml-1 inline" />;
  };

  // Filter and sort data
  const filteredData = statusData.filter((part) => {
    if (!searchQuery) return true;
    
    // Check if search query contains commas (multiple search terms)
    if (searchQuery.includes(',')) {
      const searchTerms = searchQuery.split(',').map(term => term.trim().toLowerCase()).filter(term => term.length > 0);
      
      // Part matches if it EXACTLY matches ANY of the search terms (case-insensitive)
      return searchTerms.some(term => 
        part.partDesignation.toLowerCase() === term ||
        part.assemblyMark.toLowerCase() === term ||
        part.partMark.toLowerCase() === term ||
        part.name.toLowerCase() === term ||
        (part.profile && part.profile.toLowerCase() === term)
      );
    } else {
      // Single search term - use partial matching
      const query = searchQuery.toLowerCase();
      return (
        part.partDesignation.toLowerCase().includes(query) ||
        part.assemblyMark.toLowerCase().includes(query) ||
        part.partMark.toLowerCase().includes(query) ||
        part.name.toLowerCase().includes(query) ||
        (part.profile && part.profile.toLowerCase().includes(query))
      );
    }
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    // Handle process columns
    if (sortColumn.startsWith('process_')) {
      const processKey = sortColumn.replace('process_', '');
      aValue = a.processes[processKey]?.percentage || 0;
      bValue = b.processes[processKey]?.percentage || 0;
    } else {
      // Handle regular columns
      switch (sortColumn) {
        case 'partDesignation':
          aValue = a.partDesignation;
          bValue = b.partDesignation;
          break;
        case 'assemblyMark':
          aValue = a.assemblyMark;
          bValue = b.assemblyMark;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'profile':
          aValue = a.profile || '';
          bValue = b.profile || '';
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'processedQty':
          aValue = a.processedQty;
          bValue = b.processedQty;
          break;
        case 'weight':
          aValue = a.weight || 0;
          bValue = b.weight || 0;
          break;
        default:
          return 0;
      }
    }

    // Compare values
    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }
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
                    placeholder="Search by part designation, mark, name, or profile... (use commas for multiple parts)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              {selectedParts.size > 0 && (
                <Button
                  onClick={handleOpenLogDialog}
                  variant="default"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Log Production ({selectedParts.size})
                </Button>
              )}
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
                        {sortedData.length}
                        {searchQuery && statusData.length !== sortedData.length && (
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
                        <th className="px-3 py-3 text-center font-semibold border-r">
                          <button
                            onClick={handleSelectAll}
                            className="hover:opacity-70"
                            title="Select/Deselect All"
                          >
                            {selectedParts.size === sortedData.length && sortedData.length > 0 ? (
                              <CheckSquare className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </th>
                        <th 
                          className="px-3 py-3 text-left font-semibold border-r cursor-pointer hover:bg-muted/70"
                          onClick={() => handleSort('partDesignation')}
                        >
                          Part Designation {getSortIcon('partDesignation')}
                        </th>
                        <th 
                          className="px-3 py-3 text-left font-semibold border-r cursor-pointer hover:bg-muted/70"
                          onClick={() => handleSort('assemblyMark')}
                        >
                          Bundle {getSortIcon('assemblyMark')}
                        </th>
                        <th className="px-3 py-3 text-left font-semibold border-r">Building Name</th>
                        <th 
                          className="px-3 py-3 text-left font-semibold border-r cursor-pointer hover:bg-muted/70"
                          onClick={() => handleSort('name')}
                        >
                          Assembly Part {getSortIcon('name')}
                        </th>
                        <th 
                          className="px-3 py-3 text-left font-semibold border-r cursor-pointer hover:bg-muted/70"
                          onClick={() => handleSort('profile')}
                        >
                          Profile {getSortIcon('profile')}
                        </th>
                        <th 
                          className="px-3 py-3 text-center font-semibold border-r cursor-pointer hover:bg-muted/70"
                          onClick={() => handleSort('quantity')}
                        >
                          Qty {getSortIcon('quantity')}
                        </th>
                        <th 
                          className="px-3 py-3 text-center font-semibold border-r cursor-pointer hover:bg-muted/70"
                          onClick={() => handleSort('processedQty')}
                        >
                          Processed Qty {getSortIcon('processedQty')}
                        </th>
                        <th 
                          className="px-3 py-3 text-center font-semibold border-r cursor-pointer hover:bg-muted/70"
                          onClick={() => handleSort('weight')}
                        >
                          Weight {getSortIcon('weight')}
                        </th>
                        {PROCESS_COLUMNS.map((process) => (
                          <th
                            key={process.key}
                            className={`px-3 py-3 text-center font-semibold border-r min-w-[120px] cursor-pointer hover:opacity-80 ${process.color} ${process.textColor}`}
                            onClick={() => handleSort(`process_${process.key}`)}
                          >
                            {process.label} {getSortIcon(`process_${process.key}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((part, index) => (
                        <tr
                          key={part.id}
                          className={`border-b hover:bg-muted/30 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                          } ${selectedParts.has(part.id) ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-3 py-2 text-center border-r">
                            <button
                              onClick={() => handleSelectPart(part.id)}
                              className="hover:opacity-70"
                            >
                              {selectedParts.has(part.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          </td>
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

      {/* Log Production Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {(() => {
            const selectedPartsArray = sortedData.filter(part => selectedParts.has(part.id));
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Log Production - {selectedPartsArray.length} Part(s)</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to log production for all selected parts
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Common Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="processType">Process Type *</Label>
                      <select
                        id="processType"
                        value={selectedProcess}
                        onChange={(e) => setSelectedProcess(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border bg-background"
                      >
                        <option value="">Select Process</option>
                        <option value="Preparation">Preparation</option>
                        <option value="Fit-up">Fit-up</option>
                        <option value="Welding">Welding</option>
                        <option value="Visualization">Visualization</option>
                        <option value="Sandblasting">Sandblasting</option>
                        <option value="Painting">Painting</option>
                        <option value="Galvanization">Galvanization</option>
                        <option value="Dispatched to Sandblasting">Dispatched to Sandblasting</option>
                        <option value="Dispatched to Galvanization">Dispatched to Galvanization</option>
                        <option value="Dispatched to Painting">Dispatched to Painting</option>
                        <option value="Dispatched to Site">Dispatched to Site</option>
                        <option value="Dispatched to Customer">Dispatched to Customer</option>
                        <option value="Erection">Erection</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateProcessed">Date Processed *</Label>
                      <Input
                        id="dateProcessed"
                        type="date"
                        value={commonData.dateProcessed}
                        onChange={(e) => setCommonData({ ...commonData, dateProcessed: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="processingTeam">Processing Team</Label>
                      <Input
                        id="processingTeam"
                        value={commonData.processingTeam}
                        onChange={(e) => setCommonData({ ...commonData, processingTeam: e.target.value })}
                        placeholder="Team name"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="processingLocation">Processing Location</Label>
                      <Input
                        id="processingLocation"
                        value={commonData.processingLocation}
                        onChange={(e) => setCommonData({ ...commonData, processingLocation: e.target.value })}
                        placeholder="Workshop, bay, or area"
                      />
                    </div>
                  </div>

                  {/* Parts Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Part Designation</th>
                          <th className="px-3 py-2 text-left font-semibold">Name</th>
                          <th className="px-3 py-2 text-center font-semibold">Total Qty</th>
                          <th className="px-3 py-2 text-center font-semibold">Qty to Log *</th>
                          <th className="px-3 py-2 text-left font-semibold">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPartsArray.map((part, index) => (
                          <tr key={part.id} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                            <td className="px-3 py-2 font-medium">{part.partDesignation}</td>
                            <td className="px-3 py-2 text-sm">{part.name}</td>
                            <td className="px-3 py-2 text-center">{part.quantity}</td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min="1"
                                max={part.quantity}
                                value={partQuantities[part.id] || 1}
                                onChange={(e) => setPartQuantities({
                                  ...partQuantities,
                                  [part.id]: parseInt(e.target.value) || 1
                                })}
                                className="w-20 text-center"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={partRemarks[part.id] || ''}
                                onChange={(e) => setPartRemarks({
                                  ...partRemarks,
                                  [part.id]: e.target.value
                                })}
                                placeholder="Optional notes"
                                className="w-full"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLogDialog(false);
                setSelectedProcess('');
                setPartQuantities({});
                setPartRemarks({});
              }}
              disabled={logging}
            >
              Cancel
            </Button>
            <Button onClick={handleLogAllProduction} disabled={!selectedProcess || logging}>
              {logging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging {selectedPartsArray.length} part(s)...
                </>
              ) : (
                <>
                  <Activity className="mr-2 h-4 w-4" />
                  Log All ({selectedPartsArray.length})
                </>
              )}
            </Button>
          </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
