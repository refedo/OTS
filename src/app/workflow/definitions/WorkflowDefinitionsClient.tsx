'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  GripVertical, Save, X, AlertCircle, Power, PowerOff, Search,
  ChevronRight, Users, ClipboardCheck, TrendingUp, Package,
  Layers, FileText, Wrench, Zap, CheckCircle2,
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
import { PERMISSIONS, ALL_PERMISSIONS } from '@/lib/permissions';

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

// ─── Module presets ──────────────────────────────────────────────────────────

interface ModulePreset {
  id: string;
  name: string;
  description: string;
  key: string;
  entityType: string;
  isLive: boolean; // already wired in module code
}

interface ModuleCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  presets: ModulePreset[];
}

const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    id: 'hr',
    name: 'HR',
    icon: <Users className="h-4 w-4" />,
    color: 'violet',
    presets: [
      { id: 'hr-loan', name: 'Employee Loan Approval', description: 'Approve employee loan requests', key: 'hr-loan-approval', entityType: 'Loan', isLive: true },
      { id: 'hr-leave', name: 'Leave Request Approval', description: 'Approve employee leave requests', key: 'HR_LEAVE_APPROVAL', entityType: 'LeaveRequest', isLive: false },
      { id: 'hr-eos', name: 'End of Service Approval', description: 'Approve end-of-service settlements', key: 'HR_END_OF_SERVICE', entityType: 'EndOfService', isLive: false },
      { id: 'hr-salary', name: 'Salary Revision Approval', description: 'Approve salary change requests', key: 'HR_SALARY_REVISION', entityType: 'SalaryHistory', isLive: false },
    ],
  },
  {
    id: 'qc',
    name: 'QC / Inspection',
    icon: <ClipboardCheck className="h-4 w-4" />,
    color: 'sky',
    presets: [
      { id: 'itp', name: 'ITP Document Approval', description: 'Approve Inspection & Test Plans before release', key: 'ITP_DOCUMENT_APPROVAL', entityType: 'ITP_DOCUMENT', isLive: false },
      { id: 'wps', name: 'WPS Document Approval', description: 'Approve Welding Procedure Specifications', key: 'WPS_DOCUMENT_APPROVAL', entityType: 'WPS_DOCUMENT', isLive: false },
      { id: 'ncr', name: 'NCR Approval', description: 'Approve Non-Conformance Reports', key: 'QC_NCR_APPROVAL', entityType: 'NCR', isLive: false },
      { id: 'rfi', name: 'RFI Approval', description: 'Approve Requests for Information', key: 'QC_RFI_APPROVAL', entityType: 'RFI', isLive: false },
    ],
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    icon: <Package className="h-4 w-4" />,
    color: 'amber',
    presets: [
      { id: 'lcr', name: 'Purchase Order Approval', description: 'Approve purchase orders before issuing', key: 'SUPPLY_CHAIN_PO_APPROVAL', entityType: 'PurchaseOrder', isLive: false },
      { id: 'lcr-contract', name: 'Supplier Contract Approval', description: 'Approve supplier contracts', key: 'SUPPLY_CHAIN_CONTRACT_APPROVAL', entityType: 'SupplierContract', isLive: false },
    ],
  },
  {
    id: 'financial',
    name: 'Financial',
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'emerald',
    presets: [
      { id: 'invoice', name: 'Invoice Approval', description: 'Approve outgoing invoices', key: 'FINANCIAL_INVOICE_APPROVAL', entityType: 'Invoice', isLive: false },
      { id: 'payment', name: 'Payment Approval', description: 'Approve payment transactions', key: 'FINANCIAL_PAYMENT_APPROVAL', entityType: 'Payment', isLive: false },
      { id: 'journal', name: 'Journal Entry Approval', description: 'Approve manual journal entries', key: 'FINANCIAL_JOURNAL_APPROVAL', entityType: 'JournalEntry', isLive: false },
    ],
  },
  {
    id: 'production',
    name: 'Production',
    icon: <Wrench className="h-4 w-4" />,
    color: 'orange',
    presets: [
      { id: 'work-order', name: 'Work Order Approval', description: 'Approve production work orders', key: 'PRODUCTION_WORK_ORDER_APPROVAL', entityType: 'WorkOrder', isLive: false },
      { id: 'dispatch', name: 'Dispatch Approval', description: 'Approve material dispatch reports', key: 'PRODUCTION_DISPATCH_APPROVAL', entityType: 'DispatchReport', isLive: false },
    ],
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: <FileText className="h-4 w-4" />,
    color: 'indigo',
    presets: [
      { id: 'doc-revision', name: 'Document Revision Approval', description: 'Approve document revisions', key: 'DOCUMENT_REVISION_APPROVAL', entityType: 'Document', isLive: false },
      { id: 'doc-submission', name: 'Document Submission Approval', description: 'Approve external document submissions', key: 'DOCUMENT_SUBMISSION_APPROVAL', entityType: 'DocumentSubmission', isLive: false },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; selectedBg: string; selectedBorder: string }> = {
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', selectedBg: 'bg-violet-600', selectedBorder: 'border-violet-600' },
  sky:    { bg: 'bg-sky-50',    border: 'border-sky-200',    text: 'text-sky-700',    badge: 'bg-sky-100 text-sky-700',    selectedBg: 'bg-sky-600',    selectedBorder: 'border-sky-600' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  selectedBg: 'bg-amber-500',  selectedBorder: 'border-amber-500' },
  emerald:{ bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700',selectedBg: 'bg-emerald-600',selectedBorder: 'border-emerald-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', selectedBg: 'bg-orange-500', selectedBorder: 'border-orange-500' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700', selectedBg: 'bg-indigo-600', selectedBorder: 'border-indigo-600' },
};

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
    case 'PBAC_PERMISSION': {
      const perm = ALL_PERMISSIONS.find(p => p.id === resolver.permission);
      return `Permission: ${perm?.name ?? resolver.permission}`;
    }
    case 'DEPARTMENT_HEAD':  return 'Department Head (auto)';
    case 'MANAGER_OF_INITIATOR': return 'Manager of Initiator (auto)';
    case 'FIXED_USER':       return `Fixed User: ${resolver.userName ?? resolver.userId}`;
    case 'AMOUNT_BAND':      return `Amount band on "${resolver.field}"`;
    default:                 return type ?? 'Unknown';
  }
}

