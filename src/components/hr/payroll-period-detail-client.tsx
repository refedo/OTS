'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calculator, CheckCircle2, Lock, Download, FileText } from 'lucide-react';

type Line = {
  id: string;
  employee: { id: string; employmentId: string; fullNameEn: string };
  basicSalary: string;
  grossPay: string;
  totalDeductions: string;
  totalAdditions: string;
  netPay: string;
  gosiEmployee: string;
  overtimePay: string;
  unpaidLeaveDays: string;
  paidLeaveDays: string;
  absentDaysWithoutPermission: string;
  payslipPdfPath: string | null;
};

type WpsExport = {
  id: string;
  filename: string;
  filePath: string;
  totalEmployees: number;
  totalNet: string;
  status: string;
  generatedAt: string;
};

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
  lines: Line[];
  wpsExports: WpsExport[];
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function PayrollPeriodDetailClient({
  period,
  canCalculate,
  canApprove,
  canLock,
  canExport,
}: {
  period: Period;
  canCalculate: boolean;
  canApprove: boolean;
  canLock: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, path: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(path, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? `Failed to ${label}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  const totalGross = period.lines.reduce((s, l) => s + Number(l.grossPay) + Number(l.totalAdditions), 0);
  const totalDed = period.lines.reduce((s, l) => s + Number(l.totalDeductions), 0);
  const totalNet = period.lines.reduce((s, l) => s + Number(l.netPay), 0);

  const canRecalc = (period.status === 'DRAFT' || period.status === 'CALCULATED') && canCalculate;
  const canApproveNow = period.status === 'CALCULATED' && canApprove;
  const canLockNow = (period.status === 'APPROVED' || period.status === 'PAID') && canLock;
  const canExportNow =
    (period.status === 'APPROVED' || period.status === 'PAID' || period.status === 'LOCKED') && canExport;
  const canGenPayslips = period.lines.length > 0 && canCalculate;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {MONTHS[period.month - 1]} {period.year}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pay date: {new Date(period.payDate).toLocaleDateString()} · Cutoff:{' '}
            {new Date(period.cutoffDate).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={period.status === 'LOCKED' ? 'destructive' : 'secondary'}>{period.status}</Badge>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gross</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SAR {totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SAR {totalDed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SAR {totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {canRecalc && (
          <Button
            onClick={() => run('calculate', `/api/hr/payroll-periods/${period.id}/calculate`)}
            disabled={busy !== null}
          >
            {busy === 'calculate' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
            {period.status === 'CALCULATED' ? 'Recalculate' : 'Calculate'}
          </Button>
        )}
        {canApproveNow && (
          <Button variant="secondary" onClick={() => run('approve', `/api/hr/payroll-periods/${period.id}/approve`)} disabled={busy !== null}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approve
          </Button>
        )}
        {canLockNow && (
          <Button variant="destructive" onClick={() => run('lock', `/api/hr/payroll-periods/${period.id}/lock`)} disabled={busy !== null}>
            <Lock className="h-4 w-4 mr-1" />
            Lock
          </Button>
        )}
        {canExportNow && (
          <Button variant="outline" onClick={() => run('wps', `/api/hr/payroll-periods/${period.id}/wps`)} disabled={busy !== null}>
            <Download className="h-4 w-4 mr-1" />
            Alinma WPS (CSV)
          </Button>
        )}
        {canExportNow && (
          <Button variant="outline" onClick={() => run('wps-sif', `/api/hr/payroll-periods/${period.id}/wps-sif`)} disabled={busy !== null}>
            <Download className="h-4 w-4 mr-1" />
            WPS SIF (SAMA)
          </Button>
        )}
        {canGenPayslips && (
          <Button variant="outline" onClick={() => run('payslips', `/api/hr/payroll-periods/${period.id}/payslips`)} disabled={busy !== null}>
            <FileText className="h-4 w-4 mr-1" />
            Generate payslip PDFs
          </Button>
        )}
      </div>

      {period.wpsExports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>WPS Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {period.wpsExports.map((w) => (
                <li key={w.id} className="flex items-center justify-between border-b py-1">
                  <span>
                    {w.filename} · {w.totalEmployees} employees · SAR{' '}
                    {Number(w.totalNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <a href={w.filePath} download>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payslips ({period.lines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {period.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lines yet. Click Calculate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="py-2">ID</th>
                    <th>Name</th>
                    <th className="text-right">Basic</th>
                    <th className="text-right">OT</th>
                    <th className="text-right">GOSI</th>
                    <th className="text-right">Gross</th>
                    <th className="text-right">Ded</th>
                    <th className="text-right">Net</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {period.lines.map((l) => (
                    <tr key={l.id} className="border-b">
                      <td className="py-2 font-mono text-xs">{l.employee.employmentId}</td>
                      <td>{l.employee.fullNameEn}</td>
                      <td className="text-right">{Number(l.basicSalary).toFixed(2)}</td>
                      <td className="text-right">{Number(l.overtimePay).toFixed(2)}</td>
                      <td className="text-right">{Number(l.gosiEmployee).toFixed(2)}</td>
                      <td className="text-right">{Number(l.grossPay).toFixed(2)}</td>
                      <td className="text-right">{Number(l.totalDeductions).toFixed(2)}</td>
                      <td className="text-right font-semibold">{Number(l.netPay).toFixed(2)}</td>
                      <td className="text-right">
                        {l.payslipPdfPath && (
                          <a href={l.payslipPdfPath} download>
                            <Button size="sm" variant="ghost">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
