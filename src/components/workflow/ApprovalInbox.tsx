'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, UserCheck, MessageSquare, Clock, RefreshCw, Inbox, Banknote, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResolvedApprover {
  userId: string;
  name: string;
  email: string;
}

interface PendingApprovalStep {
  id: string;
  instanceId: string;
  sequence: number;
  status: string;
  resolvedApprovers: ResolvedApprover[];
  requiredApprovals: number;
  receivedApprovals: number;
  activatedAt: string | null;
  step: {
    name: string;
    sequence: number;
    slaHours: number | null;
  };
  instance: {
    id: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown> | null;
    definition: { key: string; name: string };
    initiatedBy: { id: string; name: string };
  };
}

interface ApprovalInboxProps {
  /** Compact mode for dashboard embedding */
  compact?: boolean;
  /** Called after a successful decision to allow parent to refresh */
  onDecisionMade?: () => void;
}

// ─── Decision dialog ──────────────────────────────────────────────────────────

interface DecisionDialogProps {
  step: PendingApprovalStep | null;
  decision: 'APPROVE' | 'REJECT' | 'DELEGATE' | 'COMMENT' | null;
  onClose: () => void;
  onConfirm: (comment: string, delegateeId: string) => Promise<void>;
  submitting: boolean;
  users: { id: string; name: string }[];
}

