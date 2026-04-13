'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  Plus,
  Loader2,
  CloudDownload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  CalendarClock,
  Lock,
  ArrowRight,
} from 'lucide-react';

type Period = {
  id: string;
  year: number;
  month: number;
  status: string;
  cutoffDate: string;
  payDate: string;
  calculatedAt: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  _count?: { lines: number; adjustments: number; wpsExports: number };
};

type LeaveSyncLog = {
  id: string;
  startedAt: string;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  triggerSource: string;
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  employeesNotFound: number;
  triggeredBy?: { id: string; name: string | null; email: string | null } | null;
};

type EmployeeSyncLog = {
  id: string;
  startedAt: string;
  status: string;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  triggeredBy?: { id: string; name: string | null; email: string | null } | null;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function PayrollPeriodsClient({
  canCalculate,
  canApprove,
  canLock,
  canExport,
  canSync,
}: {
  canCalculate: boolean;
  canApprove: boolean;
  canLock: boolean;
  canExport: boolean;
  canSync: boolean;
}) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    cutoffDate: '',
    payDate: '',
  });
  const [creating, setCreating] = useState(false);

  // Dolibarr sync (18.6.1)
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastLeaveSync, setLastLeaveSync] = useState<LeaveSyncLog | null>(null);
  const [lastEmployeeSync, setLastEmployeeSync] = useState<EmployeeSyncLog | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/payroll-periods');
      if (res.ok) setPeriods(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLastSync = useCallback(async () => {
    if (!canSync) return;
    try {
      const [leavesRes, employeesRes] = await Promise.all([
        fetch('/api/hr/leave-requests/sync'),
        fetch('/api/hr/employees/sync'),
      ]);
      if (leavesRes.ok) {
        const logs: LeaveSyncLog[] = await leavesRes.json();
        setLastLeaveSync(logs[0] ?? null);
      }
      if (employeesRes.ok) {
        const logs: EmployeeSyncLog[] = await employeesRes.json();
        setLastEmployeeSync(Array.isArray(logs) ? logs[0] ?? null : null);
      }
    } catch {
      // non-fatal
    }
  }, [canSync]);

  useEffect(() => {
    refresh();
    loadLastSync();
  }, [refresh, loadLastSync]);

  async function runSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      // Run employee sync first so freshly-added employees land before leaves
      // try to resolve fk_user. Both are idempotent.
      const empRes = await fetch('/api/hr/employees/sync', { method: 'POST' });
      if (!empRes.ok) {
        const body = await empRes.json().catch(() => ({}));
        throw new Error(body.error ?? body.message ?? 'Employee sync failed');
      }
      const leaveRes = await fetch('/api/hr/leave-requests/sync', { method: 'POST' });
      if (!leaveRes.ok) {
        const body = await leaveRes.json().catch(() => ({}));
        throw new Error(body.error ?? body.message ?? 'Leaves sync failed');
      }
      await loadLastSync();
      await refresh();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/payroll-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setShowNew(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  // KPI counts
  const draftCount = periods.filter((p) => p.status === 'DRAFT').length;
  const calculatedCount = periods.filter((p) => p.status === 'CALCULATED').length;
  const approvedCount = periods.filter((p) => p.status === 'APPROVED').length;
  const lockedCount = periods.filter((p) => p.status === 'LOCKED' || p.status === 'PAID').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <Banknote className="absolute -right-8 -top-8 h-48 w-48" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Banknote className="h-3.5 w-3.5" />
                HR · Payroll
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Payroll Periods</h1>
              <p className="mt-1 text-indigo-100 text-sm md:text-base">
                Calculate, approve and lock monthly payroll. Sync fresh employee &amp; leave data from Dolibarr before
                running a calc.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canSync && (
                <Button
                  variant="secondary"
                  onClick={runSync}
                  disabled={syncing}
                  className="bg-white text-indigo-700 hover:bg-indigo-50 border-0 shadow-sm"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <CloudDownload className="h-4 w-4 mr-1.5" />
                  )}
                  Sync from Dolibarr
                </Button>
              )}
              {canCalculate && !showNew && (
                <Button
                  onClick={() => setShowNew(true)}
                  className="bg-white text-indigo-700 hover:bg-indigo-50 border-0 shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  New period
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <KpiTile label="Draft" value={String(draftCount)} hint="not calculated" tone="slate" icon={<FileText className="h-4 w-4" />} />
          <KpiTile label="Calculated" value={String(calculatedCount)} hint="awaiting approval" tone="sky" icon={<CalendarClock className="h-4 w-4" />} />
          <KpiTile label="Approved" value={String(approvedCount)} hint="ready for WPS" tone="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
          <KpiTile label="Locked / Paid" value={String(lockedCount)} hint="closed periods" tone="violet" icon={<Lock className="h-4 w-4" />} />
        </div>

        {/* Sync status strip */}
        {canSync && (lastLeaveSync || lastEmployeeSync || syncError) && (
          <Card className="border-slate-200">
            <CardContent className="py-4 space-y-2">
              {syncError && (
                <div className="flex items-start gap-2 text-red-700">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Sync failed</div>
                    <div className="text-sm text-red-600/90">{syncError}</div>
                  </div>
                </div>
              )}
              {!syncError && lastEmployeeSync && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <SyncIcon status={lastEmployeeSync.status} />
                    <span className="font-medium text-slate-700">Employees</span>
                    <Badge
                      variant={
                        lastEmployeeSync.status === 'SUCCESS'
                          ? 'default'
                          : lastEmployeeSync.status === 'FAILED'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {lastEmployeeSync.status}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(lastEmployeeSync.startedAt).toLocaleString()}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Pill label="created" value={lastEmployeeSync.rowsCreated} tone="emerald" />
                    <Pill label="updated" value={lastEmployeeSync.rowsUpdated} tone="sky" />
                    <Pill label="skipped" value={lastEmployeeSync.rowsSkipped} />
                  </div>
                </div>
              )}
              {!syncError && lastLeaveSync && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <SyncIcon status={lastLeaveSync.status} />
                    <span className="font-medium text-slate-700">Leaves</span>
                    <Badge
                      variant={
                        lastLeaveSync.status === 'SUCCESS'
                          ? 'default'
                          : lastLeaveSync.status === 'FAILED'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {lastLeaveSync.status}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(lastLeaveSync.startedAt).toLocaleString()}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Pill label="read" value={lastLeaveSync.rowsRead} />
                    <Pill label="created" value={lastLeaveSync.rowsCreated} tone="emerald" />
                    <Pill label="updated" value={lastLeaveSync.rowsUpdated} tone="sky" />
                    <Pill label="skipped" value={lastLeaveSync.rowsSkipped} />
                    {lastLeaveSync.employeesNotFound > 0 && (
                      <Pill label="not matched" value={lastLeaveSync.employeesNotFound} tone="amber" />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {showNew && (
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Plus className="h-5 w-5" /> Create a new payroll period
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || now.getFullYear() })}
                />
              </div>
              <div>
                <Label>Month</Label>
                <select
                  className="w-full border rounded-md h-10 px-3 bg-white"
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Cutoff date</Label>
                <Input type="date" value={form.cutoffDate} onChange={(e) => setForm({ ...form, cutoffDate: e.target.value })} />
              </div>
              <div>
                <Label>Pay date</Label>
                <Input type="date" value={form.payDate} onChange={(e) => setForm({ ...form, payDate: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button onClick={create} disabled={creating || !form.cutoffDate || !form.payDate}>
                  {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Periods list */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-base font-semibold text-slate-800">Periods</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground p-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading periods…
              </div>
            ) : periods.length === 0 ? (
              <div className="py-12 text-center">
                <Banknote className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-muted-foreground">No payroll periods yet.</p>
                {canCalculate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Click <span className="font-medium">New period</span> above to create your first run.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-white border-b">
                    <tr>
                      <th className="py-3 px-4 font-medium">Period</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Lines</th>
                      <th className="py-3 px-4 font-medium text-right">Adjustments</th>
                      <th className="py-3 px-4 font-medium text-right">WPS exports</th>
                      <th className="py-3 px-4 font-medium">Pay date</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {MONTHS[p.month - 1]} {p.year}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">{p._count?.lines ?? 0}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{p._count?.adjustments ?? 0}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{p._count?.wpsExports ?? 0}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(p.payDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link href={`/hr/payroll/${p.id}`}>
                            <Button size="sm" variant="ghost" className="gap-1">
                              Open <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Workflow: <span className="font-medium">DRAFT</span> → <span className="font-medium">CALCULATED</span> →{' '}
          <span className="font-medium">APPROVED</span> → <span className="font-medium">LOCKED</span>. Generate the
          Alinma WPS file once a period is APPROVED. Payslip PDFs become available after calculation.
        </p>
      </div>
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  slate: 'from-slate-50 to-white border-slate-200 text-slate-700',
  sky: 'from-sky-50 to-white border-sky-200 text-sky-700',
  emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
  violet: 'from-violet-50 to-white border-violet-200 text-violet-700',
};

function KpiTile({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'slate' | 'sky' | 'emerald' | 'violet';
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border bg-gradient-to-b p-4 shadow-sm ${TONE_CLASSES[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

function Pill({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'emerald' | 'sky' | 'amber' | 'violet';
}) {
  const classes: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${classes[tone]}`}>
      {label}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function SyncIcon({ status }: { status: string }) {
  if (status === 'SUCCESS') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'FAILED') return <XCircle className="h-4 w-4 text-red-600" />;
  return <AlertCircle className="h-4 w-4 text-amber-600" />;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'LOCKED' ? 'destructive' :
    status === 'APPROVED' || status === 'PAID' ? 'default' :
    status === 'CALCULATED' ? 'secondary' :
    'outline';
  return <Badge variant={color}>{status}</Badge>;
}
