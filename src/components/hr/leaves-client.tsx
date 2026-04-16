'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, CalendarClock, Inbox, Users, Check, X, AlertTriangle, CloudDownload, CheckCircle2, AlertCircle, XCircle, BarChart3, Sun, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type LeaveType = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  payType: 'FULLY_PAID' | 'HALF_PAID' | 'UNPAID';
  monthlyAccrualDays: string | number;
  maxCarryOverDays: string | number;
};

type LeaveBalance = {
  leaveTypeId: string;
  year: number;
  openingBalance: number;
  accruedYtd: number;
  usedYtd: number;
  usedFullyPaid: number;
  usedHalfPaid: number;
  usedUnpaid: number;
  available: number;
  leaveType: Pick<LeaveType, 'id' | 'code' | 'nameEn' | 'nameAr' | 'payType'>;
};

type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  workingDays: string | number;
  calendarDays: number;
  reason: string | null;
  status: string;
  wasOverBalance: boolean;
  balanceAtRequest: string | number | null;
  leaveType: LeaveType;
  employee?: { id: string; employmentId: string; fullNameEn: string; fullNameAr: string | null };
};

type LeaveSyncLog = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  triggerSource: string;
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  employeesNotFound: number;
  typesNotMapped: number;
  attendanceDaysOverridden: number;
  triggeredBy?: { id: string; name: string | null; email: string | null };
};

type EntitlementLeaveType = { id: string; code: string; nameEn: string };

type PublicHolidayEntry = {
  id: string;
  date: string;
  endDate: string | null;
  nameEn: string;
  nameAr: string | null;
  isRecurring: boolean;
};

type EntitlementRow = {
  id: string;
  fullNameEn: string;
  employmentId: string;
  dateOfJoining: string | null;
  monthsEmployed: number;
  entitledDays: number;
  totalConsumed: number;
  remaining: number;
  byType: Record<string, number>;
};

