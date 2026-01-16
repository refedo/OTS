'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Check, Wand2, Plus, Trash2, Upload, Calendar } from 'lucide-react';
import Link from 'next/link';

type Building = {
  id: string;
  name: string;
  designation: string;
};

type ScopeItem = {
  id: string;
  label: string;
  checked: boolean;
};

type ScopeSchedule = {
  scopeId: string;
  scopeLabel: string;
  buildingId: string;
  startDate: string;
  endDate: string;
};

type CoatingCoat = {
  id: string;
  coatName: string;
  microns: string;
  ralNumber: string;
};

type PaymentTerm = {
  id: string;
  percentage: string;
  description: string;
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


export default function ProjectSetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Project Details
  const [projectNumber, setProjectNumber] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [status, setStatus] = useState('Draft');
  const [contractualTonnage, setContractualTonnage] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [downPaymentDate, setDownPaymentDate] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState<ScopeItem[]>(
    SCOPE_OPTIONS.map(opt => ({ ...opt, checked: false }))
  );
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([]);

  // Step 2: Buildings
  const [buildings, setBuildings] = useState<Building[]>([]);

  // Step 3: Scope Schedules
  const [scopeSchedules, setScopeSchedules] = useState<ScopeSchedule[]>([]);
  
  // Step 4: Coating System
  const [coatingCoats, setCoatingCoats] = useState<CoatingCoat[]>([]);
  const [isGalvanized, setIsGalvanized] = useState(false);

  // Step 5: Payment Terms
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  // Step 6: Upload Parts (handled separately)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Fetch managers on mount
  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        const projectManagers = data.filter((user: any) => 
          ['CEO', 'Admin', 'Manager'].includes(user.role?.name)
        );
        setManagers(projectManagers);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const addBuilding = () => {
    const newBuilding: Building = {
      id: `temp-${Date.now()}`,
      name: '',
      designation: '',
    };
    setBuildings([...buildings, newBuilding]);
    
    // Add scope schedules for this building
    const selectedScopes = scopeOfWork.filter(s => s.checked);
    const newSchedules = selectedScopes.map(scope => ({
      scopeId: scope.id,
      scopeLabel: scope.label,
      buildingId: newBuilding.id,
      startDate: '',
      endDate: '',
    }));
    setScopeSchedules([...scopeSchedules, ...newSchedules]);
  };

  const removeBuilding = (id: string) => {
    setBuildings(buildings.filter(b => b.id !== id));
    // Remove all scope schedules for this building
    setScopeSchedules(scopeSchedules.filter(s => s.buildingId !== id));
  };

  const updateBuilding = (id: string, field: keyof Building, value: string) => {
    setBuildings(buildings.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const toggleScope = (id: string) => {
    const item = scopeOfWork.find(s => s.id === id);
    if (!item) return;

    setScopeOfWork(scopeOfWork.map(s =>
      s.id === id ? { ...s, checked: !s.checked } : s
    ));

    // Add or remove from scope schedules for all buildings
    if (!item.checked) {
      // Adding scope - create schedule for each building
      const newSchedules = buildings.map(building => ({
        scopeId: id,
        scopeLabel: item.label,
        buildingId: building.id,
        startDate: '',
        endDate: '',
      }));
      setScopeSchedules([...scopeSchedules, ...newSchedules]);
    } else {
      // Removing scope - remove all schedules for this scope
      setScopeSchedules(scopeSchedules.filter(s => s.scopeId !== id));
    }
  };

  const updateScopeSchedule = (buildingId: string, scopeId: string, field: 'startDate' | 'endDate', value: string) => {
    setScopeSchedules(scopeSchedules.map(s =>
      s.buildingId === buildingId && s.scopeId === scopeId ? { ...s, [field]: value } : s
    ));
  };

  const calculateDuration = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Coating functions
  const addCoatingCoat = () => {
    const newCoat: CoatingCoat = {
      id: `coat-${Date.now()}`,
      coatName: '',
      microns: '',
      ralNumber: '',
    };
    setCoatingCoats([...coatingCoats, newCoat]);
  };

  const removeCoatingCoat = (id: string) => {
    setCoatingCoats(coatingCoats.filter(c => c.id !== id));
  };

  const updateCoatingCoat = (id: string, field: keyof CoatingCoat, value: string) => {
    setCoatingCoats(coatingCoats.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
    
    // Check if any coat contains galvanization
    const hasGalvanization = coatingCoats.some(c => 
      c.coatName.toLowerCase().includes('galvaniz')
    );
    setIsGalvanized(hasGalvanization);
  };

  // Payment Terms functions
  const addPaymentTerm = () => {
    const newTerm: PaymentTerm = {
      id: `term-${Date.now()}`,
      percentage: '',
      description: '',
    };
    setPaymentTerms([...paymentTerms, newTerm]);
  };

  const removePaymentTerm = (id: string) => {
    setPaymentTerms(paymentTerms.filter(t => t.id !== id));
  };

  const updatePaymentTerm = (id: string, field: keyof PaymentTerm, value: string) => {
    setPaymentTerms(paymentTerms.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const getTotalPaymentPercentage = () => {
    return paymentTerms.reduce((sum, term) => sum + (parseFloat(term.percentage) || 0), 0);
  };

  const generateScopeText = () => {
    const selected = scopeOfWork.filter(item => item.checked).map(item => item.label);
    if (selected.length === 0) return '';
    return `This project includes the following scope of work:\n\n${selected.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`;
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return projectNumber && projectName && clientName && projectManagerId && scopeOfWork.some(s => s.checked);
      case 2:
        return buildings.length > 0 && buildings.every(b => b.name && b.designation);
      case 3:
        return scopeSchedules.every(s => s.startDate && s.endDate);
      case 4:
        return coatingCoats.length > 0 && coatingCoats.every(c => c.coatName);
      case 5:
        // Payment terms validation: total should be 100% if any terms are added
        if (paymentTerms.length === 0) return true; // Optional
        const total = getTotalPaymentPercentage();
        return paymentTerms.every(t => t.percentage && t.description) && Math.abs(total - 100) < 0.01;
      case 6:
        return true; // Upload parts - optional step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    } else {
      alert('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Generate coating system description
      const coatingSystemText = coatingCoats.map((coat, idx) => 
        `Coat ${idx + 1}: ${coat.coatName}${coat.microns ? ` (${coat.microns} microns)` : ''}${coat.ralNumber ? ` - ${coat.ralNumber}` : ''}`
      ).join('\n');

      // Convert payment terms array to individual payment fields
      const paymentData: any = {};
      const contractValueNum = contractValue ? parseFloat(contractValue) : 0;
      
      paymentTerms.forEach((term, index) => {
        const paymentNum = index + 1;
        const percentage = parseFloat(term.percentage) || 0;
        const amount = contractValueNum > 0 ? (contractValueNum * percentage / 100) : 0;
        
        // Store percentage with description for display
        const milestoneWithPercentage = `${percentage}% - ${term.description}`;
        
        if (paymentNum === 1) {
          paymentData.downPayment = amount;
          paymentData.downPaymentMilestone = milestoneWithPercentage;
        } else {
          paymentData[`payment${paymentNum}`] = amount;
          paymentData[`payment${paymentNum}Milestone`] = milestoneWithPercentage;
        }
      });

      // Create project
      const projectData = {
        projectNumber,
        name: projectName,
        clientName,
        projectManagerId,
        status,
        contractualTonnage: contractualTonnage ? parseFloat(contractualTonnage) : 0,
        contractDate: contractDate || null,
        downPaymentDate: downPaymentDate || null,
        contractValue: contractValue ? parseFloat(contractValue) : null,
        scopeOfWork: generateScopeText(),
        galvanized: isGalvanized,
        coatingSystem: coatingSystemText,
        ...paymentData, // Include payment terms
      };

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json();
        console.error('Project creation error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create project');
      }

      const project = await projectResponse.json();

      // Create buildings and their scope schedules
      const createdBuildings: { [tempId: string]: string } = {}; // Map temp IDs to real IDs
      
      for (const building of buildings) {
        const buildingData = {
          projectId: project.id,
          name: building.name,
          designation: building.designation,
        };

        const buildingResponse = await fetch('/api/buildings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildingData),
        });

        if (!buildingResponse.ok) {
          const error = await buildingResponse.json();
          console.error('Failed to create building:', building.name, error);
          throw new Error(`Failed to create building: ${building.name}`);
        }

        const createdBuilding = await buildingResponse.json();
        createdBuildings[building.id] = createdBuilding.id;
      }

      // Save scope schedules
      for (const schedule of scopeSchedules) {
        const realBuildingId = createdBuildings[schedule.buildingId];
        if (!realBuildingId) continue;

        const scheduleData = {
          projectId: project.id,
          buildingId: realBuildingId,
          scopeType: schedule.scopeId,
          scopeLabel: schedule.scopeLabel,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
        };

        const scheduleResponse = await fetch('/api/scope-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduleData),
        });

        if (!scheduleResponse.ok) {
          console.error('Failed to create scope schedule:', schedule.scopeLabel);
          // Don't throw error - schedules are nice to have but not critical
        }
      }

      // Handle file upload if present
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('projectId', project.id);

        await fetch('/api/projects/upload', {
          method: 'POST',
          body: formData,
        });
      }

      const buildingCount = buildings.length;
      const scopeScheduleCount = scopeSchedules.length;
      const coatingCount = coatingCoats.length;
      
      alert(`Project created successfully!\n\n✓ ${buildingCount} building(s) added\n✓ ${scopeScheduleCount} scope schedule(s) saved\n✓ ${coatingCount} coating coat(s) specified`);
      router.push('/projects');
      router.refresh();
    } catch (error) {
      console.error('Error creating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create project:\n\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5].map((step, idx) => (
        <div key={step} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            currentStep === step 
              ? 'bg-primary text-white' 
              : currentStep > step 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-600'
          }`}>
            {currentStep > step ? <Check className="h-5 w-5" /> : step}
          </div>
          {idx < 4 && (
            <div className={`w-16 h-1 mx-2 ${
              currentStep > step ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wand2 className="h-8 w-8" />
            Project Setup Wizard
          </h1>
          <p className="text-muted-foreground mt-1">
            Step {currentStep} of 6
          </p>
        </div>
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </Link>
      </div>

      {renderStepIndicator()}

      {/* Step 1: Project Details */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectNumber">Project Number *</Label>
                <Input
                  id="projectNumber"
                  value={projectNumber}
                  onChange={(e) => setProjectNumber(e.target.value)}
                  placeholder="e.g., PRJ-2025-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Industrial Complex"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., ABC Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectManager">Project Manager *</Label>
                <select
                  id="projectManager"
                  value={projectManagerId}
                  onChange={(e) => setProjectManagerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractDate">Contract Date</Label>
                <Input
                  id="contractDate"
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="downPaymentDate">Down Payment Date</Label>
                <Input
                  id="downPaymentDate"
                  type="date"
                  value={downPaymentDate}
                  onChange={(e) => setDownPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractValue">Contract Value ($)</Label>
                <Input
                  id="contractValue"
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="e.g., 1000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractualTonnage">Contractual Tonnage (tons)</Label>
              <Input
                id="contractualTonnage"
                type="number"
                value={contractualTonnage}
                onChange={(e) => setContractualTonnage(e.target.value)}
                placeholder="e.g., 500"
              />
            </div>

            <div className="space-y-2">
              <Label>Scope of Work *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {scopeOfWork.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={item.id}
                      checked={item.checked}
                      onChange={() => toggleScope(item.id)}
                      className="rounded"
                    />
                    <label htmlFor={item.id} className="text-sm cursor-pointer">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Buildings */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Buildings</span>
              <Button onClick={addBuilding} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Building
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {buildings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No buildings added yet. Click "Add Building" to start.</p>
              </div>
            ) : (
              buildings.map((building, idx) => (
                <div key={building.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Building {idx + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBuilding(building.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Building Name *</Label>
                      <Input
                        value={building.name}
                        onChange={(e) => updateBuilding(building.id, 'name', e.target.value)}
                        placeholder="e.g., Main Building"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Designation *</Label>
                      <Input
                        value={building.designation}
                        onChange={(e) => updateBuilding(building.id, 'designation', e.target.value.toUpperCase())}
                        placeholder="e.g., BLD-A"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Scope Schedules */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Scope Schedules by Building</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {buildings.map((building, idx) => {
              const buildingSchedules = scopeSchedules.filter(s => s.buildingId === building.id);
              return (
                <div key={building.id} className="border-2 rounded-lg p-4 space-y-4">
                  <h3 className="font-bold text-lg">{building.name || `Building ${idx + 1}`}</h3>
                  {buildingSchedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No scope selected for this building</p>
                  ) : (
                    <div className="space-y-3">
                      {buildingSchedules.map((scope) => {
                        const duration = calculateDuration(scope.startDate, scope.endDate);
                        return (
                          <div key={`${building.id}-${scope.scopeId}`} className="border rounded-lg p-3 bg-muted/30">
                            <h4 className="font-medium mb-2">{scope.scopeLabel}</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label>Start Date *</Label>
                                <Input
                                  type="date"
                                  value={scope.startDate}
                                  onChange={(e) => updateScopeSchedule(building.id, scope.scopeId, 'startDate', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>End Date *</Label>
                                <Input
                                  type="date"
                                  value={scope.endDate}
                                  onChange={(e) => updateScopeSchedule(building.id, scope.scopeId, 'endDate', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Duration</Label>
                                <div className="h-10 px-3 rounded-md border bg-background flex items-center text-sm font-medium">
                                  {duration > 0 ? `${duration} days` : '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Coating System */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Coating System</span>
              <Button onClick={addCoatingCoat} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Coat
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coatingCoats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No coating coats added yet. Click "Add Coat" to start.</p>
              </div>
            ) : (
              coatingCoats.map((coat, idx) => (
                <div key={coat.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Coat {idx + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoatingCoat(coat.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Coat Name *</Label>
                      <Input
                        value={coat.coatName}
                        onChange={(e) => updateCoatingCoat(coat.id, 'coatName', e.target.value)}
                        placeholder="e.g., Hot-Dip Galvanization"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Microns</Label>
                      <Input
                        type="number"
                        value={coat.microns}
                        onChange={(e) => updateCoatingCoat(coat.id, 'microns', e.target.value)}
                        placeholder="e.g., 85"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>RAL Number</Label>
                      <Input
                        value={coat.ralNumber}
                        onChange={(e) => updateCoatingCoat(coat.id, 'ralNumber', e.target.value)}
                        placeholder="e.g., RAL 7035"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Payment Terms */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {paymentTerms.map((term, index) => (
                <div key={term.id} className="flex gap-4 items-start p-4 border rounded-lg">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Payment Percentage (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={term.percentage}
                          onChange={(e) => updatePaymentTerm(term.id, 'percentage', e.target.value)}
                          placeholder="e.g., 30"
                        />
                      </div>
                      <div>
                        <Label>Term Description</Label>
                        <Input
                          value={term.description}
                          onChange={(e) => updatePaymentTerm(term.id, 'description', e.target.value)}
                          placeholder="e.g., Down Payment, Upon Delivery"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePaymentTerm(term.id)}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={addPaymentTerm} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Term
            </Button>

            {paymentTerms.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Payment Percentage:</span>
                  <span className={`text-lg font-bold ${
                    Math.abs(getTotalPaymentPercentage() - 100) < 0.01 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {getTotalPaymentPercentage().toFixed(2)}%
                  </span>
                </div>
                {Math.abs(getTotalPaymentPercentage() - 100) >= 0.01 && (
                  <p className="text-sm text-red-600 mt-2">
                    Total must equal 100%
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Define payment terms and percentages for this project. Total must equal 100%.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Upload Parts */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Assembly Parts (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload Excel file with assembly parts data
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button type="button" variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
              {uploadedFile && (
                <p className="mt-4 text-sm font-medium text-green-600">
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              You can skip this step and upload parts later from the project details page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        {currentStep < 6 ? (
          <Button onClick={nextStep}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
            <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
