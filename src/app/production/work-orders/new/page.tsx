'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardList,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Package,
  Users,
  Calendar,
} from 'lucide-react';

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

type Part = {
  id: string;
  partDesignation: string;
  assemblyMark: string;
  partMark: string;
  name: string;
  quantity: number;
  netWeightTotal: number;
  status: string;
};

type GroupedParts = {
  groupName: string;
  parts: Part[];
  count: number;
  totalWeight: number;
  producedCount: number;
  isFullyProduced: boolean;
  progressPercent: number;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type ProcessingLocation = {
  id: string;
  name: string;
  description?: string;
};

type ProcessingTeam = {
  id: string;
  name: string;
  description?: string;
};

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Project & Building
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');

  // Step 2: Groups
  const [groupedParts, setGroupedParts] = useState<GroupedParts[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Step 3: Parts
  const [selectedParts, setSelectedParts] = useState<string[]>([]);

  // Step 4: Responsibility
  const [engineers, setEngineers] = useState<User[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [processingLocations, setProcessingLocations] = useState<ProcessingLocation[]>([]);
  const [processingTeams, setProcessingTeams] = useState<ProcessingTeam[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [description, setDescription] = useState('');
  const [fabricationSchedule, setFabricationSchedule] = useState<any>(null);
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [dateWarning, setDateWarning] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchEngineers();
    fetchProcessingLocations();
    fetchProcessingTeams();
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
      fetchGroupedParts(selectedBuilding);
      fetchFabricationSchedule(selectedBuilding);
    } else {
      setGroupedParts([]);
      setSelectedGroups([]);
      setSelectedParts([]);
      setFabricationSchedule(null);
      setPlannedStartDate('');
      setPlannedEndDate('');
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

  const fetchGroupedParts = async (buildingId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/work-orders/parts-grouped?buildingId=${buildingId}`);
      if (response.ok) {
        const data = await response.json();
        setGroupedParts(data);
      }
    } catch (error) {
      console.error('Error fetching grouped parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setEngineers(data);
      }
    } catch (error) {
      console.error('Error fetching engineers:', error);
    }
  };

  const fetchProcessingLocations = async () => {
    try {
      const response = await fetch('/api/settings/production/locations?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setProcessingLocations(data);
      }
    } catch (error) {
      console.error('Error fetching processing locations:', error);
    }
  };

  const fetchProcessingTeams = async () => {
    try {
      const response = await fetch('/api/settings/production/teams?activeOnly=true');
      if (response.ok) {
        const data = await response.json();
        setProcessingTeams(data);
      }
    } catch (error) {
      console.error('Error fetching processing teams:', error);
    }
  };

  const fetchFabricationSchedule = async (buildingId: string) => {
    try {
      // Fetch schedules specifically for this building and fabrication scope
      const response = await fetch(`/api/scope-schedules/all?buildingId=${buildingId}&scopeType=fabrication`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fabrication schedules for building:', buildingId, data);
        
        if (data.length > 0) {
          const fabrication = data[0]; // Should only be one fabrication schedule per building
          setFabricationSchedule(fabrication);
          const start = new Date(fabrication.startDate).toISOString().split('T')[0];
          const end = new Date(fabrication.endDate).toISOString().split('T')[0];
          setPlannedStartDate(start);
          setPlannedEndDate(end);
          console.log('Set dates:', { start, end, building: fabrication.building });
        } else {
          console.warn('No fabrication schedule found for building:', buildingId);
          setFabricationSchedule(null);
          setPlannedStartDate('');
          setPlannedEndDate('');
        }
      }
    } catch (error) {
      console.error('Error fetching fabrication schedule:', error);
    }
  };

  const toggleGroup = (groupName: string) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupName)) {
        // Remove group and its parts
        const group = groupedParts.find(g => g.groupName === groupName);
        if (group) {
          const groupPartIds = group.parts.map(p => p.id);
          setSelectedParts(prevParts => prevParts.filter(id => !groupPartIds.includes(id)));
        }
        return prev.filter(g => g !== groupName);
      } else {
        // Add group and its parts
        const group = groupedParts.find(g => g.groupName === groupName);
        if (group) {
          const groupPartIds = group.parts.map(p => p.id);
          setSelectedParts(prevParts => [...new Set([...prevParts, ...groupPartIds])]);
        }
        return [...prev, groupName];
      }
    });
  };

  const togglePart = (partId: string) => {
    setSelectedParts(prev => {
      if (prev.includes(partId)) {
        return prev.filter(id => id !== partId);
      } else {
        return [...prev, partId];
      }
    });
  };

  const selectAllPartsInGroup = (groupName: string) => {
    const group = groupedParts.find(g => g.groupName === groupName);
    if (group) {
      const groupPartIds = group.parts.map(p => p.id);
      setSelectedParts(prev => [...new Set([...prev, ...groupPartIds])]);
      if (!selectedGroups.includes(groupName)) {
        setSelectedGroups(prev => [...prev, groupName]);
      }
    }
  };

  useEffect(() => {
    if (plannedEndDate && fabricationSchedule) {
      const woEnd = new Date(plannedEndDate);
      const fabEnd = new Date(fabricationSchedule.endDate);
      
      if (woEnd > fabEnd) {
        setDateWarning(`⚠️ Warning: End date (${plannedEndDate}) exceeds fabrication schedule end date (${new Date(fabricationSchedule.endDate).toISOString().split('T')[0]})`);
      } else {
        setDateWarning('');
      }
    }
  }, [plannedEndDate, fabricationSchedule]);

  const handleSubmit = async () => {
    if (!selectedProject || !selectedBuilding || selectedParts.length === 0 || !selectedEngineer) {
      alert('Please complete all required fields');
      return;
    }

    if (!plannedStartDate || !plannedEndDate) {
      alert('Please set start and end dates');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          buildingId: selectedBuilding,
          selectedGroups,
          selectedPartIds: selectedParts,
          productionEngineerId: selectedEngineer,
          processingLocation: selectedLocation,
          processingTeam: selectedTeam,
          description,
          plannedStartDate,
          plannedEndDate,
        }),
      });

      if (response.ok) {
        const workOrder = await response.json();
        alert(`Work Order ${workOrder.workOrderNumber} created successfully!`);
        router.push('/production/work-orders');
      } else {
        const error = await response.json();
        console.error('Server error:', error);
        alert(`${error.error || 'Failed to create work order'}\n\nDetails: ${error.message || 'Unknown'}`);
      }
    } catch (error) {
      console.error('Error creating work order:', error);
      alert('Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToStep2 = selectedProject && selectedBuilding;
  const canProceedToStep3 = selectedGroups.length > 0;
  const canProceedToStep4 = selectedParts.length > 0;

  const getTotalWeight = () => {
    return groupedParts
      .flatMap(g => g.parts)
      .filter(p => selectedParts.includes(p.id))
      .reduce((sum, p) => sum + (Number(p.netWeightTotal) || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Create Work Order
        </h1>
        <p className="text-muted-foreground mt-1">
          Follow the steps to create a new work order
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {[
          { num: 1, label: 'Project & Building', icon: Package },
          { num: 2, label: 'Select Groups', icon: Package },
          { num: 3, label: 'Select Parts', icon: Package },
          { num: 4, label: 'Responsibility', icon: Users },
        ].map((s, index) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  step > s.num
                    ? 'bg-green-500 text-white'
                    : step === s.num
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.num ? <Check className="h-6 w-6" /> : <s.icon className="h-6 w-6" />}
              </div>
              <p className="text-xs mt-2 text-center font-medium">{s.label}</p>
            </div>
            {index < 3 && (
              <div className={`h-1 flex-1 ${step > s.num ? 'bg-green-500' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Step 1: Select Project & Building'}
            {step === 2 && 'Step 2: Select Groups'}
            {step === 3 && 'Step 3: Select Parts'}
            {step === 4 && 'Step 4: Assign Responsibility'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Project & Building */}
          {step === 1 && (
            <div className="space-y-4">
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
          )}

          {/* Step 2: Select Groups */}
          {step === 2 && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : groupedParts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No parts found for this building</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedParts.map((group) => (
                    <Card
                      key={group.groupName}
                      className={`transition-all ${
                        group.isFullyProduced
                          ? 'opacity-50 cursor-not-allowed bg-muted/50'
                          : selectedGroups.includes(group.groupName)
                          ? 'border-primary bg-primary/5 cursor-pointer'
                          : 'hover:border-primary/50 cursor-pointer'
                      }`}
                      onClick={() => !group.isFullyProduced && toggleGroup(group.groupName)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              {group.groupName}
                              {group.isFullyProduced && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-normal">
                                  100% Produced
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {group.count} parts • {(group.totalWeight / 1000).toFixed(2)} tons
                            </p>
                            {group.progressPercent > 0 && !group.isFullyProduced && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Production Progress</span>
                                  <span className="font-medium">{group.progressPercent}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${group.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                              group.isFullyProduced
                                ? 'bg-green-500 border-green-500'
                                : selectedGroups.includes(group.groupName)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {(selectedGroups.includes(group.groupName) || group.isFullyProduced) && (
                              <Check className="h-4 w-4 text-white" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Parts */}
          {step === 3 && (
            <div className="space-y-4">
              {selectedGroups.map((groupName) => {
                const group = groupedParts.find(g => g.groupName === groupName);
                if (!group) return null;

                const groupPartIds = group.parts.map(p => p.id);
                const allSelected = groupPartIds.every(id => selectedParts.includes(id));

                return (
                  <div key={groupName} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">{groupName}</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAllPartsInGroup(groupName)}
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {group.parts.map((part) => (
                        <div
                          key={part.id}
                          className={`flex items-center justify-between p-3 rounded border cursor-pointer ${
                            selectedParts.includes(part.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => togglePart(part.id)}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{part.assemblyMark} - {part.partMark}</div>
                            <div className="text-sm text-muted-foreground">
                              {part.partDesignation} • Qty: {part.quantity} • {(Number(part.netWeightTotal) / 1000).toFixed(2)} tons
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedParts.includes(part.id)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {selectedParts.includes(part.id) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Selected:</span>
                  <span className="text-lg font-bold">
                    {selectedParts.length} parts • {(getTotalWeight() / 1000).toFixed(2)} tons
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Responsibility */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="engineer">Production Engineer *</Label>
                <select
                  id="engineer"
                  value={selectedEngineer}
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background mt-1"
                >
                  <option value="">Select an engineer...</option>
                  {engineers.map((engineer) => (
                    <option key={engineer.id} value={engineer.id}>
                      {engineer.name} ({engineer.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="location">Processing Location</Label>
                <select
                  id="location"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background mt-1"
                >
                  <option value="">Select location...</option>
                  {processingLocations.map((location) => (
                    <option key={location.id} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="team">Processing Team</Label>
                <select
                  id="team"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background mt-1"
                >
                  <option value="">Select team...</option>
                  {processingTeams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Planned Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={plannedStartDate}
                    onChange={(e) => setPlannedStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Planned End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={plannedEndDate}
                    onChange={(e) => setPlannedEndDate(e.target.value)}
                    className="mt-1"
                  />
                  {dateWarning && (
                    <p className="text-xs text-orange-600 mt-1">{dateWarning}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes or instructions..."
                  rows={4}
                />
              </div>

              {fabricationSchedule && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Fabrication Schedule Reference
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Schedule Start:</span>{' '}
                      <span className="font-medium">{new Date(fabricationSchedule.startDate).toLocaleDateString()}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Schedule End:</span>{' '}
                      <span className="font-medium">{new Date(fabricationSchedule.endDate).toLocaleDateString()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Work order dates should be within this timeframe.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Work Order Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Groups:</span>
                    <span className="ml-2 font-medium">{selectedGroups.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Parts:</span>
                    <span className="ml-2 font-medium">{selectedParts.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Weight:</span>
                    <span className="ml-2 font-medium">{(getTotalWeight() / 1000).toFixed(2)} tons</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedToStep2) ||
                  (step === 2 && !canProceedToStep3) ||
                  (step === 3 && !canProceedToStep4)
                }
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Work Order
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
