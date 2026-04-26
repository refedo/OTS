'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  GripVertical, Save, X, Check, AlertCircle, Power, PowerOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowStep {
  id?: string;
  sequence: number;
  name: string;
  approverResolver: Record<string, unknown>;
  minApprovals: number;
  slaHours: number | null;
  onRejectBehavior: 'RETURN_PREVIOUS' | 'RESTART' | 'TERMINATE';
  conditions: unknown[] | null;
}

interface WorkflowDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  entityType: string;
  version: number;
  isActive: boolean;
  siteId: string | null;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  canManage: boolean;
}

// ─── Resolver type display ────────────────────────────────────────────────────

const RESOLVER_TYPES = [
  { value: 'ROLE', label: 'By Role' },
  { value: 'PBAC_PERMISSION', label: 'By Permission' },
  { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
  { value: 'MANAGER_OF_INITIATOR', label: 'Manager of Initiator' },
  { value: 'FIXED_USER', label: 'Fixed User' },
  { value: 'AMOUNT_BAND', label: 'Amount Band' },
] as const;

function resolverSummary(resolver: Record<string, unknown>): string {
  const type = resolver.type as string;
  switch (type) {
    case 'ROLE':             return `Role: ${resolver.role}`;
    case 'PBAC_PERMISSION':  return `Permission: ${resolver.permission}`;
    case 'DEPARTMENT_HEAD':  return 'Department Head';
    case 'MANAGER_OF_INITIATOR': return 'Manager of Initiator';
    case 'FIXED_USER':       return `User: ${resolver.userId}`;
    case 'AMOUNT_BAND':      return `Amount band on "${resolver.field}"`;
    default:                 return type ?? 'Unknown';
  }
}

// ─── Step editor row ─────────────────────────────────────────────────────────

interface StepRowProps {
  step: WorkflowStep;
  index: number;
  onChange: (index: number, step: WorkflowStep) => void;
  onRemove: (index: number) => void;
  canManage: boolean;
}

function StepRow({ step, index, onChange, onRemove, canManage }: StepRowProps) {
  const [resolverJson, setResolverJson] = useState(JSON.stringify(step.approverResolver, null, 2));
  const [jsonError, setJsonError] = useState('');

  const update = (field: keyof WorkflowStep, value: unknown) => {
    onChange(index, { ...step, [field]: value });
  };

  const handleResolverChange = (val: string) => {
    setResolverJson(val);
    try {
      const parsed = JSON.parse(val);
      setJsonError('');
      update('approverResolver', parsed);
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const resolverType = (step.approverResolver.type as string) ?? '';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
        <span className="text-xs font-bold text-slate-500 w-6">#{step.sequence}</span>
        <Input
          value={step.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Step name"
          className="flex-1 h-8 text-sm"
          disabled={!canManage}
        />
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-500 hover:text-rose-700 h-8 px-2"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Resolver type</label>
          <Select
            value={resolverType}
            onValueChange={val => {
              const base: Record<string, unknown> = { type: val };
              if (val === 'ROLE') base.role = '';
              if (val === 'PBAC_PERMISSION') base.permission = '';
              if (val === 'FIXED_USER') base.userId = '';
              if (val === 'AMOUNT_BAND') base.field = 'amount';
              update('approverResolver', base);
              setResolverJson(JSON.stringify(base, null, 2));
            }}
            disabled={!canManage}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {RESOLVER_TYPES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Min approvals</label>
          <Input
            type="number"
            min={1}
            value={step.minApprovals}
            onChange={e => update('minApprovals', parseInt(e.target.value) || 1)}
            className="h-8 text-sm"
            disabled={!canManage}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">SLA (hours)</label>
          <Input
            type="number"
            min={1}
            value={step.slaHours ?? ''}
            onChange={e => update('slaHours', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="No SLA"
            className="h-8 text-sm"
            disabled={!canManage}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">On reject</label>
          <Select
            value={step.onRejectBehavior}
            onValueChange={val => update('onRejectBehavior', val)}
            disabled={!canManage}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RETURN_PREVIOUS">Return to previous step</SelectItem>
              <SelectItem value="RESTART">Restart from step 1</SelectItem>
              <SelectItem value="TERMINATE">Terminate (rejected)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Resolver config (JSON)</label>
          <Textarea
            value={resolverJson}
            onChange={e => handleResolverChange(e.target.value)}
            rows={3}
            className="text-xs font-mono"
            disabled={!canManage}
          />
          {jsonError && <p className="text-xs text-rose-500">{jsonError}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Definition form dialog ───────────────────────────────────────────────────

interface DefinitionFormProps {
  initial: Partial<WorkflowDefinition> | null;
  onClose: () => void;
  onSave: () => void;
}

function DefinitionForm({ initial, onClose, onSave }: DefinitionFormProps) {
  const isEdit = !!initial?.id;
  const [key, setKey] = useState(initial?.key ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [entityType, setEntityType] = useState(initial?.entityType ?? '');
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initial?.steps ?? [{ sequence: 1, name: '', approverResolver: { type: 'ROLE', role: '' }, minApprovals: 1, slaHours: null, onRejectBehavior: 'RETURN_PREVIOUS', conditions: null }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addStep = () => {
    setSteps(prev => [...prev, {
      sequence: prev.length + 1,
      name: '',
      approverResolver: { type: 'ROLE', role: '' },
      minApprovals: 1,
      slaHours: null,
      onRejectBehavior: 'RETURN_PREVIOUS',
      conditions: null,
    }]);
  };

  const updateStep = (index: number, step: WorkflowStep) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...step, sequence: i + 1 } : s));
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequence: i + 1 })));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      let res: Response;
      if (isEdit) {
        // Update definition metadata
        res = await fetch(`/api/workflow/definitions/${initial!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description: description || undefined }),
        });
        if (res.ok) {
          // Replace steps
          res = await fetch(`/api/workflow/definitions/${initial!.id}/steps`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps }),
          });
        }
      } else {
        res = await fetch('/api/workflow/definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, name, description: description || undefined, entityType, steps }),
        });
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'New'} Workflow Definition</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Key <span className="text-slate-400">(UPPER_SNAKE)</span></label>
              <Input
                value={key}
                onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                placeholder="IMS_REVISION_APPROVAL"
                disabled={isEdit}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Entity type</label>
              <Input
                value={entityType}
                onChange={e => setEntityType(e.target.value)}
                placeholder="IMS_DOCUMENT"
                disabled={isEdit}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="IMS Revision Approval" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description…" />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Steps ({steps.length})</p>
              <Button variant="outline" size="sm" onClick={addStep} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add step
              </Button>
            </div>
            {steps.map((step, idx) => (
              <StepRow
                key={idx}
                step={step}
                index={idx}
                onChange={updateStep}
                onRemove={removeStep}
                canManage
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleSave}
            disabled={saving || !key || !name || !entityType || steps.length === 0}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkflowDefinitionsClient({ canManage }: Props) {
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkflowDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowDefinition | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflow/definitions?active=false');
      if (res.ok) setDefinitions(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDefinitions(); }, [fetchDefinitions]);

  const handleToggleActive = async (def: WorkflowDefinition) => {
    await fetch(`/api/workflow/definitions/${def.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !def.isActive }),
    });
    fetchDefinitions();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/workflow/definitions/${deleteTarget.id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    fetchDefinitions();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <GitBranch className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Workflow Definitions</h1>
              </div>
              {canManage && (
                <Button
                  className="bg-white text-violet-700 hover:bg-violet-50 shadow"
                  onClick={() => { setEditTarget(null); setShowForm(true); }}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> New Definition
                </Button>
              )}
            </div>
            <p className="text-violet-100 text-sm">
              Configure multi-step approval flows for IMS, Procurement, HR, and any other module.
            </p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: definitions.length, color: 'violet' },
            { label: 'Active', value: definitions.filter(d => d.isActive).length, color: 'emerald' },
            { label: 'Inactive', value: definitions.filter(d => !d.isActive).length, color: 'slate' },
            { label: 'Entity types', value: new Set(definitions.map(d => d.entityType)).size, color: 'sky' },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-xl border p-4 shadow-sm bg-gradient-to-b from-${kpi.color}-50 to-white border-${kpi.color}-200`}>
              <p className={`text-xs font-medium uppercase tracking-wide text-${kpi.color}-600`}>{kpi.label}</p>
              <p className={`text-2xl font-bold text-${kpi.color}-700 mt-1`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-slate-700">All Definitions</h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
          ) : definitions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No workflow definitions yet.</p>
              {canManage && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => { setEditTarget(null); setShowForm(true); }}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Create the first one
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {definitions.map(def => (
                <li key={def.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800">{def.name}</span>
                        <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{def.key}</code>
                        <Badge className={def.isActive
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                        }>
                          {def.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-slate-400">v{def.version}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Entity: <span className="font-mono text-slate-700">{def.entityType}</span>
                        {' · '}{def.steps.length} step{def.steps.length !== 1 ? 's' : ''}
                      </p>
                      {def.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{def.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-slate-400"
                        onClick={() => setExpandedId(expandedId === def.id ? null : def.id)}
                      >
                        {expandedId === def.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-slate-400 hover:text-slate-700"
                            onClick={() => handleToggleActive(def)}
                            title={def.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {def.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-slate-400 hover:text-slate-700"
                            onClick={() => { setEditTarget(def); setShowForm(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-rose-400 hover:text-rose-600"
                            onClick={() => setDeleteTarget(def)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded steps */}
                  {expandedId === def.id && def.steps.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {def.steps.map(step => (
                        <div key={step.sequence} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                          <span className="text-xs font-bold text-slate-400 w-5 shrink-0">#{step.sequence}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-700">{step.name}</p>
                            <p className="text-xs text-slate-400">
                              {resolverSummary(step.approverResolver)}
                              {' · '}{step.minApprovals} approval{step.minApprovals !== 1 ? 's' : ''}
                              {step.slaHours ? ` · ${step.slaHours}h SLA` : ''}
                              {' · on-reject: '}{step.onRejectBehavior.toLowerCase().replace(/_/g, ' ')}
                            </p>
                          </div>
                          {step.conditions && (Array.isArray(step.conditions) && step.conditions.length > 0) && (
                            <span className="text-xs bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded shrink-0">
                              conditional
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Form dialog */}
      {showForm && (
        <DefinitionForm
          initial={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSave={() => { setShowForm(false); setEditTarget(null); fetchDefinitions(); }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow definition?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be soft-deleted. Active workflow instances will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
