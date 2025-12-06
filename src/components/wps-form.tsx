'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';

type Project = {
  id: string;
  projectNumber: string;
  name: string;
  client: { name: string };
};

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  role: {
    name: string;
  };
};

type Pass = {
  id?: string;
  layerNo: number;
  process: string;
  electrodeClass: string;
  diameter: number;
  polarity: string;
  amperage: number;
  voltage: number;
  travelSpeed: number;
  heatInput: number;
};

type WPSFormProps = {
  projects: Project[];
  users: User[];
  wps?: any;
};

const WELDING_PROCESSES = ['SMAW', 'GMAW', 'GTAW', 'FCAW', 'SAW'];
const CURRENT_TYPES = ['AC', 'DCEN', 'DCEP', 'Pulsed'];
const POSITIONS = ['1G', '2G', '3G', '4G', '5G', '6G', '1F', '2F', '3F', '4F'];
const JOINT_TYPES = ['Butt', 'Fillet', 'Corner', 'T-Joint', 'Lap', 'Edge'];
const BACKING_TYPES = ['None', 'Steel', 'Ceramic', 'Gas', 'Flux'];
const POLARITIES = ['AC', 'DCEP', 'DCEN'];

export function WPSForm({ projects, users, wps }: WPSFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [imagePreview, setImagePreview] = useState<string | null>(wps?.jointDiagram || null);
  const [selectedProject, setSelectedProject] = useState(wps?.projectId || '');
  const [wpsNumber, setWpsNumber] = useState(wps?.wpsNumber || '');
  const [revision, setRevision] = useState(wps?.revision || 0);
  const [weldingProcess, setWeldingProcess] = useState(wps?.weldingProcess || 'SMAW');
  const [supportingPQR, setSupportingPQR] = useState(wps?.supportingPQR || '');
  
  // Passes
  const [passes, setPasses] = useState<Pass[]>(
    wps?.passes || [
      {
        layerNo: 1,
        process: 'SMAW',
        electrodeClass: 'E7018',
        diameter: 0.125,
        polarity: 'DCEP',
        amperage: 90,
        voltage: 22,
        travelSpeed: 8,
        heatInput: 1.5,
      },
    ]
  );

  const addPass = () => {
    setPasses([
      ...passes,
      {
        layerNo: passes.length + 1,
        process: weldingProcess,
        electrodeClass: '',
        diameter: 0,
        polarity: 'DCEP',
        amperage: 0,
        voltage: 0,
        travelSpeed: 0,
        heatInput: 0,
      },
    ]);
  };

  const removePass = (index: number) => {
    setPasses(passes.filter((_, i) => i !== index));
  };

  const updatePass = (index: number, field: keyof Pass, value: any) => {
    const updated = [...passes];
    updated[index] = { ...updated[index], [field]: value };
    setPasses(updated);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    // Helper to convert empty strings to null
    const getStringOrNull = (value: string | null): string | null => {
      return value && value.trim() !== '' ? value : null;
    };

    // Helper to parse numbers safely
    const getNumberOrNull = (value: string | null, parser: (v: string) => number): number | null => {
      if (!value || value.trim() === '') return null;
      const parsed = parser(value);
      return isNaN(parsed) ? null : parsed;
    };

    // Handle file upload first if present
    let jointDiagramPath = wps?.jointDiagram || null;
    const jointDiagramFile = formData.get('jointDiagram') as File;
    if (jointDiagramFile && jointDiagramFile.size > 0) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', jointDiagramFile);
      uploadFormData.append('folder', 'wps-diagrams');
      
      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          jointDiagramPath = uploadData.filePath;
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
      }
    }

    const data = {
      wpsNumber,
      revision: getNumberOrNull(formData.get('revision') as string, parseInt) ?? 0,
      projectId: selectedProject,
      type: (formData.get('type') as string) || 'CUSTOM',
      weldingProcess,
      supportingPQR: getStringOrNull(formData.get('supportingPQR') as string),
      // New base metal fields
      materialSpec: getStringOrNull(formData.get('materialSpec') as string),
      materialGroup: getStringOrNull(formData.get('materialGroup') as string),
      thicknessRange: getStringOrNull(formData.get('thicknessRange') as string),
      baseMetalGroove: getStringOrNull(formData.get('baseMetalGroove') as string),
      baseMetalFillet: getStringOrNull(formData.get('baseMetalFillet') as string),
      materialThickness: getNumberOrNull(formData.get('materialThickness') as string, parseFloat),
      jointDiagram: jointDiagramPath,
      backingUsed: getStringOrNull(formData.get('backingUsed') as string),
      backingType2: getStringOrNull(formData.get('backingType2') as string),
      // Legacy fields
      baseMaterial: getStringOrNull(formData.get('baseMaterial') as string),
      thicknessGroove: getNumberOrNull(formData.get('thicknessGroove') as string, parseFloat),
      thicknessFillet: getNumberOrNull(formData.get('thicknessFillet') as string, parseFloat),
      diameter: getNumberOrNull(formData.get('diameter') as string, parseFloat),
      fillerMetalSpec: getStringOrNull(formData.get('fillerMetalSpec') as string),
      fillerClass: getStringOrNull(formData.get('fillerClass') as string),
      shieldingGas: getStringOrNull(formData.get('shieldingGas') as string),
      flowRate: getNumberOrNull(formData.get('flowRate') as string, parseFloat),
      currentType: getStringOrNull(formData.get('currentType') as string),
      preheatTempMin: getNumberOrNull(formData.get('preheatTempMin') as string, parseInt),
      interpassTempMin: getNumberOrNull(formData.get('interpassTempMin') as string, parseInt),
      interpassTempMax: getNumberOrNull(formData.get('interpassTempMax') as string, parseInt),
      postWeldTemp: getNumberOrNull(formData.get('postWeldTemp') as string, parseInt),
      position: getStringOrNull(formData.get('position') as string),
      jointType: getStringOrNull(formData.get('jointType') as string),
      grooveAngle: getNumberOrNull(formData.get('grooveAngle') as string, parseInt),
      rootOpening: getNumberOrNull(formData.get('rootOpening') as string, parseFloat),
      backingType: getStringOrNull(formData.get('backingType') as string),
      remarks: getStringOrNull(formData.get('remarks') as string),
      approvedById: getStringOrNull(formData.get('approvedById') as string),
      clientApprovedBy: getStringOrNull(formData.get('clientApprovedBy') as string),
    };

    console.log('Submitting WPS data:', data);

    try {
      // Create/Update WPS
      const wpsResponse = await fetch(wps ? `/api/wps/${wps.id}` : '/api/wps', {
        method: wps ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!wpsResponse.ok) {
        const errorData = await wpsResponse.json();
        console.error('WPS API Error:', errorData);
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${JSON.stringify(errorData.details)}` 
          : errorData.error || 'Failed to save WPS';
        throw new Error(errorMessage);
      }

      const savedWPS = await wpsResponse.json();

      // Save passes
      if (!wps) {
        for (const pass of passes) {
          await fetch(`/api/wps/${savedWPS.id}/passes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pass),
          });
        }
      }

      router.push(`/wps/${savedWPS.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="base-metal">Base Metal</TabsTrigger>
          <TabsTrigger value="filler">Filler Metal</TabsTrigger>
          <TabsTrigger value="electrical">Electrical</TabsTrigger>
          <TabsTrigger value="technique">Technique</TabsTrigger>
          <TabsTrigger value="passes">Welding Passes</TabsTrigger>
        </TabsList>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* General Information Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project *</Label>
                  <select
                    id="project"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    required
                    disabled={loading || !!wps}
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
                  <Label htmlFor="wpsNumber">WPS Number *</Label>
                  <Input
                    id="wpsNumber"
                    value={wpsNumber}
                    onChange={(e) => setWpsNumber(e.target.value)}
                    placeholder="e.g., HEXA-WPS-001"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="revision">Revision</Label>
                  <Input
                    id="revision"
                    name="revision"
                    type="number"
                    min="0"
                    defaultValue={revision}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    name="type"
                    defaultValue={wps?.type || 'CUSTOM'}
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="STANDARD">HEXA Standard</option>
                    <option value="CUSTOM">Client Custom</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weldingProcess">Welding Process *</Label>
                  <select
                    id="weldingProcess"
                    value={weldingProcess}
                    onChange={(e) => setWeldingProcess(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    {WELDING_PROCESSES.map((process) => (
                      <option key={process} value={process}>
                        {process}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportingPQR">Supporting PQR No.</Label>
                  <Input
                    id="supportingPQR"
                    name="supportingPQR"
                    value={supportingPQR}
                    onChange={(e) => setSupportingPQR(e.target.value)}
                    placeholder="e.g., HEXA-PQR-001"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="approvedById">Assign Approver</Label>
                  <select
                    id="approvedById"
                    name="approvedById"
                    defaultValue={wps?.approvedById || ''}
                    disabled={loading || wps?.status === 'Approved'}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="">Select Approver (Optional)</option>
                    {users
                      .filter(u => ['Admin', 'Manager'].includes(u.role.name))
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} {user.position ? `(${user.position})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientApprovedBy">Client Approved By</Label>
                  <Input
                    id="clientApprovedBy"
                    name="clientApprovedBy"
                    placeholder="Client representative name"
                    defaultValue={wps?.clientApprovedBy || ''}
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Base Metal Tab */}
        <TabsContent value="base-metal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Joint Diagram</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jointDiagram">Upload Joint Diagram</Label>
                <Input
                  id="jointDiagram"
                  name="jointDiagram"
                  type="file"
                  accept="image/*"
                  disabled={loading}
                  className="cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Upload a photo or diagram showing joint configuration (e.g., B-U3-GF, TC-U5-GF)
                </p>
              </div>
              
              {imagePreview && (
                <div className="mt-4">
                  <Label>Preview</Label>
                  <div className="mt-2 flex justify-center">
                    <img 
                      src={imagePreview} 
                      alt="Joint Diagram Preview" 
                      className="max-w-sm h-auto rounded-lg border shadow-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backing & Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backingUsed">Backing</Label>
                  <select
                    id="backingUsed"
                    name="backingUsed"
                    defaultValue={wps?.backingUsed || ''}
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="">Select</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backingType2">Type</Label>
                  <select
                    id="backingType2"
                    name="backingType2"
                    defaultValue={wps?.backingType2 || ''}
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="">Select</option>
                    <option value="Base Metal">Base Metal</option>
                    <option value="Weld Metal">Weld Metal</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Base Metal Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="materialSpec">Material Spec:</Label>
                <Input
                  id="materialSpec"
                  name="materialSpec"
                  placeholder="e.g., ASTM A572 to ASTM A572"
                  defaultValue={wps?.materialSpec || ''}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="materialGroup">Material Group:</Label>
                  <Input
                    id="materialGroup"
                    name="materialGroup"
                    placeholder="e.g., I to I"
                    defaultValue={wps?.materialGroup || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thicknessRange">Thick. Range (mm):</Label>
                  <Input
                    id="thicknessRange"
                    name="thicknessRange"
                    placeholder="e.g., 3 mm to Unlimited"
                    defaultValue={wps?.thicknessRange || ''}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseMetalGroove">Base Metal: Groove:</Label>
                  <Input
                    id="baseMetalGroove"
                    name="baseMetalGroove"
                    placeholder="e.g., With"
                    defaultValue={wps?.baseMetalGroove || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseMetalFillet">Fillet:</Label>
                  <Input
                    id="baseMetalFillet"
                    name="baseMetalFillet"
                    placeholder="e.g., N/A"
                    defaultValue={wps?.baseMetalFillet || ''}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="materialThickness">Material Thick (mm)</Label>
                <Input
                  id="materialThickness"
                  name="materialThickness"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 20"
                  defaultValue={wps?.materialThickness || ''}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filler Metal Tab */}
        <TabsContent value="filler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filler Metal & Shielding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fillerMetalSpec">Filler Metal Specification</Label>
                  <Input
                    id="fillerMetalSpec"
                    name="fillerMetalSpec"
                    placeholder="e.g., AWS A5.1"
                    defaultValue={wps?.fillerMetalSpec || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fillerClass">Filler Metal Classification</Label>
                  <Input
                    id="fillerClass"
                    name="fillerClass"
                    placeholder="e.g., E7018"
                    defaultValue={wps?.fillerClass || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shieldingGas">Shielding Gas</Label>
                  <Input
                    id="shieldingGas"
                    name="shieldingGas"
                    placeholder="e.g., CO2, Ar + 2% O2"
                    defaultValue={wps?.shieldingGas || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flowRate">Flow Rate (L/min)</Label>
                  <Input
                    id="flowRate"
                    name="flowRate"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    defaultValue={wps?.flowRate || ''}
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Electrical Tab */}
        <TabsContent value="electrical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Electrical Characteristics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentType">Current Type</Label>
                <select
                  id="currentType"
                  name="currentType"
                  defaultValue={wps?.currentType || ''}
                  disabled={loading}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">Select Current Type</option>
                  {CURRENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preheatTempMin">Preheat Temp Min (°C)</Label>
                  <Input
                    id="preheatTempMin"
                    name="preheatTempMin"
                    type="number"
                    placeholder="0"
                    defaultValue={wps?.preheatTempMin || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postWeldTemp">Post-Weld Temp (°C)</Label>
                  <Input
                    id="postWeldTemp"
                    name="postWeldTemp"
                    type="number"
                    placeholder="0"
                    defaultValue={wps?.postWeldTemp || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interpassTempMin">Interpass Temp Min (°C)</Label>
                  <Input
                    id="interpassTempMin"
                    name="interpassTempMin"
                    type="number"
                    placeholder="0"
                    defaultValue={wps?.interpassTempMin || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interpassTempMax">Interpass Temp Max (°C)</Label>
                  <Input
                    id="interpassTempMax"
                    name="interpassTempMax"
                    type="number"
                    placeholder="0"
                    defaultValue={wps?.interpassTempMax || ''}
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technique Tab */}
        <TabsContent value="technique" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Welding Technique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <select
                    id="position"
                    name="position"
                    defaultValue={wps?.position || ''}
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="">Select Position</option>
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jointType">Joint Type</Label>
                  <select
                    id="jointType"
                    name="jointType"
                    defaultValue={wps?.jointType || ''}
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="">Select Joint Type</option>
                    {JOINT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grooveAngle">Groove Angle (degrees)</Label>
                  <Input
                    id="grooveAngle"
                    name="grooveAngle"
                    type="number"
                    placeholder="0"
                    defaultValue={wps?.grooveAngle || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rootOpening">Root Opening (mm)</Label>
                  <Input
                    id="rootOpening"
                    name="rootOpening"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    defaultValue={wps?.rootOpening || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backingType">Backing Type</Label>
                  <select
                    id="backingType"
                    name="backingType"
                    defaultValue={wps?.backingType || ''}
                    disabled={loading}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="">Select Backing Type</option>
                    {BACKING_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks / Notes</Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  rows={4}
                  placeholder="Additional notes or special requirements..."
                  defaultValue={wps?.remarks || ''}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Welding Passes Tab */}
        <TabsContent value="passes" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Welding Pass Details</CardTitle>
              <Button type="button" onClick={addPass} disabled={loading} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Pass
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Layer</TableHead>
                      <TableHead>Process</TableHead>
                      <TableHead>Electrode Class</TableHead>
                      <TableHead>Dia. (mm)</TableHead>
                      <TableHead>Polarity</TableHead>
                      <TableHead>Amps</TableHead>
                      <TableHead>Volts</TableHead>
                      <TableHead>Travel (mm/min)</TableHead>
                      <TableHead>Heat (kJ/mm)</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passes.map((pass, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            type="number"
                            value={pass.layerNo}
                            onChange={(e) => updatePass(index, 'layerNo', parseInt(e.target.value))}
                            className="w-16"
                            disabled={loading}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={pass.process}
                            onChange={(e) => updatePass(index, 'process', e.target.value)}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={loading}
                          >
                            {WELDING_PROCESSES.map((proc) => (
                              <option key={proc} value={proc}>
                                {proc}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={pass.electrodeClass}
                            onChange={(e) => updatePass(index, 'electrodeClass', e.target.value)}
                            placeholder="E7018"
                            disabled={loading}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            value={pass.diameter}
                            onChange={(e) => updatePass(index, 'diameter', parseFloat(e.target.value))}
                            className="w-20"
                            disabled={loading}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={pass.polarity}
                            onChange={(e) => updatePass(index, 'polarity', e.target.value)}
                            className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                            disabled={loading}
                          >
                            {POLARITIES.map((pol) => (
                              <option key={pol} value={pol}>
                                {pol}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={pass.amperage}
                            onChange={(e) => updatePass(index, 'amperage', parseInt(e.target.value))}
                            className="w-20"
                            disabled={loading}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={pass.voltage}
                            onChange={(e) => updatePass(index, 'voltage', parseInt(e.target.value))}
                            className="w-20"
                            disabled={loading}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={pass.travelSpeed}
                            onChange={(e) => updatePass(index, 'travelSpeed', parseFloat(e.target.value))}
                            className="w-20"
                            disabled={loading}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={pass.heatInput}
                            onChange={(e) => updatePass(index, 'heatInput', parseFloat(e.target.value))}
                            className="w-20"
                            disabled={loading}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePass(index)}
                            disabled={loading || passes.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {wps ? 'Update WPS' : 'Create WPS'}
        </Button>
      </div>
    </form>
  );
}
