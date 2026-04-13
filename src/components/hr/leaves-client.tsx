'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, CalendarClock, Inbox, Users, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';

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

export function LeavesClient({
  canApprove,
  canViewAll,
  canRequest,
  canSync,
}: {
  canApprove: boolean;
  canViewAll: boolean;
  canRequest: boolean;
  canSync: boolean;
}) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [inbox, setInbox] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    refresh();
    loadLastSync();
  }, [refresh, loadLastSync]);

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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <CalendarClock className="h-6 w-6" />
          Leaves
        </h1>
        <div className="flex items-center gap-2">
          {canSync && (
            <Button variant="outline" onClick={runSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Sync from Dolibarr
            </Button>
          )}
          {canRequest && !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Request leave
            </Button>
          )}
        </div>
      </div>

      {canSync && (lastSync || syncError) && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
          {syncError && (
            <div className="text-red-700">Sync failed: {syncError}</div>
          )}
          {lastSync && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-medium">Last Dolibarr sync:</span>
              <Badge variant={lastSync.status === 'SUCCESS' ? 'default' : lastSync.status === 'FAILED' ? 'destructive' : 'secondary'}>
                {lastSync.status}
              </Badge>
              <span className="text-muted-foreground">
                {new Date(lastSync.startedAt).toLocaleString()}
                {' · '}
                by {lastSync.triggeredBy?.name ?? '—'} ({lastSync.triggerSource})
              </span>
              <span className="text-muted-foreground">
                read {lastSync.rowsRead}, created {lastSync.rowsCreated}, updated {lastSync.rowsUpdated}, skipped {lastSync.rowsSkipped}
              </span>
              {lastSync.employeesNotFound > 0 && (
                <span className="text-amber-700">{lastSync.employeesNotFound} employees not matched</span>
              )}
              {lastSync.attendanceDaysOverridden > 0 && (
                <span className="text-muted-foreground">
                  {lastSync.attendanceDaysOverridden} attendance day(s) overridden
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New leave request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
      <Card>
        <CardHeader>
          <CardTitle>My balances — {new Date().getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your account is not linked to an employee. Contact HR.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {balances.map((b) => (
                <div key={b.leaveTypeId} className="rounded-md border p-3">
                  <div className="text-sm font-semibold">{b.leaveType.nameEn}</div>
                  <div className="text-2xl font-bold">{b.available.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">
                    Opening {b.openingBalance.toFixed(1)} · Accrued {b.accruedYtd.toFixed(1)} · Used {b.usedYtd.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            My requests ({myRequests.length})
          </TabsTrigger>
          {canApprove && (
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-4 w-4" />
              Approvals inbox ({inbox.length})
            </TabsTrigger>
          )}
          {canViewAll && (
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              All requests ({allRequests.length})
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
      </Tabs>
    </div>
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
    return <p className="text-sm text-muted-foreground">No requests.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground border-b">
          <tr>
            {showEmployee && <th className="py-2">Employee</th>}
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th className="text-right">Days</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b">
              {showEmployee && (
                <td className="py-2">
                  {r.employee?.employmentId} — {r.employee?.fullNameEn}
                </td>
              )}
              <td>{r.leaveType.nameEn}</td>
              <td>{new Date(r.startDate).toLocaleDateString()}</td>
              <td>{new Date(r.endDate).toLocaleDateString()}</td>
              <td className="text-right">{Number(r.workingDays).toFixed(1)}</td>
              <td>
                <StatusBadge status={r.status} />
                {r.wasOverBalance && (
                  <Badge variant="outline" className="ml-1 text-amber-700 border-amber-400">
                    Advance
                  </Badge>
                )}
              </td>
              <td className="text-right space-x-1">
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
