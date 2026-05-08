'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutList, ChevronDown, ChevronUp, Clock, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { HorizontalStepsTimeline } from '@/components/workflow/HorizontalStepsTimeline';
import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Approval {
  id: string;
  decision: string;
  comment: string | null;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

interface StepInstance {
  id: string;
  instanceId: string;
  sequence: number;
  status: string;
  resolvedApprovers: { userId: string; name: string; email: string }[] | null;
  requiredApprovals: number;
  receivedApprovals: number;
  skipReason: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  step: { name: string; sequence: number; slaHours: number | null; onRejectBehavior: string };
  approvals: Approval[];
}

interface WorkflowInstance {
  id: string;
  status: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  definition: { key: string; name: string; entityType: string };
  initiatedBy: { id: string; name: string };
  cancelledBy: { id: string; name: string } | null;
  stepInstances: StepInstance[];
}

interface AllApprovalsResponse {
  items: WorkflowInstance[];
  total: number;
  page: number;
  limit: number;
  statusCounts: Record<string, number>;
}

interface ApprovalsTrackingClientProps {
  isAdmin: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function idleLabel(stepInstances: StepInstance[]): { label: string; urgent: boolean } | null {
  const active = stepInstances.find(s => s.status === 'ACTIVE');
  if (!active?.activatedAt) return null;
  const hours = (Date.now() - new Date(active.activatedAt).getTime()) / 3_600_000;
  const urgent = hours > 48;
  if (hours < 1) return { label: '< 1h idle', urgent };
  if (hours < 24) return { label: `${Math.floor(hours)}h idle`, urgent };
  return { label: `${Math.floor(hours / 24)}d idle`, urgent };
}

function currentStepInfo(stepInstances: StepInstance[]): { name: string; approvers: string } | null {
  const active = stepInstances.find(s => s.status === 'ACTIVE');
  if (!active) return null;
  const approvers = (active.resolvedApprovers ?? []).map(a => a.name);
  const display = approvers.length > 2
    ? `${approvers.slice(0, 2).join(', ')} +${approvers.length - 2}`
    : approvers.join(', ') || '—';
  return { name: active.step.name, approvers: display };
}

function statusBadge(status: string) {
  switch (status) {
    case 'APPROVED':    return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">Approved</Badge>;
    case 'REJECTED':    return <Badge className="bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-100">Rejected</Badge>;
    case 'IN_PROGRESS': return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">In Progress</Badge>;
    case 'CANCELLED':   return <Badge className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100">Cancelled</Badge>;
    default:            return <Badge className="bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-100">{status}</Badge>;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-SA-u-ca-gregory', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${color} mb-1`}>{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

// ─── Instance Row ─────────────────────────────────────────────────────────────

function InstanceRow({ instance }: { instance: WorkflowInstance }) {
  const [expanded, setExpanded] = useState(false);
  const idle = idleLabel(instance.stepInstances);
  const stepInfo = currentStepInfo(instance.stepInstances);

  const timelineSteps = instance.stepInstances.map(s => ({
    id: s.id,
    sequence: s.sequence,
    status: s.status as 'PENDING' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'SKIPPED',
    name: s.step.name,
    completedAt: s.completedAt,
    activatedAt: s.activatedAt,
  }));

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Main row */}
        <button
          className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            {/* Left: workflow + entity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-slate-800 text-sm">{instance.definition.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-mono">
                  {instance.entityType} #{instance.entityId.slice(0, 8)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Submitted by <span className="font-medium text-slate-700">{instance.initiatedBy.name}</span>
                {' · '}{formatDate(instance.createdAt)}
              </p>

              {/* Mini horizontal timeline */}
              {timelineSteps.length > 0 && (
                <div className="mt-3">
                  <HorizontalStepsTimeline steps={timelineSteps} compact />
                </div>
              )}
            </div>

            {/* Right: status + step info */}
            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
              {statusBadge(instance.status)}

              {idle && (
                <span className={`flex items-center gap-1 text-xs font-medium ${idle.urgent ? 'text-red-600' : 'text-slate-500'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {idle.label}
                </span>
              )}

              {stepInfo && (
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-700">{stepInfo.name}</p>
                  <p className="text-xs text-slate-400">{stepInfo.approvers}</p>
                </div>
              )}

              {expanded
                ? <ChevronUp className="w-4 h-4 text-slate-400 mt-1" />
                : <ChevronDown className="w-4 h-4 text-slate-400 mt-1" />
              }
            </div>
          </div>
        </button>

        {/* Expanded full timeline */}
        {expanded && (
          <div className="border-t px-4 py-4 bg-slate-50">
            <WorkflowTimeline instance={instance} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ENTITY_TYPES = ['Loan', 'NCRReport', 'ImsRevision', 'ImsChangeRequest', 'Document'];

export function ApprovalsTrackingClient({ isAdmin }: ApprovalsTrackingClientProps) {
  const [data, setData] = useState<AllApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (entityTypeFilter !== 'all') params.set('entityType', entityTypeFilter);

      const res = await fetch(`/api/workflow/all-approvals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch {
      setError('Failed to load approval data.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, entityTypeFilter, page]);

  useEffect(() => {
    setPage(1);
    load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, entityTypeFilter]);

  useEffect(() => {
    load(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Client-side search filter
  const filteredItems = (data?.items ?? []).filter(inst => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inst.definition.name.toLowerCase().includes(q) ||
      inst.entityType.toLowerCase().includes(q) ||
      inst.entityId.toLowerCase().includes(q) ||
      inst.initiatedBy.name.toLowerCase().includes(q)
    );
  });

  const counts = data?.statusCounts ?? {};
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <LayoutList className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Approval Tracking</h1>
                {isAdmin && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 border border-white/30 font-medium">
                    Admin View
                  </span>
                )}
              </div>
              <p className="text-violet-100 text-sm">
                {isAdmin
                  ? 'Central unit for all workflow approval requests across every module.'
                  : 'Approval requests you submitted or are responsible for approving.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 shrink-0"
              onClick={() => load(page)}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard label="Total" value={total} color="text-blue-600" />
          <KpiCard label="In Progress" value={(counts.IN_PROGRESS ?? 0) + (counts.PENDING ?? 0)} color="text-amber-600" />
          <KpiCard label="Approved" value={counts.APPROVED ?? 0} color="text-emerald-600" />
          <KpiCard label="Rejected" value={counts.REJECTED ?? 0} color="text-rose-600" />
          <KpiCard label="Cancelled" value={counts.CANCELLED ?? 0} color="text-slate-500" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by workflow, entity type, ID, or submitter…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {ENTITY_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive text-sm p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <LayoutList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No approval requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(inst => (
              <InstanceRow key={inst.id} instance={inst} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && data && data.total > data.limit && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              Showing {Math.min((page - 1) * data.limit + 1, data.total)}–{Math.min(page * data.limit, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * data.limit >= data.total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