function DecisionDialog({ step, decision, onClose, onConfirm, submitting, users }: DecisionDialogProps) {
  const [comment, setComment] = useState('');
  const [delegateeId, setDelegateeId] = useState('');

  useEffect(() => {
    setComment('');
    setDelegateeId('');
  }, [step, decision]);

  if (!step || !decision) return null;

  const requiresComment = decision === 'REJECT';
  const requiresDelegatee = decision === 'DELEGATE';
  const canSubmit = (!requiresComment || comment.trim().length > 0) && (!requiresDelegatee || delegateeId);

  const labels: Record<string, string> = {
    APPROVE: 'Approve',
    REJECT: 'Reject',
    DELEGATE: 'Delegate',
    COMMENT: 'Add Comment',
  };

  const colors: Record<string, string> = {
    APPROVE: 'bg-emerald-600 hover:bg-emerald-700',
    REJECT: 'bg-rose-600 hover:bg-rose-700',
    DELEGATE: 'bg-sky-600 hover:bg-sky-700',
    COMMENT: 'bg-slate-600 hover:bg-slate-700',
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels[decision]} — {step.step.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500">
            Workflow: <span className="font-medium text-slate-700">{step.instance.definition.name}</span>
          </p>
          {requiresDelegatee && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Delegate to</label>
              <Select value={delegateeId} onValueChange={setDelegateeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">
              {requiresComment ? 'Reason (required)' : 'Comment (optional)'}
            </label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={requiresComment ? 'Enter rejection reason…' : 'Add a note…'}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            className={`text-white ${colors[decision]}`}
            disabled={!canSubmit || submitting}
            onClick={() => onConfirm(comment, delegateeId)}
          >
            {submitting ? 'Submitting…' : labels[decision]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SLA badge ────────────────────────────────────────────────────────────────

function SlaBadge({ activatedAt, slaHours }: { activatedAt: string | null; slaHours: number | null }) {
  if (!slaHours || !activatedAt) return null;
  const deadlineMs = new Date(activatedAt).getTime() + slaHours * 3_600_000;
  const remainingHours = (deadlineMs - Date.now()) / 3_600_000;
  const overdue = remainingHours < 0;
  const urgent = !overdue && remainingHours < 4;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
      overdue ? 'bg-rose-100 text-rose-700 border-rose-200' :
      urgent  ? 'bg-amber-100 text-amber-700 border-amber-200' :
               'bg-slate-100 text-slate-600 border-slate-200'
    }`}>
      <Clock className="h-3 w-3" />
      {overdue
        ? `${Math.abs(Math.round(remainingHours))}h overdue`
        : `${Math.round(remainingHours)}h left`}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApprovalInbox({ compact = false, onDecisionMade }: ApprovalInboxProps) {
  const [steps, setSteps] = useState<PendingApprovalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<PendingApprovalStep | null>(null);
  const [activeDecision, setActiveDecision] = useState<'APPROVE' | 'REJECT' | 'DELEGATE' | 'COMMENT' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflow/my-approvals');
      if (res.ok) setSteps(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
    // Prefetch users for delegation
    fetch('/api/users?status=active').then(r => r.ok ? r.json() : []).then((data: { id: string; name: string }[]) => {
      if (Array.isArray(data)) setUsers(data.map(u => ({ id: u.id, name: u.name })));
    });
  }, [fetchApprovals]);

  const openDecision = (step: PendingApprovalStep, decision: typeof activeDecision) => {
    setActiveStep(step);
    setActiveDecision(decision);
  };

  const submitDecision = async (comment: string, delegateeId: string) => {
    if (!activeStep || !activeDecision) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/workflow/instances/${activeStep.instanceId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: activeDecision,
          comment: comment || undefined,
          delegatedToUserId: delegateeId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to submit decision');
      }
      setActiveStep(null);
      setActiveDecision(null);
      await fetchApprovals();
      onDecisionMade?.();
    } finally {
      setSubmitting(false);
    }
  };

  const entityLabel = (step: PendingApprovalStep) =>
    `${step.instance.entityType.replace(/_/g, ' ')} · ${step.instance.entityId.slice(0, 8)}…`;

  function fmtSAR(v: unknown) {
    const n = Number(v);
    if (isNaN(n)) return null;
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);
  }

  function EntityMetaBadges({ step }: { step: PendingApprovalStep }) {
    const meta = step.instance.metadata;
    if (!meta) return null;
    const items: { icon: React.ReactNode; label: string }[] = [];
    if (step.instance.entityType === 'Loan') {
      const amt = fmtSAR(meta.principal);
      if (meta.employeeName) items.push({ icon: <User className="h-3 w-3" />, label: String(meta.employeeName) });
      if (amt) items.push({ icon: <Banknote className="h-3 w-3" />, label: amt });
      if (meta.installmentsTotal) items.push({ icon: null, label: `${meta.installmentsTotal} installments` });
    }
    if (!items.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
            {item.icon}{item.label}
          </span>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading approvals…
      </div>
    );
  }

  if (!steps.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
        <Inbox className="h-8 w-8 opacity-40" />
        <p className="text-sm">No pending approvals</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {!compact && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {steps.length} pending approval{steps.length !== 1 ? 's' : ''}
            </p>
            <Button variant="ghost" size="sm" onClick={fetchApprovals}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        )}

        {steps.map(step => (
          <div
            key={step.id}
            className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{step.step.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{step.instance.definition.name}</p>
                <p className="text-xs text-slate-400">{entityLabel(step)}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                  Step {step.sequence}
                </Badge>
                <SlaBadge activatedAt={step.activatedAt} slaHours={step.step.slaHours} />
              </div>
            </div>

            <EntityMetaBadges step={step} />

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 mt-2">
              <span>Submitted by <span className="text-slate-600 font-medium">{step.instance.initiatedBy.name}</span></span>
              {step.requiredApprovals > 1 && (
                <span>· {step.receivedApprovals}/{step.requiredApprovals} approvals</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                onClick={() => openDecision(step, 'APPROVE')}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs h-7"
                onClick={() => openDecision(step, 'REJECT')}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
              {!compact && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => openDecision(step, 'DELEGATE')}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Delegate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-slate-500"
                    onClick={() => openDecision(step, 'COMMENT')}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Comment
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <DecisionDialog
        step={activeStep}
        decision={activeDecision}
        onClose={() => { setActiveStep(null); setActiveDecision(null); }}
        onConfirm={submitDecision}
        submitting={submitting}
        users={users}
      />
    </>
  );
}
