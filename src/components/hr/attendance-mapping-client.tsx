'use client';

/**
 * /hr/attendance/mapping — client view of AttendanceMappingCandidate rows.
 *
 * Three tabs: Unmapped (need action), Resolved (already linked, can
 * relink or ignore), Ignored (false positives, can restore). Each row
 * shows the raw sheet identifier/display name and the last time it
 * appeared in a sync run.
 *
 * Actions:
 *   - Link  → POST /api/hr/attendance/mapping/[id]/link  { employeeId }
 *   - Ignore → POST /api/hr/attendance/mapping/[id]/ignore { reason }
 *   - Restore → DELETE /api/hr/attendance/mapping/[id]/ignore
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeePicker, type EmployeePickerOption } from '@/components/hr/employee-picker';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Link as LinkIcon, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';

type Candidate = {
  id: string;
  identifier: string;
  workerType: 'EMPLOYEE' | 'MANPOWER_SLOT';
  displayName: string;
  status: 'UNMAPPED' | 'RESOLVED' | 'IGNORED';
  resolvedEmployee: {
    id: string;
    employmentId: string;
    fullNameEn: string;
    fullNameAr: string | null;
  } | null;
  resolvedAt: string | null;
  resolvedBy: { id: string; name: string } | null;
  ignoredAt: string | null;
  ignoredBy: { id: string; name: string } | null;
  ignoreReason: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

type Props = {
  candidates: Candidate[];
  employees: EmployeePickerOption[];
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AttendanceMappingClient({ candidates, employees }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [linkDialog, setLinkDialog] = React.useState<{
    candidate: Candidate;
    employeeId: string | null;
  } | null>(null);
  const [ignoreDialog, setIgnoreDialog] = React.useState<{
    candidate: Candidate;
    reason: string;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const unmapped = candidates.filter((c) => c.status === 'UNMAPPED');
  const resolved = candidates.filter((c) => c.status === 'RESOLVED');
  const ignored = candidates.filter((c) => c.status === 'IGNORED');

  async function linkCandidate() {
    if (!linkDialog || !linkDialog.employeeId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/hr/attendance/mapping/${linkDialog.candidate.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: linkDialog.employeeId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      toast({
        title: 'Candidate linked',
        description: `"${linkDialog.candidate.displayName}" will now be treated as the linked employee on the next sync.`,
      });
      setLinkDialog(null);
      router.refresh();
    } catch (err) {
      toast({
        title: 'Link failed',
        description: err instanceof Error ? err.message : 'Failed to link candidate',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  async function ignoreCandidate() {
    if (!ignoreDialog) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/hr/attendance/mapping/${ignoreDialog.candidate.id}/ignore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: ignoreDialog.reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      toast({
        title: 'Candidate ignored',
        description: `"${ignoreDialog.candidate.displayName}" will be skipped on future syncs.`,
      });
      setIgnoreDialog(null);
      router.refresh();
    } catch (err) {
      toast({
        title: 'Ignore failed',
        description: err instanceof Error ? err.message : 'Failed to ignore candidate',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  async function restoreCandidate(candidate: Candidate) {
    setBusy(true);
    try {
      const res = await fetch(`/api/hr/attendance/mapping/${candidate.id}/ignore`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      toast({
        title: 'Candidate restored',
        description: `"${candidate.displayName}" is back in the unmapped queue.`,
      });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Restore failed',
        description: err instanceof Error ? err.message : 'Failed to restore candidate',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  function renderRow(c: Candidate, variant: 'unmapped' | 'resolved' | 'ignored') {
    return (
      <div
        key={c.id}
        className="flex items-center justify-between gap-3 border rounded-md p-3 text-sm"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              {c.identifier}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {c.workerType === 'EMPLOYEE' ? 'Employee' : 'Manpower'}
            </Badge>
            <span className="truncate font-medium">{c.displayName}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            First seen {formatDate(c.firstSeenAt)} · Last seen {formatDate(c.lastSeenAt)}
          </div>
          {variant === 'resolved' && c.resolvedEmployee && (
            <div className="text-xs text-green-700 mt-1">
              → Linked to{' '}
              <Link
                href={`/hr/employees/${c.resolvedEmployee.id}`}
                className="underline font-medium"
              >
                {c.resolvedEmployee.employmentId} · {c.resolvedEmployee.fullNameEn}
              </Link>
              {c.resolvedBy && <> by {c.resolvedBy.name}</>}
              {c.resolvedAt && <> on {formatDate(c.resolvedAt)}</>}
            </div>
          )}
          {variant === 'ignored' && (
            <div className="text-xs text-red-700 mt-1">
              Ignored{c.ignoredBy ? ` by ${c.ignoredBy.name}` : ''}
              {c.ignoredAt && ` on ${formatDate(c.ignoredAt)}`}
              {c.ignoreReason && ` — “${c.ignoreReason}”`}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {variant !== 'resolved' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => setLinkDialog({ candidate: c, employeeId: null })}
              disabled={busy}
            >
              <LinkIcon className="mr-1 h-3 w-3" />
              Link
            </Button>
          )}
          {variant === 'resolved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setLinkDialog({
                  candidate: c,
                  employeeId: c.resolvedEmployee?.id ?? null,
                })
              }
              disabled={busy}
            >
              Relink
            </Button>
          )}
          {variant !== 'ignored' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIgnoreDialog({ candidate: c, reason: '' })}
              disabled={busy}
            >
              <XCircle className="mr-1 h-3 w-3" />
              Ignore
            </Button>
          )}
          {variant === 'ignored' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => restoreCandidate(c)}
              disabled={busy}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Restore
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/attendance">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Attendance
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Attendance mapping</h1>
            <p className="text-sm text-muted-foreground">
              Link unknown sheet rows to an employee, or permanently ignore false positives.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Unmapped</div>
            <div className="text-2xl font-semibold text-orange-600">{unmapped.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Resolved</div>
            <div className="text-2xl font-semibold text-green-700">{resolved.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Ignored</div>
            <div className="text-2xl font-semibold text-slate-500">{ignored.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="unmapped">
        <TabsList>
          <TabsTrigger value="unmapped">
            Unmapped {unmapped.length > 0 && <Badge className="ml-2">{unmapped.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
          <TabsTrigger value="ignored">Ignored ({ignored.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="unmapped">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Sheet rows that couldn't be resolved to an OTS employee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unmapped.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nothing to map — every sheet row resolved cleanly.
                </div>
              ) : (
                unmapped.map((c) => renderRow(c, 'unmapped'))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="resolved">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manually linked rows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resolved.length === 0 ? (
                <div className="text-sm text-muted-foreground">No resolved candidates yet.</div>
              ) : (
                resolved.map((c) => renderRow(c, 'resolved'))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ignored">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permanently ignored rows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ignored.length === 0 ? (
                <div className="text-sm text-muted-foreground">No ignored candidates.</div>
              ) : (
                ignored.map((c) => renderRow(c, 'ignored'))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link dialog */}
      <Dialog open={!!linkDialog} onOpenChange={(o) => !o && setLinkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to employee</DialogTitle>
            <DialogDescription>
              Pick the OTS employee that sheet row{' '}
              <span className="font-mono">{linkDialog?.candidate.identifier}</span> (
              <strong>{linkDialog?.candidate.displayName}</strong>) actually refers to. The next
              sync will start writing their attendance to that employee's record.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <EmployeePicker
              employees={employees}
              value={linkDialog?.employeeId ?? null}
              onChange={(id) =>
                setLinkDialog((prev) => (prev ? { ...prev, employeeId: id } : prev))
              }
              triggerWidth="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={linkCandidate}
              disabled={busy || !linkDialog?.employeeId}
            >
              {busy ? 'Linking…' : 'Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore dialog */}
      <Dialog open={!!ignoreDialog} onOpenChange={(o) => !o && setIgnoreDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Ignore this row
            </DialogTitle>
            <DialogDescription>
              Future syncs will drop every column for{' '}
              <span className="font-mono">{ignoreDialog?.candidate.identifier}</span> (
              <strong>{ignoreDialog?.candidate.displayName}</strong>). No attendance rows will be
              written. You can restore it later from the Ignored tab.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-muted-foreground">Reason (optional)</label>
            <Input
              value={ignoreDialog?.reason ?? ''}
              onChange={(e) =>
                setIgnoreDialog((prev) => (prev ? { ...prev, reason: e.target.value } : prev))
              }
              placeholder="e.g. removed worker, sheet typo, totals column"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgnoreDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={ignoreCandidate} disabled={busy}>
              {busy ? 'Ignoring…' : 'Ignore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