// ─── Resolver config fields ───────────────────────────────────────────────────

interface AmountBand {
  min: number;
  max: number | null;
  role?: string;
  userId?: string;
}

interface ResolverConfigProps {
  resolver: Record<string, unknown>;
  onChange: (resolver: Record<string, unknown>) => void;
  disabled: boolean;
  users?: { id: string; name: string; email: string }[];
  roles?: { id: string; name: string }[];
}

function PermissionPicker({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [search, setSearch] = useState('');
  const filtered = search
    ? ALL_PERMISSIONS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
    : null;

  const currentPerm = ALL_PERMISSIONS.find(p => p.id === value);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search permissions…"
          className="h-8 text-xs pl-7"
          disabled={disabled}
        />
      </div>
      {filtered ? (
        <div className="max-h-48 overflow-y-auto rounded border bg-white divide-y">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 px-3 py-2">No match</p>
          ) : filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setSearch(''); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2"
              disabled={disabled}
            >
              <span className={`flex-1 text-xs ${value === p.id ? 'font-semibold text-violet-700' : 'text-slate-700'}`}>{p.name}</span>
              <span className="text-xs text-slate-400 font-mono shrink-0">{p.id}</span>
            </button>
          ))}
        </div>
      ) : (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
          disabled={disabled}
        >
          <option value="">— Select permission —</option>
          {PERMISSIONS.map(cat => (
            <optgroup key={cat.id} label={cat.name}>
              {cat.permissions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
      {value && currentPerm && (
        <p className="text-xs text-slate-400">
          <span className="font-mono text-slate-500">{value}</span>
          {' — '}{currentPerm.description}
        </p>
      )}
    </div>
  );
}

function ResolverConfigFields({ resolver, onChange, disabled, users = [], roles = [] }: ResolverConfigProps) {
  const type = resolver.type as string;
  const set = (field: string, value: unknown) => onChange({ ...resolver, [field]: value });

  switch (type) {
    case 'ROLE':
      return (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Role</label>
          {roles.length > 0 ? (
            <select
              value={(resolver.role as string) ?? ''}
              onChange={e => set('role', e.target.value)}
              className="w-full h-9 px-2 rounded-md border bg-background text-sm"
              disabled={disabled}
            >
              <option value="">— Select role —</option>
              {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          ) : (
            <Input
              value={(resolver.role as string) ?? ''}
              onChange={e => set('role', e.target.value)}
              placeholder="e.g. HR Manager"
              className="h-8 text-sm"
              disabled={disabled}
            />
          )}
        </div>
      );

    case 'PBAC_PERMISSION':
      return (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Who should approve?</label>
          <PermissionPicker
            value={(resolver.permission as string) ?? ''}
            onChange={v => set('permission', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'DEPARTMENT_HEAD':
    case 'MANAGER_OF_INITIATOR':
      return (
        <div className="rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-xs text-sky-700">
          Auto-resolved at runtime — no configuration needed.
        </div>
      );

    case 'FIXED_USER':
      return (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Specific user</label>
          {users.length > 0 ? (
            <select
              value={(resolver.userId as string) ?? ''}
              onChange={e => {
                const u = users.find(u => u.id === e.target.value);
                onChange({ ...resolver, userId: e.target.value, userName: u?.name ?? '' });
              }}
              className="w-full h-9 px-2 rounded-md border bg-background text-sm"
              disabled={disabled}
            >
              <option value="">— Select user —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          ) : (
            <>
              <Input
                value={(resolver.userId as string) ?? ''}
                onChange={e => set('userId', e.target.value)}
                placeholder="User UUID"
                className="h-8 text-sm font-mono"
                disabled={disabled}
              />
              <p className="text-xs text-slate-400">Loading users…</p>
            </>
          )}
        </div>
      );

    case 'AMOUNT_BAND': {
      const bands = (resolver.bands as AmountBand[]) ?? [];
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Amount field in metadata</label>
            <Input
              value={(resolver.field as string) ?? 'amount'}
              onChange={e => set('field', e.target.value)}
              placeholder="amount"
              className="h-8 text-sm font-mono"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500">Bands</label>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => set('bands', [...bands, { min: 0, max: null, role: '' }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add band
                </Button>
              )}
            </div>
            {bands.length === 0 && (
              <p className="text-xs text-slate-400 italic">No bands defined — add at least one.</p>
            )}
            {bands.map((band, bi) => (
              <div key={bi} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Min</label>
                  <Input
                    type="number"
                    value={band.min ?? 0}
                    onChange={e => {
                      const updated = [...bands];
                      updated[bi] = { ...updated[bi], min: Number(e.target.value) };
                      set('bands', updated);
                    }}
                    className="h-7 text-xs"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Max</label>
                  <Input
                    type="number"
                    value={band.max ?? ''}
                    onChange={e => {
                      const updated = [...bands];
                      updated[bi] = { ...updated[bi], max: e.target.value ? Number(e.target.value) : null };
                      set('bands', updated);
                    }}
                    placeholder="∞"
                    className="h-7 text-xs"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Role</label>
                  <Input
                    value={band.role ?? ''}
                    onChange={e => {
                      const updated = [...bands];
                      updated[bi] = { ...updated[bi], role: e.target.value };
                      set('bands', updated);
                    }}
                    placeholder="e.g. CEO"
                    className="h-7 text-xs"
                    disabled={disabled}
                  />
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-rose-400 hover:text-rose-600"
                    onClick={() => set('bands', bands.filter((_, i) => i !== bi))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Conditions builder ───────────────────────────────────────────────────────

interface Condition {
  field: string;
  operator: string;
  value: string;
}

const CONDITION_OPERATORS = [
  { value: 'eq',       label: '= equals' },
  { value: 'ne',       label: '≠ not equals' },
  { value: 'gt',       label: '> greater than' },
  { value: 'gte',      label: '≥ ≥ or equal' },
  { value: 'lt',       label: '< less than' },
  { value: 'lte',      label: '≤ ≤ or equal' },
  { value: 'contains', label: '∋ contains' },
  { value: 'in',       label: '∈ in list' },
  { value: 'nin',      label: '∉ not in list' },
] as const;

interface ConditionsBuilderProps {
  conditions: Condition[] | null;
  onChange: (conditions: Condition[] | null) => void;
  disabled: boolean;
}

function ConditionsBuilder({ conditions, onChange, disabled }: ConditionsBuilderProps) {
  const rows = (conditions as Condition[]) ?? [];

  const add = () => onChange([...rows, { field: '', operator: 'eq', value: '' }]);

  const remove = (i: number) => {
    const updated = rows.filter((_, idx) => idx !== i);
    onChange(updated.length === 0 ? null : updated);
  };

  const update = (i: number, changes: Partial<Condition>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...changes } : r)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500">
          Skip conditions
          <span className="ml-1 font-normal text-slate-400">(step skipped when ALL pass)</span>
        </label>
        {!disabled && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={add}>
            <Plus className="h-3 w-3 mr-1" /> Add condition
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No conditions — step always runs.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_1fr_auto] gap-2 items-center">
              <Input
                value={row.field}
                onChange={e => update(i, { field: e.target.value })}
                placeholder="metadata.field"
                className="h-7 text-xs font-mono"
                disabled={disabled}
              />
              <Select
                value={row.operator}
                onValueChange={val => update(i, { operator: val })}
                disabled={disabled}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPERATORS.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={row.value}
                onChange={e => update(i, { value: e.target.value })}
                placeholder="value"
                className="h-7 text-xs"
                disabled={disabled}
              />
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-rose-400 hover:text-rose-600"
                  onClick={() => remove(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step editor row ─────────────────────────────────────────────────────────

interface StepRowProps {
  step: WorkflowStep;
  index: number;
  onChange: (index: number, step: WorkflowStep) => void;
  onRemove: (index: number) => void;
  canManage: boolean;
  users: { id: string; name: string; email: string }[];
  roles: { id: string; name: string }[];
}

function StepRow({ step, index, onChange, onRemove, canManage, users, roles }: StepRowProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedJson, setAdvancedJson] = useState(() => JSON.stringify(step.approverResolver, null, 2));
  const [jsonError, setJsonError] = useState('');

  const update = (field: keyof WorkflowStep, value: unknown) => {
    onChange(index, { ...step, [field]: value });
  };

  const resolverType = (step.approverResolver.type as string) ?? '';

  const handleResolverTypeChange = (val: string) => {
    const base: Record<string, unknown> = { type: val };
    if (val === 'ROLE') base.role = '';
    if (val === 'PBAC_PERMISSION') base.permission = '';
    if (val === 'FIXED_USER') base.userId = '';
    if (val === 'AMOUNT_BAND') { base.field = 'amount'; base.bands = []; }
    update('approverResolver', base);
    setAdvancedJson(JSON.stringify(base, null, 2));
    setJsonError('');
  };

  const handleResolverChange = (r: Record<string, unknown>) => {
    update('approverResolver', r);
    setAdvancedJson(JSON.stringify(r, null, 2));
  };

  const handleAdvancedJson = (val: string) => {
    setAdvancedJson(val);
    try {
      update('approverResolver', JSON.parse(val));
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      {/* Header */}
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

      {/* Core config row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Approver type</label>
          <Select value={resolverType} onValueChange={handleResolverTypeChange} disabled={!canManage}>
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

      {/* Resolver-specific fields */}
      {resolverType && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <ResolverConfigFields
            resolver={step.approverResolver}
            onChange={handleResolverChange}
            disabled={!canManage}
            users={users}
            roles={roles}
          />
        </div>
      )}

      {/* On-reject */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500">On reject</label>
        <Select value={step.onRejectBehavior} onValueChange={val => update('onRejectBehavior', val)} disabled={!canManage}>
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

      {/* Conditions builder */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <ConditionsBuilder
          conditions={step.conditions as Condition[] | null}
          onChange={conds => update('conditions', conds)}
          disabled={!canManage}
        />
      </div>

      {/* Advanced JSON (power-user escape hatch) */}
      {canManage && (
        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            onClick={() => setShowAdvanced(p => !p)}
          >
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showAdvanced ? 'Hide' : 'Show'} advanced resolver JSON
          </button>
          {showAdvanced && (
            <div className="mt-2 space-y-1">
              <Textarea
                value={advancedJson}
                onChange={e => handleAdvancedJson(e.target.value)}
                rows={4}
                className="text-xs font-mono"
              />
              {jsonError && <p className="text-xs text-rose-500">{jsonError}</p>}
            </div>
          )}
        </div>
      )}
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

  // Find preset that matches existing key (for edit display)
  const existingPreset = MODULE_CATEGORIES.flatMap(c => c.presets).find(p => p.key === initial?.key);
  const existingCategory = existingPreset ? MODULE_CATEGORIES.find(c => c.presets.some(p => p.id === existingPreset.id)) : null;

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(existingPreset?.id ?? null);
  const [isCustom, setIsCustom] = useState(!isEdit && !existingPreset ? false : !existingPreset);
  const [key, setKey] = useState(initial?.key ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [entityType, setEntityType] = useState(initial?.entityType ?? '');
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initial?.steps ?? [{ sequence: 1, name: '', approverResolver: { type: 'MANAGER_OF_INITIATOR' }, minApprovals: 1, slaHours: 72, onRejectBehavior: 'TERMINATE', conditions: null }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    fetch('/api/users').then(r => r.ok ? r.json() : null).then(d => {
      if (Array.isArray(d)) setUsers(d.map((u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email })));
    }).catch(() => {});
    fetch('/api/roles').then(r => r.ok ? r.json() : null).then(d => {
      if (Array.isArray(d)) setRoles(d.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
    }).catch(() => {});
  }, []);

  const selectPreset = (preset: ModulePreset) => {
    setSelectedPresetId(preset.id);
    setIsCustom(false);
    setKey(preset.key);
    setEntityType(preset.entityType);
    if (!name || name === '') setName(preset.name);
    if (!description || description === '') setDescription(preset.description);
  };

  const selectCustom = () => {
    setSelectedPresetId(null);
    setIsCustom(true);
    setKey('');
    setEntityType('');
  };

  const addStep = () => {
    setSteps(prev => [...prev, {
      sequence: prev.length + 1,
      name: '',
      approverResolver: { type: 'MANAGER_OF_INITIATOR' },
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
        res = await fetch(`/api/workflow/definitions/${initial!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description: description || undefined }),
        });
        if (res.ok) {
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

  const canSave = !!key && !!name && !!entityType && steps.length > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Gradient header */}
        <div className="-mx-6 -mt-6 px-6 pt-6 pb-5 mb-2 bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 rounded-t-lg text-white">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-1.5 bg-white/20 rounded-md">
              <GitBranch className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold text-white">
              {isEdit ? 'Edit Workflow Definition' : 'New Workflow Definition'}
            </DialogTitle>
          </div>
          <p className="text-violet-200 text-xs">
            {isEdit ? 'Update the name, description, and approval steps.' : 'Select a module and configure approval steps.'}
          </p>
        </div>

        <div className="space-y-6 py-1">

          {/* ── STEP 1: Module selection (create only) ── */}
          {!isEdit ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-violet-600 text-white text-xs font-bold shrink-0">1</span>
                <p className="text-sm font-semibold text-slate-800">Which module should this workflow govern?</p>
              </div>

              <div className="space-y-3">
                {MODULE_CATEGORIES.map(cat => {
                  const colors = COLOR_MAP[cat.color] ?? COLOR_MAP.violet;
                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${colors.text}`}>
                        {cat.icon}
                        {cat.name}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                        {cat.presets.map(preset => {
                          const isSelected = selectedPresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => selectPreset(preset)}
                              className={`
                                text-left rounded-xl border p-3 transition-all duration-150 group
                                ${isSelected
                                  ? `${colors.selectedBg} border-transparent text-white shadow-md`
                                  : `bg-white ${colors.border} hover:${colors.bg} hover:border-opacity-80`
                                }
                              `}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                  {preset.name}
                                </p>
                                {isSelected
                                  ? <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0 mt-0.5" />
                                  : <ChevronRight className={`h-3.5 w-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 ${colors.text}`} />
                                }
                              </div>
                              <p className={`text-xs mt-0.5 leading-tight ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                                {preset.description}
                              </p>
                              {preset.isLive && (
                                <span className={`inline-flex items-center gap-0.5 mt-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                  <Zap className="h-2.5 w-2.5" /> Live
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Custom option */}
                <button
                  type="button"
                  onClick={selectCustom}
                  className={`
                    w-full text-left rounded-xl border p-3 transition-all duration-150
                    ${isCustom
                      ? 'bg-slate-700 border-slate-700 text-white shadow-md'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Layers className={`h-4 w-4 ${isCustom ? 'text-white' : 'text-slate-500'}`} />
                    <div>
                      <p className={`text-xs font-semibold ${isCustom ? 'text-white' : 'text-slate-700'}`}>Custom / New Integration</p>
                      <p className={`text-xs ${isCustom ? 'text-white/70' : 'text-slate-400'}`}>Define your own workflow key for any other module</p>
                    </div>
                    {isCustom && <CheckCircle2 className="h-4 w-4 text-white ml-auto shrink-0" />}
                  </div>
                </button>
              </div>

              {/* Custom key/entityType inputs */}
              {isCustom && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Workflow key <span className="font-normal text-slate-400">(matches module code)</span></label>
                    <Input
                      value={key}
                      onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                      placeholder="MY_MODULE_APPROVAL"
                      className="font-mono text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Entity type</label>
                    <Input
                      value={entityType}
                      onChange={e => setEntityType(e.target.value)}
                      placeholder="MyEntity"
                      className="font-mono text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Edit mode: show selected module as badge */
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {existingCategory && (
                <div className={`p-2 rounded-lg ${COLOR_MAP[existingCategory.color]?.bg ?? 'bg-slate-100'}`}>
                  <span className={COLOR_MAP[existingCategory.color]?.text ?? 'text-slate-600'}>
                    {existingCategory.icon}
                  </span>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Module</p>
                <p className="text-sm font-semibold text-slate-800">
                  {existingPreset?.name ?? initial?.key ?? 'Custom'}
                </p>
              </div>
              <span className="ml-auto text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">{initial?.entityType}</span>
            </div>
          )}

          {/* ── STEP 2: Name & Description ── */}
          {(selectedPresetId !== null || isCustom || isEdit) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-violet-600 text-white text-xs font-bold shrink-0">{isEdit ? '1' : '2'}</span>
                <p className="text-sm font-semibold text-slate-800">Details</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Workflow name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HR Loan Approval" className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What does this workflow approve?" className="bg-white" />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Approval steps ── */}
          {(selectedPresetId !== null || isCustom || isEdit) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-violet-600 text-white text-xs font-bold shrink-0">{isEdit ? '2' : '3'}</span>
                  <p className="text-sm font-semibold text-slate-800">Approval steps ({steps.length})</p>
                </div>
                <Button variant="outline" size="sm" onClick={addStep} className="h-7 text-xs gap-1 border-violet-200 text-violet-700 hover:bg-violet-50">
                  <Plus className="h-3.5 w-3.5" /> Add step
                </Button>
              </div>
              <p className="text-xs text-slate-400">Steps run in sequence — each must be approved before the next begins.</p>
              {steps.map((step, idx) => (
                <StepRow
                  key={idx}
                  step={step}
                  index={idx}
                  onChange={updateStep}
                  onRemove={removeStep}
                  canManage
                  users={users}
                  roles={roles}
                />
              ))}
            </div>
          )}

          {/* ── Technical details (collapsed) ── */}
          {(selectedPresetId !== null || isEdit) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTechnical(p => !p)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <span className="font-medium">Technical details (workflow key &amp; entity type)</span>
                {showTechnical ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showTechnical && (
                <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium">Workflow key</p>
                    <code className="block text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700">{key || '—'}</code>
                    <p className="text-xs text-slate-400">Must match <code className="font-mono">startWorkflow(&#39;key&#39;)</code> in module code</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-medium">Entity type</p>
                    <code className="block text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700">{entityType || '—'}</code>
                    <p className="text-xs text-slate-400">Used to query workflow status by record type</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 mt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white shadow"
            onClick={handleSave}
            disabled={saving || !canSave || (!selectedPresetId && !isCustom && !isEdit)}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create workflow'}
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
