'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Calculator,
  CheckCircle2,
  Lock,
  Download,
  FileText,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileSpreadsheet,
  DollarSign,
  Users,
  TrendingDown,
  TrendingUp,
  Info,
  X,
  Gift,
  Search,
  LayoutList,
  Table2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  overtimeHours: string;
  unpaidLeaveDays: string;
  unpaidLeaveDeduction: string;
  paidLeaveDays: string;
  absentDaysWithPermission: string;
  absenceWithPermissionDeduction: string;
  absentDaysWithoutPermission: string;
  absenceDeduction: string;
  loanDeduction: string;
  custodyDeduction: string;
  violationDeduction: string;
  payslipPdfPath: string | null;
};

type Adjustment = {
  id: string;
  employeeId: string;
  kind: string;
  amount: string;
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
  adjustments: Adjustment[];
  wpsExports: WpsExport[];
};

const COMPENSATION_KINDS = new Set([
  'ANNUAL_LEAVE_ALLOWANCE', 'TICKET_ALLOWANCE', 'EXIT_REENTRY_VISA',
  'COMMISSION', 'INCENTIVE', 'BONUS', 'OTHER',
]);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type SortKey = 'employmentId' | 'fullNameEn' | 'basicSalary' | 'overtimeHours' | 'overtimePay' |
  'absentDaysWithPermission' | 'absenceWithPermissionDeduction' |
  'absentDaysWithoutPermission' | 'absenceDeduction' |
  'loanDeduction' | 'custodyDeduction' | 'violationDeduction' | 'gosiEmployee' |
  'grossPay' | 'totalDeductions' | 'netPay' | 'compensation';

type SortDir = 'asc' | 'desc';

function sar(n: string | number) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt(n: string | number, decimals = 2) {
  return Number(n).toFixed(decimals);
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  CALCULATED: 'bg-sky-100 text-sky-700 border-sky-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PAID: 'bg-blue-100 text-blue-700 border-blue-200',
  LOCKED: 'bg-rose-100 text-rose-700 border-rose-200',
};

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 text-slate-400 inline ml-1" />;
  return dir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-sky-600 inline ml-1" />
    : <ChevronDown className="h-3 w-3 text-sky-600 inline ml-1" />;
}

