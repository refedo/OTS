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
  
  // Form state
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
    
    const data = {
      wpsNumber,
      revision: parseInt(formData.get('revision') as string) || 0,
      projectId: selectedProject,
      type: formData.get('type') as string,
      weldingProcess,
      supportingPQR: formData.get('supportingPQR') as string || null,
      baseMaterial: formData.get('baseMaterial') as string || null,
      thicknessGroove: parseFloat(formData.get('thicknessGroove') as string) || null,
      thicknessFillet: parseFloat(formData.get('thicknessFillet') as string) || null,
      diameter: parseFloat(formData.get('diameter') as string) || null,
      fillerMetalSpec: formData.get('fillerMetalSpec') as string || null,
      fillerClass: formData.get('fillerClass') as string || null,
      shieldingGas: formData.get('shieldingGas') as string || null,
      flowRate: parseFloat(formData.get('flowRate') as string) || null,
      currentType: formData.get('currentType') as string || null,
      preheatTempMin: parseInt(formData.get('preheatTempMin') as string) || null,
      interpassTempMin: parseInt(formData.get('interpassTempMin') as string) || null,
      interpassTempMax: parseInt(formData.get('interpassTempMax') as string) || null,
      postWeldTemp: parseInt(formData.get('postWeldTemp') as string) || null,
      position: formData.get('position') as string || null,
      jointType: formData.get('jointType') as string || null,
      grooveAngle: parseInt(formData.get('grooveAngle') as string) || null,
      rootOpening: parseFloat(formData.get('rootOpening') as string) || null,
      backingType: formData.get('backingType') as string || null,
      remarks: formData.get('remarks') as string || null,
      approvedById: formData.get('approvedById') as string || null,
      clientApprovedBy: formData.get('clientApprovedBy') as string || null,
    };

    try {
      // Create/Update WPS
      const wpsResponse = await fetch(wps ? `/api/wps/${wps.id}` : '/api/wps', {
        method: wps ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!wpsResponse.ok) {
        const errorData = await wpsResponse.json();
        throw new Error(errorData.error || 'Failed to save WPS');
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
              <CardTitle>Base Metal Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseMaterial">Base Material</Label>
                <Input
                  id="baseMaterial"
                  name="baseMaterial"
                  placeholder="e.g., ASTM A36 to ASTM A36"
                  defaultValue={wps?.baseMaterial || ''}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thicknessGroove">Thickness - Groove (in)</Label>
                  <Input
                    id="thicknessGroove"
                    name="thicknessGroove"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={wps?.thicknessGroove || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thicknessFillet">Thickness - Fillet (in)</Label>
                  <Input
                    id="thicknessFillet"
                    name="thicknessFillet"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={wps?.thicknessFillet || ''}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diameter">Diameter (in)</Label>
                  <Input
                    id="diameter"
                    name="diameter"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={wps?.diameter || ''}
                    disabled={loading}
                  />
                </div>
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
                  <Label htmlFor="flowRate">Flow Rate (CFH)</Label>
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
                  <Label htmlFor="preheatTempMin">Preheat Temp Min (°F)</Label>
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
                  <Label htmlFor="postWeldTemp">Post-Weld Temp (°F)</Label>
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
                  <Label htmlFor="interpassTempMin">Interpass Temp Min (°F)</Label>
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
                  <Label htmlFor="interpassTempMax">Interpass Temp Max (°F)</Label>
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
                  <Label htmlFor="rootOpening">Root Opening (in)</Label>
                  <Input
                    id="rootOpening"
                    name="rootOpening"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
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
                      <TableHead>Dia. (in)</TableHead>
                      <TableHead>Polarity</TableHead>
                      <TableHead>Amps</TableHead>
                      <TableHead>Volts</TableHead>
                      <TableHead>Travel (in/min)</TableHead>
                      <TableHead>Heat (kJ/in)</TableHead>
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
