'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const SCOPE_OPTIONS = [
  { id: 'design', label: 'Design' },
  { id: 'shopDrawing', label: 'Detailing' },
  { id: 'fabrication', label: 'Fabrication' },
  { id: 'galvanization', label: 'Galvanization' },
  { id: 'painting', label: 'Painting' },
  { id: 'roofSheeting', label: 'Roof Sheeting' },
  { id: 'wallSheeting', label: 'Wall Sheeting' },
  { id: 'delivery', label: 'Delivery & Logistics' },
  { id: 'erection', label: 'Erection' },
];

type User = { id: string; name: string; position: string | null };

type ProjectFormProps = {
  project: any;
  projectManagers: User[];
  salesEngineers: User[];
};

export function ProjectFormFull({ project, projectManagers, salesEngineers }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Parse existing scope of work into checkboxes
  const getInitialScopes = () => {
    if (!project.scopeOfWork) return SCOPE_OPTIONS.map(opt => ({ ...opt, checked: false }));
    const scopeText = project.scopeOfWork.toLowerCase();
    return SCOPE_OPTIONS.map(opt => ({
      ...opt,
      checked: scopeText.includes(opt.label.toLowerCase())
    }));
  };
  
  const [scopeOfWork, setScopeOfWork] = useState(getInitialScopes());
  
  const generateScopeText = () => {
    const selected = scopeOfWork.filter(item => item.checked).map(item => item.label);
    if (selected.length === 0) return '';
    return `This project includes the following scope of work:\n\n${selected.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    const getString = (key: string) => {
      const val = formData.get(key) as string;
      return val && val.trim() ? val : null;
    };

    const getNumber = (key: string) => {
      const val = formData.get(key) as string;
      return val && val.trim() ? parseFloat(val) : null;
    };

    const getInt = (key: string) => {
      const val = formData.get(key) as string;
      return val && val.trim() ? parseInt(val, 10) : null;
    };

    // Process payment data: convert percentages to amounts and format milestones
    const contractValue = getNumber('contractValue') || 0;
    // Process payment: percentage is stored separately, amount is calculated
    const processPayment = (percentKey: string, amountKey: string, milestoneKey: string) => {
      const percentage = getNumber(percentKey);
      const amount = getNumber(amountKey); // Can be manually entered or auto-calculated
      const milestone = getString(milestoneKey); // Description only, no percentage prefix
      
      // If percentage provided but no amount, calculate it
      const calculatedAmount = percentage && contractValue > 0 
        ? (contractValue * percentage / 100) 
        : amount;
      
      return { percentage, amount: calculatedAmount, milestone };
    };
    
    const downPaymentData = processPayment('downPaymentPercentage', 'downPayment', 'downPaymentMilestone');
    const payment2Data = processPayment('payment2Percentage', 'payment2', 'payment2Milestone');
    const payment3Data = processPayment('payment3Percentage', 'payment3', 'payment3Milestone');
    const payment4Data = processPayment('payment4Percentage', 'payment4', 'payment4Milestone');
    const payment5Data = processPayment('payment5Percentage', 'payment5', 'payment5Milestone');
    const payment6Data = processPayment('payment6Percentage', 'payment6', 'payment6Milestone');

    const data = {
      projectNumber: (formData.get('projectNumber') as string) || undefined,
      estimationNumber: getString('estimationNumber'),
      name: (formData.get('name') as string) || undefined,
      clientName: (formData.get('clientName') as string) || undefined,
      projectManagerId: (formData.get('projectManagerId') as string) || undefined,
      salesEngineerId: getString('salesEngineerId'),
      status: (formData.get('status') as string) || undefined,
      
      // Dates
      contractDate: getString('contractDate'),
      downPaymentDate: getString('downPaymentDate'),
      
      // Financial
      contractValue,
      downPaymentPercentage: downPaymentData.percentage,
      downPayment: downPaymentData.amount,
      downPaymentAck: formData.get('downPaymentAck') === 'on',
      downPaymentMilestone: downPaymentData.milestone,
      payment2Percentage: payment2Data.percentage,
      payment2: payment2Data.amount,
      payment2Ack: formData.get('payment2Ack') === 'on',
      payment2Milestone: payment2Data.milestone,
      payment3Percentage: payment3Data.percentage,
      payment3: payment3Data.amount,
      payment3Ack: formData.get('payment3Ack') === 'on',
      payment3Milestone: payment3Data.milestone,
      payment4Percentage: payment4Data.percentage,
      payment4: payment4Data.amount,
      payment4Ack: formData.get('payment4Ack') === 'on',
      payment4Milestone: payment4Data.milestone,
      payment5Percentage: payment5Data.percentage,
      payment5: payment5Data.amount,
      payment5Ack: formData.get('payment5Ack') === 'on',
      payment5Milestone: payment5Data.milestone,
      payment6Percentage: payment6Data.percentage,
      payment6: payment6Data.amount,
      payment6Ack: formData.get('payment6Ack') === 'on',
      payment6Milestone: payment6Data.milestone,
      preliminaryRetention: getNumber('preliminaryRetention'),
      hoRetention: getNumber('hoRetention'),
      
      // Technical
      structureType: getString('structureType'),
      erectionSubcontractor: getString('erectionSubcontractor'),
      incoterm: getString('incoterm'),
      projectNature: getString('projectNature'),
      projectLocation: getString('projectLocation'),
      engineeringDuration: getInt('engineeringDuration') ? getInt('engineeringDuration')! * 7 : null,
      fabricationDeliveryDuration: getInt('fabricationDeliveryDuration') ? getInt('fabricationDeliveryDuration')! * 7 : null,
      erectionDuration: getInt('erectionDuration') ? getInt('erectionDuration')! * 7 : null,
      cranesIncluded: formData.get('cranesIncluded') === 'on',
      surveyorOurScope: formData.get('surveyorOurScope') === 'on',
      thirdPartyRequired: formData.get('thirdPartyRequired') === 'on',
      thirdPartyResponsibility: getString('thirdPartyResponsibility'),
      contractualTonnage: getNumber('contractualTonnage'),
      
      // Galvanization
      galvanized: formData.get('galvanized') === 'on',
      galvanizationMicrons: getInt('galvanizationMicrons'),
      area: getNumber('area'),
      m2PerTon: getNumber('m2PerTon'),
      
      // Paint
      paintCoat1: getString('paintCoat1'),
      paintCoat1Microns: getInt('paintCoat1Microns'),
      paintCoat1Liters: getNumber('paintCoat1Liters'),
      paintCoat2: getString('paintCoat2'),
      paintCoat2Microns: getInt('paintCoat2Microns'),
      paintCoat2Liters: getNumber('paintCoat2Liters'),
      paintCoat3: getString('paintCoat3'),
      paintCoat3Microns: getInt('paintCoat3Microns'),
      paintCoat3Liters: getNumber('paintCoat3Liters'),
      paintCoat4: getString('paintCoat4'),
      paintCoat4Microns: getInt('paintCoat4Microns'),
      paintCoat4Liters: getNumber('paintCoat4Liters'),
      topCoatRalNumber: getString('topCoatRalNumber'),
      
      thirdPartyRequired: formData.get('thirdPartyRequired') === 'on',
      
      scopeOfWork: generateScopeText(),
      remarks: getString('remarks'),
    };

    try {
      console.log('Submitting data:', data);
      const url = `/api/projects/${project.id}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('API Error:', result);
        console.error('Validation details:', JSON.stringify(result.details, null, 2));
        console.error('Data sent:', JSON.stringify(result.received, null, 2));
        
        // Show detailed error
        const errorMsg = result.details ? 
          `Validation failed: ${JSON.stringify(result.details, null, 2)}` : 
          result.error || 'Failed to save project';
        throw new Error(errorMsg);
      }

      router.push(`/projects/${result.id}`);
      router.refresh();
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="dates">Dates & Durations</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="technical">Technical & Specs</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectNumber">Project Number <span className="text-destructive">*</span></Label>
              <Input id="projectNumber" name="projectNumber" defaultValue={project.projectNumber} required disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimationNumber">Estimation Number</Label>
              <Input id="estimationNumber" name="estimationNumber" defaultValue={project.estimationNumber || ''} disabled={loading} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" defaultValue={project.name} required disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name <span className="text-destructive">*</span></Label>
              <Input id="clientName" name="clientName" defaultValue={project.client?.name || ''} required disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectManagerId">Project Manager <span className="text-destructive">*</span></Label>
              <select id="projectManagerId" name="projectManagerId" required disabled={loading} defaultValue={project.projectManagerId} className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="">Select a manager</option>
                {projectManagers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesEngineerId">Sales Engineer</Label>
              <select id="salesEngineerId" name="salesEngineerId" disabled={loading} defaultValue={project.salesEngineerId || ''} className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="">Select a sales engineer</option>
                {salesEngineers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
              <select id="status" name="status" required disabled={loading} defaultValue={project.status} className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectLocation">Project Location</Label>
              <Input id="projectLocation" name="projectLocation" defaultValue={project.projectLocation || ''} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectNature">Project Nature</Label>
              <Input id="projectNature" name="projectNature" defaultValue={project.projectNature || ''} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="structureType">Structure Type</Label>
              <Input id="structureType" name="structureType" defaultValue={project.structureType || ''} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="erectionSubcontractor">Erection Subcontractor</Label>
              <Input id="erectionSubcontractor" name="erectionSubcontractor" defaultValue={project.erectionSubcontractor || ''} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractualTonnage">Contractual Tonnage (tons)</Label>
              <Input id="contractualTonnage" name="contractualTonnage" type="number" step="0.01" defaultValue={project.contractualTonnage || ''} disabled={loading} placeholder="0.00" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Scope of Work</Label>
              <div className="grid grid-cols-3 gap-3 p-4 border rounded-lg">
                {scopeOfWork.map((scope) => (
                  <div key={scope.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`scope-${scope.id}`}
                      checked={scope.checked}
                      onCheckedChange={(checked) => {
                        setScopeOfWork(scopeOfWork.map(s =>
                          s.id === scope.id ? { ...s, checked: !!checked } : s
                        ));
                      }}
                      disabled={loading}
                    />
                    <Label htmlFor={`scope-${scope.id}`} className="cursor-pointer font-normal">
                      {scope.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Dates & Durations Tab */}
        <TabsContent value="dates" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contractDate">Contract Date</Label>
              <Input id="contractDate" name="contractDate" type="date" defaultValue={project.contractDate?.split('T')[0]} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPaymentDate">Down Payment Date</Label>
              <Input id="downPaymentDate" name="downPaymentDate" type="date" defaultValue={project.downPaymentDate?.split('T')[0]} disabled={loading} />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4">Durations (in weeks)</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="engineeringDuration">Engineering Duration</Label>
                <Input id="engineeringDuration" name="engineeringDuration" type="number" defaultValue={project.engineeringDuration ? Math.round(project.engineeringDuration / 7) : ''} disabled={loading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fabricationDeliveryDuration">Fabrication & Delivery</Label>
                <Input id="fabricationDeliveryDuration" name="fabricationDeliveryDuration" type="number" defaultValue={project.fabricationDeliveryDuration ? Math.round(project.fabricationDeliveryDuration / 7) : ''} disabled={loading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="erectionDuration">Erection Duration</Label>
                <Input id="erectionDuration" name="erectionDuration" type="number" defaultValue={project.erectionDuration ? Math.round(project.erectionDuration / 7) : ''} disabled={loading} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contractValue">Contract Value</Label>
              <Input id="contractValue" name="contractValue" type="number" step="0.01" defaultValue={project.contractValue || ''} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incoterm">Incoterm</Label>
              <select id="incoterm" name="incoterm" disabled={loading} defaultValue={project.incoterm || ''} className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="">Select Incoterm</option>
                <option value="EXW">EXW - Ex Works</option>
                <option value="FCA">FCA - Free Carrier</option>
                <option value="CPT">CPT - Carriage Paid To</option>
                <option value="CIP">CIP - Carriage and Insurance Paid To</option>
                <option value="DAP">DAP - Delivered At Place</option>
                <option value="DPU">DPU - Delivered at Place Unloaded</option>
                <option value="DDP">DDP - Delivered Duty Paid</option>
                <option value="FAS">FAS - Free Alongside Ship</option>
                <option value="FOB">FOB - Free On Board</option>
                <option value="CFR">CFR - Cost and Freight</option>
                <option value="CIF">CIF - Cost, Insurance and Freight</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4">Payments</h3>
            <div className="grid gap-4">
              {[
                { key: 'downPayment', percentKey: 'downPaymentPercentage', label: 'Down Payment', ack: 'downPaymentAck', milestone: 'downPaymentMilestone' },
                { key: 'payment2', percentKey: 'payment2Percentage', label: 'Payment 2', ack: 'payment2Ack', milestone: 'payment2Milestone' },
                { key: 'payment3', percentKey: 'payment3Percentage', label: 'Payment 3', ack: 'payment3Ack', milestone: 'payment3Milestone' },
                { key: 'payment4', percentKey: 'payment4Percentage', label: 'Payment 4', ack: 'payment4Ack', milestone: 'payment4Milestone' },
                { key: 'payment5', percentKey: 'payment5Percentage', label: 'Payment 5', ack: 'payment5Ack', milestone: 'payment5Milestone' },
                { key: 'payment6', percentKey: 'payment6Percentage', label: 'Payment 6', ack: 'payment6Ack', milestone: 'payment6Milestone' },
              ].map((payment) => (
                <div key={payment.key} className="p-4 border rounded-lg space-y-3">
                  <div className="grid gap-4 md:grid-cols-[1fr,1fr,auto] items-end">
                    <div className="space-y-2">
                      <Label htmlFor={payment.percentKey}>{payment.label} Percentage (%)</Label>
                      <Input 
                        id={payment.percentKey} 
                        name={payment.percentKey} 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        max="100" 
                        defaultValue={(project as any)[payment.percentKey] || ''} 
                        disabled={loading} 
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={payment.key}>Amount (calculated)</Label>
                      <Input 
                        id={payment.key} 
                        name={payment.key} 
                        type="number" 
                        step="0.01" 
                        defaultValue={(project as any)[payment.key] || ''} 
                        disabled={loading} 
                        placeholder="Auto-calculated from %"
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pb-2">
                      <Checkbox id={payment.ack} name={payment.ack} defaultChecked={(project as any)[payment.ack]} disabled={loading} />
                      <Label htmlFor={payment.ack} className="text-sm font-normal cursor-pointer">Acknowledged</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={payment.milestone}>Payment Milestone / Condition</Label>
                    <Input 
                      id={payment.milestone} 
                      name={payment.milestone} 
                      defaultValue={(project as any)[payment.milestone] || ''} 
                      disabled={loading} 
                      placeholder="e.g., Against preparation of shop drawings"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4">Retentions</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preliminaryRetention">Preliminary Retention</Label>
                <Input id="preliminaryRetention" name="preliminaryRetention" type="number" step="0.01" defaultValue={project.preliminaryRetention || ''} disabled={loading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hoRetention">H.O Retention</Label>
                <Input id="hoRetention" name="hoRetention" type="number" step="0.01" defaultValue={project.hoRetention || ''} disabled={loading} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Technical & Specs Tab */}
        <TabsContent value="technical" className="space-y-4 mt-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="cranesIncluded" name="cranesIncluded" defaultChecked={project.cranesIncluded} disabled={loading} />
              <Label htmlFor="cranesIncluded" className="cursor-pointer">Cranes Included</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="surveyorOurScope" name="surveyorOurScope" defaultChecked={project.surveyorOurScope} disabled={loading} />
              <Label htmlFor="surveyorOurScope" className="cursor-pointer">Surveyor Our Scope</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="thirdPartyRequired" name="thirdPartyRequired" defaultChecked={project.thirdPartyRequired} disabled={loading} />
              <Label htmlFor="thirdPartyRequired" className="cursor-pointer">3rd Party Testing Required</Label>
            </div>

            <div className="ml-6 space-y-2">
              <Label htmlFor="thirdPartyResponsibility">3rd Party Responsibility</Label>
              <select
                id="thirdPartyResponsibility"
                name="thirdPartyResponsibility"
                defaultValue={project.thirdPartyResponsibility || 'our'}
                disabled={loading}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="our">Our Responsibility</option>
                <option value="customer">Customer Responsibility</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4">Galvanization</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="galvanized" name="galvanized" defaultChecked={project.galvanized} disabled={loading} />
                <Label htmlFor="galvanized" className="cursor-pointer">Galvanized</Label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="galvanizationMicrons">Microns</Label>
                  <Input id="galvanizationMicrons" name="galvanizationMicrons" type="number" defaultValue={project.galvanizationMicrons || ''} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area (m²)</Label>
                  <Input id="area" name="area" type="number" step="0.01" defaultValue={project.area || ''} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="m2PerTon">m²/Ton</Label>
                  <Input id="m2PerTon" name="m2PerTon" type="number" step="0.01" defaultValue={project.m2PerTon || ''} disabled={loading} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4">Paint Specifications</h3>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Coat {num}</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`paintCoat${num}`}>Paint Type</Label>
                      <Input id={`paintCoat${num}`} name={`paintCoat${num}`} defaultValue={(project as any)[`paintCoat${num}`] || ''} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`paintCoat${num}Microns`}>Microns</Label>
                      <Input id={`paintCoat${num}Microns`} name={`paintCoat${num}Microns`} type="number" defaultValue={(project as any)[`paintCoat${num}Microns`] || ''} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`paintCoat${num}Liters`}>Liters</Label>
                      <Input id={`paintCoat${num}Liters`} name={`paintCoat${num}Liters`} type="number" step="0.01" defaultValue={(project as any)[`paintCoat${num}Liters`] || ''} disabled={loading} />
                    </div>
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="topCoatRalNumber">Top Coat RAL Number</Label>
                <Input id="topCoatRalNumber" name="topCoatRalNumber" defaultValue={project.topCoatRalNumber || ''} disabled={loading} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" name="remarks" defaultValue={project.remarks || ''} disabled={loading} rows={3} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-4 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Update Project
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
