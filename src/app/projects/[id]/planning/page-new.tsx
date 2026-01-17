'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Save,
  Loader2,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';

type ProjectPlan = {
  id: string;
  phase: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  plannedDuration: number | null;
  responsibleDept: string | null;
  status: string;
  progress: number;
  project: {
    projectNumber: string;
    name: string;
  };
};

type PhaseForm = {
  enabled: boolean;
  plannedStart: string;
  plannedEnd: string;
  plannedDuration: string;
  responsibleDept: string;
};

const ALL_PHASES = [
  'Design',
  'Detailing',
  'Procurement',
  'Fabrication',
  'Coating',
  'Delivery',
  'Erection',
];

const PHASE_COLORS: Record<string, string> = {
  Design: 'bg-blue-100 border-blue-300',
  'Detailing': 'bg-indigo-100 border-indigo-300',
  Procurement: 'bg-amber-100 border-amber-300',
  Fabrication: 'bg-emerald-100 border-emerald-300',
  Coating: 'bg-orange-100 border-orange-300',
  Delivery: 'bg-purple-100 border-purple-300',
  Erection: 'bg-red-100 border-red-300',
};

export default function ProjectPlanningPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [plans, setPlans] = useState<ProjectPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectInfo, setProjectInfo] = useState<{ projectNumber: string; name: string } | null>(null);

  const [phasesForms, setPhasesForms] = useState<Record<string, PhaseForm>>({
    Design: { enabled: false, plannedStart: '', plannedEnd: '', plannedDuration: '', responsibleDept: '' },
    'Detailing': { enabled: false, plannedStart: '', plannedEnd: '', plannedDuration: '', responsibleDept: '' },
    Procurement: { enabled: false, plannedStart: '', plannedEnd: '', plannedDuration: '', responsibleDept: '' },
    Fabrication: { enabled: false, plannedStart: '', plannedEnd: '', plannedDuration: '', responsibleDept: '' },
    Coating: { enabled: false, plannedStart: '', plannedEnd: '', plannedDuration: '', responsibleDept: '' },
    Delivery: { enabled: false, plannedStart: '', plannedEnd: '', plannedDuration: '', responsibleDept: '' },
    Erection: { enabled: false, plannedStart: '', plannedEnd: '', plannedDuration: '', responsibleDept: '' },
  });

  useEffect(() => {
    fetchPlans();
  }, [projectId]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`/api/planning/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
        
        if (data.length > 0) {
          setProjectInfo({
            projectNumber: data[0].project.projectNumber,
            name: data[0].project.name,
          });
          
          // Populate form with existing data
          const newForms = { ...phasesForms };
          data.forEach((plan: ProjectPlan) => {
            newForms[plan.phase] = {
              enabled: true,
              plannedStart: plan.plannedStart ? new Date(plan.plannedStart).toISOString().split('T')[0] : '',
              plannedEnd: plan.plannedEnd ? new Date(plan.plannedEnd).toISOString().split('T')[0] : '',
              plannedDuration: plan.plannedDuration?.toString() || '',
              responsibleDept: plan.responsibleDept || '',
            };
          });
          setPhasesForms(newForms);
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseToggle = (phase: string) => {
    setPhasesForms({
      ...phasesForms,
      [phase]: {
        ...phasesForms[phase],
        enabled: !phasesForms[phase].enabled,
      },
    });
  };

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleDateChange = (phase: string, field: 'plannedStart' | 'plannedEnd', value: string) => {
    const updatedForm = {
      ...phasesForms[phase],
      [field]: value,
    };
    
    // Auto-calculate duration
    if (updatedForm.plannedStart && updatedForm.plannedEnd) {
      updatedForm.plannedDuration = calculateDuration(updatedForm.plannedStart, updatedForm.plannedEnd).toString();
    }
    
    setPhasesForms({
      ...phasesForms,
      [phase]: updatedForm,
    });
  };

  const handleFieldChange = (phase: string, field: keyof PhaseForm, value: string) => {
    setPhasesForms({
      ...phasesForms,
      [phase]: {
        ...phasesForms[phase],
        [field]: value,
      },
    });
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      
      const enabledPhases = Object.entries(phasesForms)
        .filter(([_, form]) => form.enabled)
        .map(([phase]) => phase);
      
      if (enabledPhases.length === 0) {
        alert('Please select at least one phase');
        return;
      }
      
      // If no plans exist, initialize first
      if (plans.length === 0) {
        const initResponse = await fetch(`/api/planning/init/${projectId}`, {
          method: 'POST',
        });
        
        if (!initResponse.ok) {
          const data = await initResponse.json();
          alert(`Failed to initialize: ${data.error}`);
          return;
        }
        
        // Fetch the newly created plans
        const plansResponse = await fetch(`/api/planning/${projectId}`);
        const newPlans = await plansResponse.json();
        setPlans(newPlans);
        
        // Now update each phase with the form data
        for (const plan of newPlans) {
          const form = phasesForms[plan.phase];
          if (form && form.enabled) {
            await fetch(`/api/planning/${projectId}/${plan.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                plannedStart: form.plannedStart || null,
                plannedEnd: form.plannedEnd || null,
                plannedDuration: form.plannedDuration ? parseInt(form.plannedDuration) : null,
                responsibleDept: form.responsibleDept || null,
              }),
            });
          }
        }
      } else {
        // Update existing plans
        for (const plan of plans) {
          const form = phasesForms[plan.phase];
          if (form && form.enabled) {
            await fetch(`/api/planning/${projectId}/${plan.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                plannedStart: form.plannedStart || null,
                plannedEnd: form.plannedEnd || null,
                plannedDuration: form.plannedDuration ? parseInt(form.plannedDuration) : null,
                responsibleDept: form.responsibleDept || null,
              }),
            });
          }
        }
      }
      
      alert('Project plan saved successfully!');
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save project plan');
    } finally {
      setSaving(false);
    }
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Calendar className="h-8 w-8" />
              Project Planning
            </h1>
            {projectInfo && (
              <p className="text-muted-foreground mt-1">
                {projectInfo.projectNumber} - {projectInfo.name}
              </p>
            )}
          </div>
          <Button onClick={handleSaveAll} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Project Plan
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Quick Setup</p>
                <p className="text-sm text-blue-700 mt-1">
                  1. Check the phases applicable to this project<br />
                  2. Fill in the planned dates and responsible department for each phase<br />
                  3. Duration will be calculated automatically<br />
                  4. Click "Save Project Plan" to create/update all phases at once
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phases Form */}
        <Card>
          <CardHeader>
            <CardTitle>Define Project Phases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ALL_PHASES.map((phase) => (
                <div
                  key={phase}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    phasesForms[phase].enabled
                      ? PHASE_COLORS[phase] || 'bg-gray-100 border-gray-300'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  {/* Phase Header with Checkbox */}
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      checked={phasesForms[phase].enabled}
                      onChange={() => handlePhaseToggle(phase)}
                      className="w-5 h-5 rounded"
                    />
                    <CheckSquare className="h-5 w-5" />
                    <span className="text-lg font-semibold">{phase}</span>
                  </div>

                  {/* Phase Fields */}
                  {phasesForms[phase].enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 ml-8">
                      <div className="space-y-2">
                        <Label htmlFor={`${phase}-start`}>Planned Start</Label>
                        <Input
                          id={`${phase}-start`}
                          type="date"
                          value={phasesForms[phase].plannedStart}
                          onChange={(e) => handleDateChange(phase, 'plannedStart', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${phase}-end`}>Planned End</Label>
                        <Input
                          id={`${phase}-end`}
                          type="date"
                          value={phasesForms[phase].plannedEnd}
                          onChange={(e) => handleDateChange(phase, 'plannedEnd', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${phase}-duration`}>Duration (Days)</Label>
                        <Input
                          id={`${phase}-duration`}
                          type="number"
                          value={phasesForms[phase].plannedDuration}
                          onChange={(e) => handleFieldChange(phase, 'plannedDuration', e.target.value)}
                          placeholder="Auto-calculated"
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${phase}-dept`}>Responsible Dept</Label>
                        <Input
                          id={`${phase}-dept`}
                          value={phasesForms[phase].responsibleDept}
                          onChange={(e) => handleFieldChange(phase, 'responsibleDept', e.target.value)}
                          placeholder="e.g., Engineering"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save Button at Bottom */}
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveAll} disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Project Plan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
