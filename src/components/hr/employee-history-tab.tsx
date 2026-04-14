'use client';

/**
 * 18.9.0 — Employment + salary history timeline for a single employee.
 * Rendered inside a tab on /hr/employees/[id]. Two stacked sections:
 *   (1) Position timeline  — promotions, transfers, role changes
 *   (2) Salary timeline    — basic + allowances, CEO-approval cycle
 *
 * All mutations are gated at the API level; this component just shows/hides
 * buttons to avoid giving users false hope on clicks they can't make.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Check, X, Send } from 'lucide-react';

type PositionReason =
  | 'HIRED'
  | 'PROMOTED'
  | 'TRANSFERRED'
  | 'DEMOTED'
  | 'ROLE_CHANGE'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'REHIRED';

type SalaryReason =
  | 'HIRED'
  | 'ANNUAL_INCREMENT'
  | 'PROMOTION'
  | 'ADJUSTMENT'
  | 'COLA'
  | 'CORRECTION'
  | 'DEMOTION';

type SalaryStatus = 'DRAFT' | 'PENDING_HR' | 'PENDING_CEO' | 'APPROVED' | 'REJECTED';

interface PositionRow {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  positionTitle: string;
  section: string | null;
  division: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  reason: PositionReason;
  notes: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

interface SalaryRow {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  basicSalary: string;
  housingAllowance: string;
  transportAllowance: string;
  mobileAllowance: string;
  foodAllowance: string;
  otherAllowances: string;
  reason: SalaryReason;
  notes: string | null;
  status: SalaryStatus;
  positionHistory: { id: string; positionTitle: string } | null;
  submittedBy: { id: string; name: string } | null;
  hrApprovedBy: { id: string; name: string } | null;
  ceoApprovedBy: { id: string; name: string } | null;
  rejectedBy: { id: string; name: string } | null;
  rejectReason: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

interface Props {
  employeeId: string;
  departments: { id: string; name: string }[];
  canManagePosition: boolean;
  canManageSalary: boolean;
  canApproveHr: boolean;
  canApproveCeo: boolean;
}

const POSITION_REASONS: PositionReason[] = [
  'HIRED',
  'PROMOTED',
  'TRANSFERRED',
  'DEMOTED',
  'ROLE_CHANGE',
  'RESIGNED',
  'TERMINATED',
  'REHIRED',
];

const SALARY_REASONS: SalaryReason[] = [
  'HIRED',
  'ANNUAL_INCREMENT',
  'PROMOTION',
  'ADJUSTMENT',
  'COLA',
  'CORRECTION',
  'DEMOTION',
];

function formatDate(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toISOString().slice(0, 10);
}

function statusBadgeVariant(status: SalaryStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'APPROVED':
      return 'default';
    case 'REJECTED':
      return 'destructive';
    case 'DRAFT':
      return 'outline';
    default:
      return 'secondary';
  }
}

function money(v: string): string {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function EmployeeHistoryTab({
  employeeId,
  departments,
  canManagePosition,
  canManageSalary,
  canApproveHr,
  canApproveCeo,
}: Props) {
  const [positionRows, setPositionRows] = useState<PositionRow[]>([]);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [posRes, salRes] = await Promise.all([
        fetch(`/api/hr/employees/${employeeId}/position-history`),
        fetch(`/api/hr/employees/${employeeId}/salary-history`),
      ]);
      if (!posRes.ok) throw new Error(`Position history: ${posRes.status}`);
      if (!salRes.ok) throw new Error(`Salary history: ${salRes.status}`);
      setPositionRows(await posRes.json());
      setSalaryRows(await salRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load history: {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Position history</CardTitle>
          {canManagePosition && (
            <AddPositionDialog
              employeeId={employeeId}
              departments={departments}
              onSaved={() => void load()}
            />
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : positionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No position history recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {positionRows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-1 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.positionTitle}</span>
                      <Badge variant="outline">{r.reason}</Badge>
                      {r.effectiveTo === null && <Badge>Current</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.effectiveFrom)} → {formatDate(r.effectiveTo)}
                      {r.department && <> · {r.department.name}</>}
                      {r.section && <> · {r.section}</>}
                      {r.division && <> · {r.division}</>}
                    </div>
                    {r.notes && <div className="text-xs italic">{r.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Salary history</CardTitle>
          {canManageSalary && (
            <AddSalaryDialog
              employeeId={employeeId}
              positionRows={positionRows}
              onSaved={() => void load()}
            />
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : salaryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No salary history recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {salaryRows.map((r) => (
                <SalaryRowCard
                  key={r.id}
                  row={r}
                  employeeId={employeeId}
                  canManage={canManageSalary}
                  canApproveHr={canApproveHr}
                  canApproveCeo={canApproveCeo}
                  onAction={() => void load()}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddPositionDialog({
  employeeId,
  departments,
  onSaved,
}: {
  employeeId: string;
  departments: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [positionTitle, setPositionTitle] = useState('');
  const [reason, setReason] = useState<PositionReason>('PROMOTED');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}/position-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectiveFrom,
          positionTitle,
          reason,
          departmentId: departmentId || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      setPositionTitle('');
      setNotes('');
      setDepartmentId('');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" /> Record change
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New position change</DialogTitle>
          <DialogDescription>
            Records a promotion, transfer, or role change. The previous open row is closed
            automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Position title</Label>
            <Input
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
              placeholder="Fabricator, Foreman, …"
            />
          </div>
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as PositionReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={departmentId || 'none'} onValueChange={(v) => setDepartmentId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <div className="col-span-2 text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !positionTitle || !effectiveFrom}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSalaryDialog({
  employeeId,
  positionRows,
  onSaved,
}: {
  employeeId: string;
  positionRows: PositionRow[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [basicSalary, setBasicSalary] = useState('');
  const [housing, setHousing] = useState('');
  const [transport, setTransport] = useState('');
  const [mobile, setMobile] = useState('');
  const [food, setFood] = useState('');
  const [other, setOther] = useState('');
  const [reason, setReason] = useState<SalaryReason>('ANNUAL_INCREMENT');
  const [positionHistoryId, setPositionHistoryId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitNow, setSubmitNow] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}/salary-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectiveFrom,
          basicSalary,
          housingAllowance: housing || '0',
          transportAllowance: transport || '0',
          mobileAllowance: mobile || '0',
          foodAllowance: food || '0',
          otherAllowances: other || '0',
          reason,
          positionHistoryId: positionHistoryId || null,
          notes: notes || null,
          submit: submitNow,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      setBasicSalary('');
      setHousing('');
      setTransport('');
      setMobile('');
      setFood('');
      setOther('');
      setNotes('');
      setPositionHistoryId('');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" /> Record raise
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New salary change</DialogTitle>
          <DialogDescription>
            Drafts a raise, increment, or adjustment. Submitting it kicks off the approval cycle
            (HR → CEO). Only a final CEO sign-off applies the new amounts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as SalaryReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALARY_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Basic salary</Label>
            <Input value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Housing</Label>
            <Input value={housing} onChange={(e) => setHousing(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Transport</Label>
            <Input value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Food</Label>
            <Input value={food} onChange={(e) => setFood(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Other</Label>
            <Input value={other} onChange={(e) => setOther(e.target.value)} placeholder="0.00" />
          </div>
          <div className="col-span-2">
            <Label>Link to a position change (optional)</Label>
            <Select
              value={positionHistoryId || 'none'}
              onValueChange={(v) => setPositionHistoryId(v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {positionRows.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.positionTitle} ({formatDate(p.effectiveFrom)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-2 text-sm">
            <input
              id="submit-now"
              type="checkbox"
              checked={submitNow}
              onChange={(e) => setSubmitNow(e.target.checked)}
            />
            <label htmlFor="submit-now">Submit for HR approval immediately</label>
          </div>
          {error && <div className="col-span-2 text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !basicSalary || !effectiveFrom}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save {submitNow ? '& submit' : 'as draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SalaryRowCard({
  row,
  employeeId,
  canManage,
  canApproveHr,
  canApproveCeo,
  onAction,
}: {
  row: SalaryRow;
  employeeId: string;
  canManage: boolean;
  canApproveHr: boolean;
  canApproveCeo: boolean;
  onAction: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'submit' | 'approveHr' | 'approveCeo' | 'reject') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(
        `/api/hr/employees/${employeeId}/salary-history/${row.id}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const total =
    parseFloat(row.basicSalary || '0') +
    parseFloat(row.housingAllowance || '0') +
    parseFloat(row.transportAllowance || '0') +
    parseFloat(row.mobileAllowance || '0') +
    parseFloat(row.foodAllowance || '0') +
    parseFloat(row.otherAllowances || '0');

  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant(row.status)}>{row.status.replace('_', ' ')}</Badge>
          <Badge variant="outline">{row.reason}</Badge>
          {row.effectiveTo === null && row.status === 'APPROVED' && <Badge>Current</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(row.effectiveFrom)} → {formatDate(row.effectiveTo)}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        <div>
          <span className="text-muted-foreground">Basic</span> {money(row.basicSalary)}
        </div>
        <div>
          <span className="text-muted-foreground">Housing</span> {money(row.housingAllowance)}
        </div>
        <div>
          <span className="text-muted-foreground">Transport</span> {money(row.transportAllowance)}
        </div>
        <div>
          <span className="text-muted-foreground">Mobile</span> {money(row.mobileAllowance)}
        </div>
        <div>
          <span className="text-muted-foreground">Food</span> {money(row.foodAllowance)}
        </div>
        <div>
          <span className="text-muted-foreground">Other</span> {money(row.otherAllowances)}
        </div>
        <div className="col-span-2 sm:col-span-3">
          <span className="text-muted-foreground">Total package</span>{' '}
          <span className="font-medium">{money(total.toString())}</span>
        </div>
      </div>
      {row.notes && <div className="mt-1 text-xs italic text-muted-foreground">{row.notes}</div>}
      {row.rejectReason && (
        <div className="mt-1 text-xs text-destructive">Rejected: {row.rejectReason}</div>
      )}
      <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
        {row.submittedBy && <span>Submitted by {row.submittedBy.name}</span>}
        {row.hrApprovedBy && <span>· HR: {row.hrApprovedBy.name}</span>}
        {row.ceoApprovedBy && <span>· CEO: {row.ceoApprovedBy.name}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {row.status === 'DRAFT' && canManage && (
          <Button size="sm" variant="outline" onClick={() => act('submit')} disabled={busy !== null}>
            {busy === 'submit' ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Send className="mr-1 h-3 w-3" />
            )}
            Submit to HR
          </Button>
        )}
        {row.status === 'PENDING_HR' && canApproveHr && (
          <>
            <Button size="sm" onClick={() => act('approveHr')} disabled={busy !== null}>
              {busy === 'approveHr' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              HR approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => act('reject')}
              disabled={busy !== null}
            >
              <X className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </>
        )}
        {row.status === 'PENDING_CEO' && canApproveCeo && (
          <>
            <Button size="sm" onClick={() => act('approveCeo')} disabled={busy !== null}>
              {busy === 'approveCeo' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              CEO approve (final)
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => act('reject')}
              disabled={busy !== null}
            >
              <X className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </>
        )}
      </div>
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </div>
  );
}
