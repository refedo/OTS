'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Banknote, Plus, Loader2 } from 'lucide-react';

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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function PayrollPeriodsClient({
  canCalculate,
  canApprove,
  canLock,
  canExport,
}: {
  canCalculate: boolean;
  canApprove: boolean;
  canLock: boolean;
  canExport: boolean;
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

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/payroll-periods');
      if (res.ok) setPeriods(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Banknote className="h-6 w-6" />
          Payroll
        </h1>
        {canCalculate && !showNew && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New period
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showNew && (
        <Card>
          <CardHeader>
            <CardTitle>Create a new payroll period</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || now.getFullYear() })} />
            </div>
            <div>
              <Label>Month</Label>
              <select
                className="w-full border rounded-md h-10 px-3"
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
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={create} disabled={creating || !form.cutoffDate || !form.payDate}>
                {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Periods</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll periods yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Period</th>
                  <th>Status</th>
                  <th className="text-right">Lines</th>
                  <th className="text-right">Adjustments</th>
                  <th>Pay date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 font-medium">
                      {MONTHS[p.month - 1]} {p.year}
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="text-right">{p._count?.lines ?? 0}</td>
                    <td className="text-right">{p._count?.adjustments ?? 0}</td>
                    <td>{new Date(p.payDate).toLocaleDateString()}</td>
                    <td className="text-right">
                      <Link href={`/hr/payroll/${p.id}`}>
                        <Button size="sm" variant="ghost">
                          Open
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Workflow: DRAFT → CALCULATED → APPROVED → LOCKED. Generate the Alinma WPS file once a
        period is APPROVED. Payslip PDFs become available to employees after calculation.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'LOCKED' ? 'destructive' :
    status === 'APPROVED' || status === 'PAID' ? 'default' :
    status === 'CALCULATED' ? 'secondary' :
    'outline';
  return <Badge variant={color}>{status}</Badge>;
}
