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

const PHASE_BAR_COLORS: Record<string, string> = {
  Design: 'bg-blue-500',
  'Detailing': 'bg-indigo-500',
  Procurement: 'bg-amber-500',
  Fabrication: 'bg-emerald-500',
  Coating: 'bg-orange-500',
  Delivery: 'bg-purple-500',
  Erection: 'bg-red-500',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSelectAll = () => {
    const newForms = { ...phasesForms };
    ALL_PHASES.forEach((phase) => {
      newForms[phase] = {
        ...newForms[phase],
        enabled: true,
      };
    });
    setPhasesForms(newForms);
  };

  const handleDeselectAll = () => {
    const newForms = { ...phasesForms };
    ALL_PHASES.forEach((phase) => {
      newForms[phase] = {
        ...newForms[phase],
        enabled: false,
      };
    });
    setPhasesForms(newForms);
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

  const getTimelineData = () => {
    const enabledPhases = Object.entries(phasesForms)
      .filter(([_, form]) => form.enabled && form.plannedStart && form.plannedEnd)
      .map(([phase, form]) => ({
        phase,
        start: new Date(form.plannedStart),
        end: new Date(form.plannedEnd),
        duration: parseInt(form.plannedDuration) || 0,
      }));

    if (enabledPhases.length === 0) return null;

    // Find overall project start and end
    const allDates = enabledPhases.flatMap(p => [p.start, p.end]);
    const projectStart = new Date(Math.min(...allDates.map(d => d.getTime())));
    const projectEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

    return {
      phases: enabledPhases,
      projectStart,
      projectEnd,
      totalDays,
    };
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

        {/* Gantt Chart Timeline */}
        {(() => {
          const timeline = getTimelineData();
          if (!timeline) return null;

          return (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Project Timeline (Gantt Chart)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total Duration: {timeline.totalDays} days ({timeline.projectStart.toLocaleDateString()} - {timeline.projectEnd.toLocaleDateString()})
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeline.phases.map(({ phase, start, end, duration }) => {
                    const daysSinceStart = Math.ceil((start.getTime() - timeline.projectStart.getTime()) / (1000 * 60 * 60 * 24));
                    const leftPercent = (daysSinceStart / timeline.totalDays) * 100;
                    const widthPercent = (duration / timeline.totalDays) * 100;

                    return (
                      <div key={phase} className="relative">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-medium w-32 truncate">{phase}</span>
                          <span className="text-xs text-muted-foreground">
                            {start.toLocaleDateString()} - {end.toLocaleDateString()} ({duration} days)
                          </span>
                        </div>
                        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                          {/* Timeline bar */}
                          <div
                            className={`absolute h-full ${PHASE_BAR_COLORS[phase] || 'bg-gray-500'} rounded transition-all flex items-center justify-center text-white text-xs font-medium`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                          >
                            {widthPercent > 10 && `${duration}d`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline scale */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Start: {timeline.projectStart.toLocaleDateString()}</span>
                    <span>End: {timeline.projectEnd.toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Define Project Phases</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {Object.values(phasesForms).filter(f => f.enabled).length} of {ALL_PHASES.length} phases selected
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                type="button"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                type="button"
              >
                Deselect All
              </Button>
            </div>
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
