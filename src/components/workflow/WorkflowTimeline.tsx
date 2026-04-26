'use client';

import { CheckCircle2, XCircle, Clock, SkipForward, Circle, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Approval {
  id: string;
  decision: string;
  comment: string | null;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

interface StepInstance {
  id: string;
  sequence: number;
  status: string;
  resolvedApprovers: { userId: string; name: string; email: string }[] | null;
  requiredApprovals: number;
  receivedApprovals: number;
  skipReason: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  step: {
    name: string;
    sequence: number;
    slaHours: number | null;
    onRejectBehavior: string;
  };
  approvals: Approval[];
}

interface WorkflowInstance {
  id: string;
  status: string;
  entityType: string;
  entityId: string;
  definition: { key: string; name: string };
  initiatedBy: { id: string; name: string };
  createdAt: string;
  completedAt: string | null;
  stepInstances: StepInstance[];
}

interface WorkflowTimelineProps {
  instance: WorkflowInstance;
  /** Compact: hide approver lists and comments */
  compact?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stepStatusConfig(status: string) {
  switch (status) {
    case 'APPROVED':
      return {
        icon: CheckCircle2,
        ringColor: 'ring-emerald-400',
        bgColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        label: 'Approved',
        labelClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    case 'REJECTED':
      return {
        icon: XCircle,
        ringColor: 'ring-rose-400',
        bgColor: 'bg-rose-500',
        textColor: 'text-rose-700',
        label: 'Rejected',
        labelClass: 'bg-rose-100 text-rose-700 border-rose-200',
      };
    case 'ACTIVE':
      return {
        icon: Clock,
        ringColor: 'ring-amber-400',
        bgColor: 'bg-amber-400',
        textColor: 'text-amber-700',
        label: 'In Review',
        labelClass: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    case 'SKIPPED':
      return {
        icon: SkipForward,
        ringColor: 'ring-slate-300',
        bgColor: 'bg-slate-300',
        textColor: 'text-slate-500',
        label: 'Skipped',
        labelClass: 'bg-slate-100 text-slate-500 border-slate-200',
      };
    default:
      return {
        icon: Circle,
        ringColor: 'ring-slate-200',
        bgColor: 'bg-slate-200',
        textColor: 'text-slate-400',
        label: 'Pending',
        labelClass: 'bg-slate-100 text-slate-500 border-slate-200',
      };
  }
}

function instanceStatusConfig(status: string) {
  switch (status) {
    case 'APPROVED':   return { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', label: 'Approved' };
    case 'REJECTED':   return { color: 'text-rose-700', bg: 'bg-rose-100 border-rose-200', label: 'Rejected' };
    case 'IN_PROGRESS':return { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', label: 'In Progress' };
    case 'CANCELLED':  return { color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200', label: 'Cancelled' };
    default:           return { color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', label: status };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function decisionIcon(decision: string) {
  switch (decision) {
    case 'APPROVE':  return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case 'REJECT':   return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
    case 'DELEGATE': return <ChevronRight className="h-3.5 w-3.5 text-sky-500" />;
    default:         return <Circle className="h-3.5 w-3.5 text-slate-400" />;
  }
}

// ─── Step node ────────────────────────────────────────────────────────────────

function StepNode({ si, isLast, compact }: { si: StepInstance; isLast: boolean; compact: boolean }) {
  const cfg = stepStatusConfig(si.status);
  const Icon = cfg.icon;

  return (
    <div className="flex gap-3 min-w-0">
      {/* Icon column */}
      <div className="flex flex-col items-center">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bgColor} ring-2 ring-offset-2 ${cfg.ringColor} shadow-sm`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 mt-1 mb-1 bg-slate-200 min-h-[20px]" />}
      </div>

      {/* Content */}
      <div className={`pb-4 min-w-0 ${isLast ? '' : ''}`}>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-800">{si.step.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${cfg.labelClass}`}>
            {cfg.label}
          </span>
          {si.step.slaHours && (
            <span className="text-xs text-slate-400">{si.step.slaHours}h SLA</span>
          )}
        </div>

        {si.status === 'ACTIVE' && si.resolvedApprovers && !compact && (
          <p className="text-xs text-slate-500 mb-1.5">
            Awaiting: {si.resolvedApprovers.map(a => a.name).join(', ')}
          </p>
        )}

        {si.status === 'ACTIVE' && si.requiredApprovals > 1 && (
          <p className="text-xs text-amber-600 mb-1.5">
            {si.receivedApprovals}/{si.requiredApprovals} approvals received
          </p>
        )}

        {si.status === 'SKIPPED' && si.skipReason && (
          <p className="text-xs text-slate-400 italic mb-1.5">{si.skipReason}</p>
        )}

        {si.completedAt && (
          <p className="text-xs text-slate-400 mb-1.5">{formatDate(si.completedAt)}</p>
        )}

        {!compact && si.approvals.length > 0 && (
          <div className="space-y-1 mt-1.5">
            {si.approvals.map(a => (
              <div key={a.id} className="flex items-start gap-1.5 text-xs text-slate-600">
                {decisionIcon(a.decision)}
                <span className="font-medium">{a.user.name}</span>
                <span className="text-slate-400">— {a.decision.toLowerCase()}</span>
                {a.comment && <span className="text-slate-500">"{a.comment}"</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkflowTimeline({ instance, compact = false }: WorkflowTimelineProps) {
  const statusCfg = instanceStatusConfig(instance.status);

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b bg-slate-50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{instance.definition.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Started by {instance.initiatedBy.name} · {formatDate(instance.createdAt)}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border font-medium shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Steps */}
      <div className="px-5 pt-4 pb-2">
        {instance.stepInstances.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No steps defined.</p>
        ) : (
          <div>
            {instance.stepInstances.map((si, idx) => (
              <StepNode
                key={si.id}
                si={si}
                isLast={idx === instance.stepInstances.length - 1}
                compact={compact}
              />
            ))}
          </div>
        )}
      </div>

      {instance.completedAt && (
        <div className="px-5 pb-3 text-xs text-slate-400">
          Completed {formatDate(instance.completedAt)}
        </div>
      )}
    </div>
  );
}