export function LeavesClient({
  canApprove,
  canViewAll,
  canRequest,
  canSync,
  canViewHolidays,
  canManageHolidays,
}: {
  canApprove: boolean;
  canViewAll: boolean;
  canRequest: boolean;
  canSync: boolean;
  canViewHolidays: boolean;
  canManageHolidays: boolean;
}) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [inbox, setInbox] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vacation entitlement (18.17.0)
  const [entitlementRows, setEntitlementRows] = useState<EntitlementRow[]>([]);
  const [entitlementTypes, setEntitlementTypes] = useState<EntitlementLeaveType[]>([]);
  const [entitlementLoading, setEntitlementLoading] = useState(false);
  const [entitlementSearch, setEntitlementSearch] = useState('');

  // Public holidays (18.18.1)
  const [holidays, setHolidays] = useState<PublicHolidayEntry[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  // Dolibarr leaves sync (18.6.0)
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<LeaveSyncLog | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Request form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, balancesRes, mineRes] = await Promise.all([
        fetch('/api/hr/leave-types'),
        fetch('/api/hr/leave-balances'),
        fetch('/api/hr/leave-requests?scope=mine'),
      ]);
      if (typesRes.ok) setLeaveTypes(await typesRes.json());
      if (balancesRes.ok) setBalances(await balancesRes.json());
      if (mineRes.ok) setMyRequests(await mineRes.json());
      if (canApprove) {
        const inboxRes = await fetch('/api/hr/leave-requests?scope=inbox');
        if (inboxRes.ok) setInbox(await inboxRes.json());
      }
      if (canViewAll) {
        const allRes = await fetch('/api/hr/leave-requests?scope=all');
        if (allRes.ok) setAllRequests(await allRes.json());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [canApprove, canViewAll]);

  const loadLastSync = useCallback(async () => {
    if (!canSync) return;
    try {
      const res = await fetch('/api/hr/leave-requests/sync');
      if (res.ok) {
        const logs: LeaveSyncLog[] = await res.json();
        setLastSync(logs[0] ?? null);
      }
    } catch {
      // non-fatal
    }
  }, [canSync]);

  const loadEntitlement = useCallback(async () => {
    if (!canViewAll) return;
    setEntitlementLoading(true);
    try {
      const res = await fetch('/api/hr/vacation-entitlement');
      if (res.ok) {
        const data = await res.json();
        setEntitlementTypes(data.leaveTypes ?? []);
        setEntitlementRows(data.rows ?? []);
      }
    } catch {
      // non-fatal
    } finally {
      setEntitlementLoading(false);
    }
  }, [canViewAll]);

  const loadHolidays = useCallback(async () => {
    if (!canViewHolidays) return;
    setHolidaysLoading(true);
    try {
      const res = await fetch('/api/hr/public-holidays');
      if (res.ok) setHolidays(await res.json());
    } catch {
      // non-fatal
    } finally {
      setHolidaysLoading(false);
    }
  }, [canViewHolidays]);

  useEffect(() => {
    refresh();
    loadLastSync();
    loadEntitlement();
    loadHolidays();
  }, [refresh, loadLastSync, loadEntitlement, loadHolidays]);

  async function runSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/hr/leave-requests/sync', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Sync failed');
      }
      await loadLastSync();
      await refresh();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function submit(kind: 'draft' | 'submit') {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, submit: kind === 'submit' }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed');
      }
      setShowForm(false);
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  async function act(id: string, action: 'submit' | 'approve' | 'reject', reason?: string) {
    setError(null);
    try {
      const res = await fetch(`/api/hr/leave-requests/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function cancel(id: string) {
    if (!confirm('Cancel this leave request?')) return;
    try {
      const res = await fetch(`/api/hr/leave-requests/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  const selectedType = leaveTypes.find((t) => t.id === form.leaveTypeId);
  const selectedBalance = balances.find((b) => b.leaveTypeId === form.leaveTypeId);

  const totalAvailable = balances.reduce((sum, b) => sum + Number(b.available || 0), 0);
  const totalAccrued = balances.reduce((sum, b) => sum + Number(b.accruedYtd || 0), 0);
  const totalUsed = balances.reduce((sum, b) => sum + Number(b.usedYtd || 0), 0);
  const pendingCount = myRequests.filter((r) => r.status.startsWith('PENDING_')).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Hero header */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <CalendarClock className="absolute -right-8 -top-8 h-48 w-48" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <CalendarClock className="h-3.5 w-3.5" />
                HR · Leaves
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Leave Management</h1>
              <p className="mt-1 text-sky-100 text-sm md:text-base">
                Request, approve and track leaves. Dolibarr leaves mirror in read-only and always win over sheet codes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canSync && (
                <Button
                  variant="secondary"
                  onClick={runSync}
                  disabled={syncing}
                  className="bg-white text-sky-700 hover:bg-sky-50 border-0 shadow-sm"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <CloudDownload className="h-4 w-4 mr-1.5" />
                  )}
                  Sync from Dolibarr
                </Button>
              )}
              {canRequest && !showForm && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-white text-sky-700 hover:bg-sky-50 border-0 shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Request leave
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <KpiTile
            label="Available balance"
            value={totalAvailable.toFixed(1)}
            hint="days across all types"
            tone="emerald"
          />
          <KpiTile
            label="Accrued this year"
            value={totalAccrued.toFixed(1)}
            hint="days earned YTD"
            tone="sky"
          />
          <KpiTile
            label="Used this year"
            value={totalUsed.toFixed(1)}
            hint="days consumed YTD"
            tone="violet"
          />
          <KpiTile
            label="Pending approvals"
            value={String(pendingCount)}
            hint="from your requests"
            tone="amber"
          />
        </div>

        {/* Sync status strip */}
        {canSync && (lastSync || syncError) && (
          <Card className="border-slate-200">
            <CardContent className="py-4">
              {syncError && (
                <div className="flex items-start gap-2 text-red-700">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Sync failed</div>
                    <div className="text-sm text-red-600/90">{syncError}</div>
                  </div>
                </div>
              )}
              {lastSync && !syncError && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {lastSync.status === 'SUCCESS' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : lastSync.status === 'FAILED' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="font-medium">Last Dolibarr sync</span>
                    <Badge
                      variant={
                        lastSync.status === 'SUCCESS'
                          ? 'default'
                          : lastSync.status === 'FAILED'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {lastSync.status}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(lastSync.startedAt).toLocaleString()} · by {lastSync.triggeredBy?.name ?? '—'} (
                    {lastSync.triggerSource})
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Pill label="read" value={lastSync.rowsRead} />
                    <Pill label="created" value={lastSync.rowsCreated} tone="emerald" />
                    <Pill label="updated" value={lastSync.rowsUpdated} tone="sky" />
                    <Pill label="skipped" value={lastSync.rowsSkipped} />
                    {lastSync.employeesNotFound > 0 && (
                      <Pill label="not matched" value={lastSync.employeesNotFound} tone="amber" />
                    )}
                    {lastSync.attendanceDaysOverridden > 0 && (
                      <Pill label="attendance overridden" value={lastSync.attendanceDaysOverridden} tone="violet" />
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

      {showForm && (
        <Card className="border-sky-200 shadow-sm">
          <CardHeader className="bg-sky-50/50">
            <CardTitle className="flex items-center gap-2 text-sky-900">
              <Plus className="h-5 w-5" /> New leave request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Leave type</Label>
                <select
                  className="w-full border rounded-md h-10 px-3"
                  value={form.leaveTypeId}
                  onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameEn} ({t.payType.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
              {selectedBalance && (
                <div className="col-span-2 rounded-md bg-muted p-3 text-sm space-y-1">
                  <div>
                    Available balance: <strong>{selectedBalance.available.toFixed(2)}</strong> days
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Used YTD: {selectedBalance.usedFullyPaid.toFixed(1)} fully paid ·{' '}
                    {selectedBalance.usedHalfPaid.toFixed(1)} half paid ·{' '}
                    {selectedBalance.usedUnpaid.toFixed(1)} unpaid
                  </div>
                  {selectedBalance.available <= 0 && (
                    <div className="flex items-center gap-1 text-amber-700 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      You are requesting an advance (negative balance).
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label>Start date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Reason (optional)</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => submit('draft')} disabled={submitting}>
                Save as draft
              </Button>
              <Button onClick={() => submit('submit')} disabled={submitting || !form.leaveTypeId || !form.startDate || !form.endDate}>
                {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </div>
            {selectedType && (
              <p className="text-xs text-muted-foreground">
                {selectedType.nameEn}: accrues {selectedType.monthlyAccrualDays} days/month, carry-over
                cap {selectedType.maxCarryOverDays} days.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Balances */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <CardTitle className="text-base font-semibold text-slate-800">
            My balances · {new Date().getFullYear()}
          </CardTitle>
          <span className="text-xs text-muted-foreground">updated live</span>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading balances…
            </div>
          ) : balances.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-muted-foreground">
              Your account is not linked to an employee. Contact HR to link your user to an employee record.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {balances.map((b) => (
                <div
                  key={b.leaveTypeId}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-300 hover:shadow-sm transition"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                    {b.leaveType.nameEn}
                  </div>
                  <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
                    {Number(b.available).toFixed(1)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
                    <div>Opening {Number(b.openingBalance).toFixed(1)}</div>
                    <div>Accrued {Number(b.accruedYtd).toFixed(1)} · Used {Number(b.usedYtd).toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="mine" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="mine" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            My requests ({myRequests.length})
          </TabsTrigger>
          {canApprove && (
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-4 w-4" />
              Inbox ({inbox.length})
            </TabsTrigger>
          )}
          {canViewAll && (
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              All ({allRequests.length})
            </TabsTrigger>
          )}
          {canViewAll && (
            <TabsTrigger value="balance" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Vacation Balance
            </TabsTrigger>
          )}
          {canViewHolidays && (
            <TabsTrigger value="holidays" className="gap-2">
              <Sun className="h-4 w-4" />
              Public Holidays
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mine" className="space-y-3 mt-4">
          <RequestTable
            requests={myRequests}
            canApprove={false}
            onAct={act}
            onCancel={cancel}
            showEmployee={false}
          />
        </TabsContent>

        {canApprove && (
          <TabsContent value="inbox" className="space-y-3 mt-4">
            <RequestTable
              requests={inbox}
              canApprove={true}
              onAct={act}
              onCancel={cancel}
              showEmployee={true}
            />
          </TabsContent>
        )}

        {canViewAll && (
          <TabsContent value="all" className="space-y-3 mt-4">
            <RequestTable
              requests={allRequests}
              canApprove={canApprove}
              onAct={act}
              onCancel={cancel}
              showEmployee={true}
            />
          </TabsContent>
        )}

        {canViewAll && (
          <TabsContent value="balance" className="space-y-4 mt-4">
            <VacationBalanceTab
              rows={entitlementRows}
              leaveTypes={entitlementTypes}
              loading={entitlementLoading}
              search={entitlementSearch}
              onSearchChange={setEntitlementSearch}
            />
          </TabsContent>
        )}

        {canViewHolidays && (
          <TabsContent value="holidays" className="space-y-4 mt-4">
            <PublicHolidaysTab
              holidays={holidays}
              loading={holidaysLoading}
              canManage={canManageHolidays}
              onRefresh={loadHolidays}
            />
          </TabsContent>
        )}
        </Tabs>
      </div>
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
  sky: 'from-sky-50 to-white border-sky-200 text-sky-700',
  violet: 'from-violet-50 to-white border-violet-200 text-violet-700',
  amber: 'from-amber-50 to-white border-amber-200 text-amber-700',
};

function KpiTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'emerald' | 'sky' | 'violet' | 'amber';
}) {
  return (
    <div
      className={`rounded-xl border bg-gradient-to-b p-4 shadow-sm ${TONE_CLASSES[tone]}`}
    >
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
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

function RequestTable({
  requests,
  canApprove,
  onAct,
  onCancel,
  showEmployee,
}: {
  requests: LeaveRequest[];
  canApprove: boolean;
  onAct: (id: string, action: 'submit' | 'approve' | 'reject', reason?: string) => void;
  onCancel: (id: string) => void;
  showEmployee: boolean;
}) {
  if (requests.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Inbox className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-muted-foreground">No requests to show.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b">
            <tr>
              {showEmployee && <th className="py-3 px-4 font-medium">Employee</th>}
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">From</th>
              <th className="py-3 px-4 font-medium">To</th>
              <th className="py-3 px-4 font-medium text-right">Days</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/60 transition">
                {showEmployee && (
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{r.employee?.fullNameEn}</div>
                    <div className="text-xs text-muted-foreground">{r.employee?.employmentId}</div>
                  </td>
                )}
                <td className="py-3 px-4">{r.leaveType.nameEn}</td>
                <td className="py-3 px-4 text-muted-foreground">{new Date(r.startDate).toLocaleDateString()}</td>
                <td className="py-3 px-4 text-muted-foreground">{new Date(r.endDate).toLocaleDateString()}</td>
                <td className="py-3 px-4 text-right font-semibold tabular-nums">{Number(r.workingDays).toFixed(1)}</td>
                <td className="py-3 px-4 space-x-1">
                  <StatusBadge status={r.status} />
                  {r.wasOverBalance && (
                    <Badge variant="outline" className="text-amber-700 border-amber-400">
                      Advance
                    </Badge>
                  )}
                </td>
                <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                  {r.status === 'DRAFT' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => onAct(r.id, 'submit')}>
                        Submit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onCancel(r.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {canApprove && r.status.startsWith('PENDING_') && (
                    <>
                      <Button size="sm" variant="default" onClick={() => onAct(r.id, 'approve')}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Reason for rejection?') ?? undefined;
                          if (reason !== undefined) onAct(r.id, 'reject', reason);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function calcHolidayDays(start: string, end: string | null): number {
  if (!end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 1;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

function PublicHolidaysTab({
  holidays,
  loading,
  canManage,
  onRefresh,
}: {
  holidays: PublicHolidayEntry[];
  loading: boolean;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', endDate: '', nameEn: '', nameAr: '', isRecurring: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const thisYear = new Date().getFullYear();

  const upcoming = holidays.filter((h) => h.date >= today);
  const thisYearCount = holidays.filter((h) => h.date.startsWith(String(thisYear))).length;
  const totalDays = holidays.reduce((s, h) => s + calcHolidayDays(h.date, h.endDate), 0);

  function openCreate() {
    setEditingId(null);
    setForm({ date: '', endDate: '', nameEn: '', nameAr: '', isRecurring: false });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(h: PublicHolidayEntry) {
    setEditingId(h.id);
    setForm({ date: h.date, endDate: h.endDate ?? '', nameEn: h.nameEn, nameAr: h.nameAr ?? '', isRecurring: h.isRecurring });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nameEn.trim() || !form.date) { setFormError('Date and name are required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const body = { date: form.date, endDate: form.endDate || null, nameEn: form.nameEn.trim(), nameAr: form.nameAr.trim() || null, isRecurring: form.isRecurring };
      const res = editingId
        ? await fetch(`/api/hr/public-holidays/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/hr/public-holidays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Failed'); }
      setDialogOpen(false);
      onRefresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/hr/public-holidays/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total Holidays</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{holidays.length}</p>
          <p className="text-xs text-amber-500 mt-0.5">on record</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">This Year</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{thisYearCount}</p>
          <p className="text-xs text-sky-500 mt-0.5">in {thisYear}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Upcoming</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{upcoming.length}</p>
          <p className="text-xs text-emerald-500 mt-0.5">from today</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Days</p>
          <p className="text-2xl font-bold text-violet-700 mt-1">{totalDays}</p>
          <p className="text-xs text-violet-500 mt-0.5">calendar days</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 gap-3 flex-wrap">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            Public Holidays
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Holiday
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading holidays…
            </div>
          ) : holidays.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No public holidays defined yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">End Date</th>
                    <th className="py-3 px-4 font-medium">Name (EN)</th>
                    <th className="py-3 px-4 font-medium">Name (AR)</th>
                    <th className="py-3 px-4 font-medium text-right">Days</th>
                    <th className="py-3 px-4 font-medium">Recurring</th>
                    {canManage && <th className="py-3 px-4"></th>}
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => {
                    const isPast = h.date < today;
                    return (
                      <tr key={h.id} className={`border-b last:border-0 hover:bg-slate-50/60 transition ${isPast ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {new Date(h.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {h.endDate ? new Date(h.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="py-3 px-4">{h.nameEn}</td>
                        <td className="py-3 px-4 text-muted-foreground">{h.nameAr || '—'}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-700">
                          {calcHolidayDays(h.date, h.endDate)}
                        </td>
                        <td className="py-3 px-4">
                          {h.isRecurring ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Yearly</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Once</span>
                          )}
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(h)} className="h-7 w-7 p-0">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(h.id, h.nameEn)} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Holiday' : 'Add Public Holiday'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>End Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Name (English)</Label>
                <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="e.g. National Day" />
              </div>
              <div>
                <Label>Name (Arabic) <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="اليوم الوطني" dir="rtl" />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="hol-recurring"
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="rounded border-slate-300 h-4 w-4"
                />
                <Label htmlFor="hol-recurring" className="cursor-pointer font-normal">Recurring every year</Label>
              </div>
              {formError && <p className="text-xs text-red-600 rounded border border-red-200 bg-red-50 px-3 py-2">{formError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'APPROVED' ? 'default' :
    status === 'REJECTED' || status === 'CANCELLED' ? 'destructive' :
    status === 'DRAFT' ? 'outline' :
    'secondary';
  return <Badge variant={variant}>{status.replace('_', ' ')}</Badge>;
}

function VacationBalanceTab({
  rows,
  leaveTypes,
  loading,
  search,
  onSearchChange,
}: {
  rows: EntitlementRow[];
  leaveTypes: EntitlementLeaveType[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const filtered = search.trim()
    ? rows.filter(
        (r) =>
          r.fullNameEn.toLowerCase().includes(search.toLowerCase()) ||
          r.employmentId.toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  const totalEntitled = rows.reduce((s, r) => s + r.entitledDays, 0);
  const totalConsumed = rows.reduce((s, r) => s + r.totalConsumed, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Employees</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{rows.length}</p>
          <p className="text-xs text-sky-500 mt-0.5">active</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Entitled</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{totalEntitled.toFixed(1)}</p>
          <p className="text-xs text-emerald-500 mt-0.5">days @ 1.75/month</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Consumed</p>
          <p className="text-2xl font-bold text-violet-700 mt-1">{totalConsumed.toFixed(1)}</p>
          <p className="text-xs text-violet-500 mt-0.5">approved leaves</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total Remaining</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{totalRemaining.toFixed(1)}</p>
          <p className="text-xs text-amber-500 mt-0.5">balance days</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 gap-3 flex-wrap">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-600" />
            Vacation Entitlement — All Employees
          </CardTitle>
          <Input
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-56 h-8 text-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading entitlement data…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? 'No employees match your search.' : 'No active employees found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium">Employee</th>
                    <th className="py-3 px-4 font-medium">Contract Date</th>
                    <th className="py-3 px-4 font-medium text-right">Months</th>
                    <th className="py-3 px-4 font-medium text-right">Entitled</th>
                    {leaveTypes.map((lt) => (
                      <th key={lt.id} className="py-3 px-4 font-medium text-right whitespace-nowrap">
                        {lt.nameEn}
                      </th>
                    ))}
                    <th className="py-3 px-4 font-medium text-right">Consumed</th>
                    <th className="py-3 px-4 font-medium text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const isNegative = row.remaining < 0;
                    return (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{row.fullNameEn}</div>
                          <div className="text-xs text-muted-foreground">{row.employmentId}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.dateOfJoining
                            ? new Date(row.dateOfJoining).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-700">
                          {row.monthsEmployed}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-700">
                          {row.entitledDays.toFixed(1)}
                        </td>
                        {leaveTypes.map((lt) => (
                          <td key={lt.id} className="py-3 px-4 text-right tabular-nums text-slate-600">
                            {(row.byType[lt.code] ?? 0) > 0
                              ? (row.byType[lt.code] ?? 0).toFixed(1)
                              : <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right tabular-nums font-medium text-violet-700">
                          {row.totalConsumed.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold">
                          <span className={isNegative ? 'text-rose-600' : 'text-slate-900'}>
                            {row.remaining.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400 text-center">
        Entitlement = 1.75 days × months from contract date. Consumed = sum of all approved leave requests.
        Negative remaining indicates the employee has taken more leave than entitled.
      </p>
    </div>
  );
}