export function PayrollPeriodDetailClient({
  period,
  canCalculate,
  canApprove,
  canLock,
  canExport,
  canAdjust,
}: {
  period: Period;
  canCalculate: boolean;
  canApprove: boolean;
  canLock: boolean;
  canExport: boolean;
  canAdjust?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('employmentId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [noteVisible, setNoteVisible] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'simple' | 'extended'>('extended');

  const compensationByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of period.adjustments) {
      if (COMPENSATION_KINDS.has(a.kind)) {
        map.set(a.employeeId, (map.get(a.employeeId) ?? 0) + Number(a.amount));
      }
    }
    return map;
  }, [period.adjustments]);

  const allowancesByEmployee = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const a of period.adjustments) {
      if (COMPENSATION_KINDS.has(a.kind)) {
        const emp = map.get(a.employeeId) ?? {};
        emp[a.kind] = (emp[a.kind] ?? 0) + Number(a.amount);
        map.set(a.employeeId, emp);
      }
    }
    return map;
  }, [period.adjustments]);

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

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filteredLines = useMemo(() => {
    if (!search.trim()) return period.lines;
    const q = search.toLowerCase();
    return period.lines.filter(l =>
      l.employee.fullNameEn.toLowerCase().includes(q) ||
      l.employee.employmentId.toLowerCase().includes(q)
    );
  }, [period.lines, search]);

  const sortedLines = useMemo(() => {
    return [...filteredLines].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'employmentId') {
        return dir * a.employee.employmentId.localeCompare(b.employee.employmentId, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortKey === 'fullNameEn') {
        return dir * a.employee.fullNameEn.localeCompare(b.employee.fullNameEn, undefined, { sensitivity: 'base' });
      }
      const numMap: Record<string, number> = {
        basicSalary: Number(a.basicSalary) - Number(b.basicSalary),
        overtimeHours: Number(a.overtimeHours) - Number(b.overtimeHours),
        overtimePay: Number(a.overtimePay) - Number(b.overtimePay),
        absentDaysWithPermission: Number(a.absentDaysWithPermission) - Number(b.absentDaysWithPermission),
        absenceWithPermissionDeduction: Number(a.absenceWithPermissionDeduction) - Number(b.absenceWithPermissionDeduction),
        absentDaysWithoutPermission: Number(a.absentDaysWithoutPermission) - Number(b.absentDaysWithoutPermission),
        absenceDeduction: Number(a.absenceDeduction) - Number(b.absenceDeduction),
        loanDeduction: Number(a.loanDeduction) - Number(b.loanDeduction),
        custodyDeduction: Number(a.custodyDeduction) - Number(b.custodyDeduction),
        violationDeduction: Number(a.violationDeduction) - Number(b.violationDeduction),
        gosiEmployee: Number(a.gosiEmployee) - Number(b.gosiEmployee),
        grossPay: Number(a.grossPay) - Number(b.grossPay),
        totalDeductions: Number(a.totalDeductions) - Number(b.totalDeductions),
        netPay: Number(a.netPay) - Number(b.netPay),
        compensation: (compensationByEmployee.get(a.employee.id) ?? 0) - (compensationByEmployee.get(b.employee.id) ?? 0),
      };
      return dir * (numMap[sortKey] ?? 0);
    });
  }, [filteredLines, sortKey, sortDir, compensationByEmployee]);

  const totalGross = period.lines.reduce((s, l) => s + Number(l.grossPay) + Number(l.totalAdditions), 0);
  const totalDed = period.lines.reduce((s, l) => s + Number(l.totalDeductions), 0);
  const totalNet = period.lines.reduce((s, l) => s + Number(l.netPay), 0);

  const canRecalc = (period.status === 'DRAFT' || period.status === 'CALCULATED') && canCalculate;
  const canApproveNow = period.status === 'CALCULATED' && canApprove;
  const canUnapproveNow = period.status === 'APPROVED' && canApprove;
  const canLockNow = (period.status === 'APPROVED' || period.status === 'PAID') && canLock;
  const canExportNow =
    (period.status === 'APPROVED' || period.status === 'PAID' || period.status === 'LOCKED') && canExport;
  const canGenPayslips = period.lines.length > 0 && canCalculate;

  const Th = ({ col, children, className = '' }: { col: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      className={`py-2 px-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-sky-700 ${className}`}
      onClick={() => toggleSort(col)}
    >
      {children}
      <SortIcon col={col} sortKey={sortKey} dir={sortDir} />
    </th>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero Banner */}
        <div className="rounded-2xl border bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <DollarSign className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">{MONTHS[period.month - 1]} {period.year} Payroll</h1>
              </div>
              <p className="text-emerald-100 text-sm">
                Pay date: {new Date(period.payDate).toLocaleDateString('en-GB')} · Cutoff: {new Date(period.cutoffDate).toLocaleDateString('en-GB')}
                {period.calculatedAt && ` · Calculated: ${new Date(period.calculatedAt).toLocaleDateString('en-GB')}`}
                {period.approvedAt && ` · Approved: ${new Date(period.approvedAt).toLocaleDateString('en-GB')}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLES[period.status] ?? 'bg-white/20 text-white border-white/30'}`}>
                {period.status}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {/* Dismissible info note */}
        {noteVisible && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 flex gap-3">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-sky-500" />
            <div className="flex-1 space-y-1">
              <p><span className="font-semibold">Cutoff date</span> ({new Date(period.cutoffDate).toLocaleDateString('en-GB')}): the last day of attendance included in this payroll run. Records after this date appear in the next period.</p>
              <p><span className="font-semibold">Pay date</span> ({new Date(period.payDate).toLocaleDateString('en-GB')}): the date salaries are disbursed to employees.</p>
              <p><span className="font-semibold">Leave with permission</span> <span className="inline-block bg-amber-100 text-amber-700 rounded px-1 py-0.5 text-xs font-medium">amber</span>: days absent with manager approval — deducted at the configured multiplier (default 1× daily rate).</p>
              <p><span className="font-semibold">Leave without permission</span> <span className="inline-block bg-rose-100 text-rose-700 rounded px-1 py-0.5 text-xs font-medium">rose</span>: unauthorised absences — deducted at a higher multiplier (default 2× daily rate). Change multipliers in <span className="font-medium underline cursor-pointer" onClick={() => window.open('/hr/setup?tab=payrollSettings', '_blank')}>HR Setup → Payroll Settings</span>.</p>
            </div>
            <button onClick={() => setNoteVisible(false)} className="text-sky-400 hover:text-sky-700 mt-0.5 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-sky-500" />
              <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Employees</p>
            </div>
            <p className="text-2xl font-bold text-sky-700">{period.lines.length}</p>
            <p className="text-xs text-sky-500 mt-0.5">payroll lines</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Gross</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{sar(totalGross)}</p>
            <p className="text-xs text-emerald-500 mt-0.5">SAR total</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Deductions</p>
            </div>
            <p className="text-2xl font-bold text-rose-700">{sar(totalDed)}</p>
            <p className="text-xs text-rose-500 mt-0.5">SAR total</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-violet-500" />
              <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Net Pay</p>
            </div>
            <p className="text-2xl font-bold text-violet-700">{sar(totalNet)}</p>
            <p className="text-xs text-violet-500 mt-0.5">SAR total</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="rounded-2xl border bg-white shadow-sm p-4">
          <div className="flex flex-wrap gap-2 items-center justify-end">
            {canRecalc && (
              <Button
                onClick={() => run('calculate', `/api/hr/payroll-periods/${period.id}/calculate`)}
                disabled={busy !== null}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                {busy === 'calculate' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Calculator className="h-4 w-4 mr-1.5" />}
                {period.status === 'CALCULATED' ? 'Recalculate' : 'Calculate'}
              </Button>
            )}
            {canApproveNow && (
              <Button variant="secondary" onClick={() => run('approve', `/api/hr/payroll-periods/${period.id}/approve`)} disabled={busy !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
            )}
            {canUnapproveNow && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Revert this period from APPROVED back to CALCULATED? Loan/custody advances applied during approval will NOT be reversed automatically.')) {
                    run('unapprove', `/api/hr/payroll-periods/${period.id}/unapprove`);
                  }
                }}
                disabled={busy !== null}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {busy === 'unapprove' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                Revert Approval
              </Button>
            )}
            {canLockNow && (
              <Button variant="destructive" onClick={() => run('lock', `/api/hr/payroll-periods/${period.id}/lock`)} disabled={busy !== null}>
                <Lock className="h-4 w-4 mr-1.5" />
                Lock
              </Button>
            )}
            {canExportNow && (
              <Button variant="outline" onClick={() => run('wps', `/api/hr/payroll-periods/${period.id}/wps`)} disabled={busy !== null}>
                <Download className="h-4 w-4 mr-1.5" />
                Alinma WPS
              </Button>
            )}
            {canExportNow && (
              <Button variant="outline" onClick={() => run('wps-sif', `/api/hr/payroll-periods/${period.id}/wps-sif`)} disabled={busy !== null}>
                <Download className="h-4 w-4 mr-1.5" />
                WPS SIF
              </Button>
            )}
            {period.lines.length > 0 && (
              <a href={`/api/hr/payroll-periods/${period.id}/export-xlsx`} download>
                <Button variant="outline" disabled={busy !== null}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
                  Export Excel
                </Button>
              </a>
            )}
            {canGenPayslips && (
              <Button variant="outline" onClick={() => run('payslips', `/api/hr/payroll-periods/${period.id}/payslips`)} disabled={busy !== null}>
                {busy === 'payslips' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
                Generate PDFs
              </Button>
            )}
            <Link href={`/hr/payroll/${period.id}/compensations`}>
              <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50">
                <Gift className="h-4 w-4 mr-1.5" />
                Compensations
                {period.adjustments.length > 0 && (
                  <span className="ml-1.5 bg-violet-100 text-violet-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {period.adjustments.length}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* WPS Exports */}
        {period.wpsExports.length > 0 && (
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-sm font-semibold text-slate-700">WPS Export History</h2>
              <Badge variant="secondary">{period.wpsExports.length}</Badge>
            </div>
            <ul className="divide-y text-sm px-4 py-2">
              {period.wpsExports.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2">
                  <span className="text-slate-700">
                    <span className="font-mono text-xs text-slate-500 mr-2">{new Date(w.generatedAt).toLocaleDateString('en-GB')}</span>
                    {w.filename} · {w.totalEmployees} employees · SAR {sar(w.totalNet)}
                  </span>
                  <a href={w.filePath} download={w.filename}>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Payroll Lines Table */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b bg-white">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Payroll Lines</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click column headers to sort</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search employee…"
                  className="pl-8 h-8 text-xs w-48"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('simple')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'simple' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutList className="h-3.5 w-3.5" />Simple
                </button>
                <button
                  onClick={() => setViewMode('extended')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'extended' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Table2 className="h-3.5 w-3.5" />Extended
                </button>
              </div>
              <Badge variant="secondary">{filteredLines.length} / {period.lines.length}</Badge>
            </div>
          </div>

          {period.lines.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calculator className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">No payroll lines yet</p>
              <p className="text-xs text-slate-400 mt-1">Click Calculate to generate payroll for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {viewMode === 'simple' ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <Th col="employmentId">ID</Th>
                      <Th col="fullNameEn">Name</Th>
                      <Th col="basicSalary" className="text-right">Basic Salary</Th>
                      <Th col="compensation" className="text-right bg-violet-50">Allowances</Th>
                      <Th col="totalDeductions" className="text-right">Total Deductions</Th>
                      <Th col="netPay" className="text-right">Net Pay</Th>
                      <th className="py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedLines.map(l => {
                      const allowances = allowancesByEmployee.get(l.employee.id) ?? {};
                      const totalAllowances = Object.values(allowances).reduce((s, v) => s + v, 0);
                      return (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{l.employee.employmentId}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Link href={`/hr/employees/${l.employee.id}`} className="font-medium text-sky-700 hover:underline">{l.employee.fullNameEn}</Link>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{fmt(l.basicSalary)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums bg-violet-50/40">
                            {totalAllowances > 0 ? (
                              <span className="text-violet-700 font-medium" title={Object.entries(allowances).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${fmt(v)}`).join('\n')}>
                                {fmt(totalAllowances)}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-rose-700">{fmt(l.totalDeductions)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 font-bold">{fmt(l.netPay)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {l.payslipPdfPath ? (
                              <a href={l.payslipPdfPath} download={l.payslipPdfPath.split('/').pop()}>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-sky-600 hover:text-sky-800"><Download className="h-3.5 w-3.5" /></Button>
                              </a>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 bg-slate-50">
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-xs font-semibold text-slate-600 uppercase">Total ({sortedLines.length})</td>
                      <td className="py-3 px-3 text-right tabular-nums font-semibold">{sar(sortedLines.reduce((s, l) => s + Number(l.basicSalary), 0))}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-violet-700 bg-violet-50/40">{sar([...compensationByEmployee.values()].reduce((s, v) => s + v, 0))}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-rose-700">{sar(sortedLines.reduce((s, l) => s + Number(l.totalDeductions), 0))}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-700">{sar(sortedLines.reduce((s, l) => s + Number(l.netPay), 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <Th col="employmentId">ID</Th>
                    <Th col="fullNameEn">Name</Th>
                    <Th col="basicSalary" className="text-right">Basic</Th>
                    <Th col="overtimeHours" className="text-right">OT Hrs</Th>
                    <Th col="overtimePay" className="text-right">OT Pay</Th>
                    <th className="py-2 px-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap bg-amber-50">
                      <div>Leave w/ Perm</div>
                      <div className="text-[10px] font-normal text-slate-400">days / ded</div>
                    </th>
                    <th className="py-2 px-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap bg-rose-50">
                      <div>Leave w/o Perm</div>
                      <div className="text-[10px] font-normal text-slate-400">days / ded</div>
                    </th>
                    <Th col="loanDeduction" className="text-right">Loan Ded</Th>
                    <Th col="custodyDeduction" className="text-right">Custody</Th>
                    <Th col="violationDeduction" className="text-right">Violation</Th>
                    <Th col="gosiEmployee" className="text-right">GOSI</Th>
                    <Th col="grossPay" className="text-right">Gross</Th>
                    <Th col="totalDeductions" className="text-right">Total Ded</Th>
                    <Th col="netPay" className="text-right">Net Pay</Th>
                    <Th col="compensation" className="text-right bg-violet-50">Allowances</Th>
                    <th className="py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedLines.map((l) => {
                    const allowances = allowancesByEmployee.get(l.employee.id) ?? {};
                    const totalAllowances = Object.values(allowances).reduce((s, v) => s + v, 0);
                    return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500 whitespace-nowrap">{l.employee.employmentId}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Link href={`/hr/employees/${l.employee.id}`} className="font-medium text-sky-700 hover:text-sky-900 hover:underline">
                          {l.employee.fullNameEn}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{fmt(l.basicSalary)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-sky-700">{fmt(l.overtimeHours)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-sky-700">{fmt(l.overtimePay)}</td>

                      {/* Leave with permission */}
                      <td className="py-2.5 px-3 bg-amber-50/50">
                        <div className="text-center text-xs">
                          <span className="font-semibold text-amber-700">{fmt(l.absentDaysWithPermission, 1)}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-rose-600">{fmt(l.absenceWithPermissionDeduction)}</span>
                        </div>
                      </td>

                      {/* Leave without permission */}
                      <td className="py-2.5 px-3 bg-rose-50/60">
                        <div className="text-center text-xs">
                          <span className="font-semibold text-rose-700">{fmt(l.absentDaysWithoutPermission, 1)}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-rose-700 font-medium">{fmt(l.absenceDeduction)}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right tabular-nums text-rose-600">
                        {Number(l.loanDeduction) > 0 ? fmt(l.loanDeduction) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-rose-600">
                        {Number(l.custodyDeduction) > 0 ? fmt(l.custodyDeduction) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-rose-600">
                        {Number(l.violationDeduction) > 0 ? fmt(l.violationDeduction) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">{fmt(l.gosiEmployee)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(l.grossPay)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-rose-700 font-medium">{fmt(l.totalDeductions)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 font-bold">{fmt(l.netPay)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums bg-violet-50/40">
                        {totalAllowances > 0
                          ? <span className="text-violet-700 font-medium" title={Object.entries(allowances).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${fmt(v)}`).join('\n')}>{fmt(totalAllowances)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {l.payslipPdfPath ? (
                          <a href={l.payslipPdfPath} download={l.payslipPdfPath.split('/').pop()}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-sky-600 hover:text-sky-800">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 bg-slate-50">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 text-xs font-semibold text-slate-600 uppercase">Total ({sortedLines.length})</td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold">
                      {sar(sortedLines.reduce((s, l) => s + Number(l.basicSalary), 0))}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-sky-700">
                      {fmt(sortedLines.reduce((s, l) => s + Number(l.overtimeHours), 0))}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-sky-700">
                      {sar(sortedLines.reduce((s, l) => s + Number(l.overtimePay), 0))}
                    </td>
                    <td className="py-3 px-3 text-center text-xs font-semibold text-amber-700">
                      {fmt(sortedLines.reduce((s, l) => s + Number(l.absentDaysWithPermission), 0), 1)} / {sar(sortedLines.reduce((s, l) => s + Number(l.absenceWithPermissionDeduction), 0))}
                    </td>
                    <td className="py-3 px-3 text-center text-xs font-semibold text-rose-700">
                      {fmt(sortedLines.reduce((s, l) => s + Number(l.absentDaysWithoutPermission), 0), 1)} / {sar(sortedLines.reduce((s, l) => s + Number(l.absenceDeduction), 0))}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-rose-600">
                      {sar(sortedLines.reduce((s, l) => s + Number(l.loanDeduction), 0))}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-rose-600">
                      {sar(sortedLines.reduce((s, l) => s + Number(l.custodyDeduction), 0))}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-rose-600">
                      {sar(sortedLines.reduce((s, l) => s + Number(l.violationDeduction), 0))}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold">
                      {sar(sortedLines.reduce((s, l) => s + Number(l.gosiEmployee), 0))}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold">{sar(totalGross)}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-rose-700">{sar(totalDed)}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-700">{sar(totalNet)}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-violet-700 bg-violet-50/40">
                      {sar([...compensationByEmployee.values()].reduce((s, v) => s + v, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
