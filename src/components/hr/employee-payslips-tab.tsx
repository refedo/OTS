'use client';

import { useEffect, useState } from 'react';
import { Receipt, Download, Printer, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DolibarrPayslipItem {
  id: number;
  ref: string;
  label: string | null;
  salary: number;
  amount: number;
  dateStart: string;
  dateEnd: string;
  datePayment: string | null;
  isPaid: boolean;
}

interface OtsPayslipItem {
  lineId: string;
  periodId: string;
  periodLabel: string;
  year: number;
  month: number;
  payDate: string;
  periodStatus: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  mobileAllowance: number;
  foodAllowance: number;
  otherAllowances: number;
  totalAllowances: number;
  overtimePay: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  payslipPdfPath: string | null;
}

type MergedItem =
  | { source: 'dolibarr'; sortDate: string; data: DolibarrPayslipItem }
  | { source: 'ots'; sortDate: string; data: OtsPayslipItem };

function fmtSAR(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtPeriod(dateStart: string, dateEnd: string) {
  if (!dateStart) return '—';
  const s = new Date(dateStart);
  return s.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function EmployeePayslipsTab({ employeeId }: { employeeId: string }) {
  const [loading, setLoading] = useState(true);
  const [dolibarr, setDolibarr] = useState<DolibarrPayslipItem[]>([]);
  const [ots, setOts] = useState<OtsPayslipItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/hr/employees/${employeeId}/payslips`)
      .then((r) => r.json())
      .then((body) => {
        setDolibarr(body.dolibarr ?? []);
        setOts(body.ots ?? []);
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  // Merge and sort by date DESC
  const merged: MergedItem[] = [
    ...dolibarr.map((d: DolibarrPayslipItem) => ({
      source: 'dolibarr' as const,
      sortDate: d.dateStart || '0000-00-00',
      data: d,
    })),
    ...ots.map((o: OtsPayslipItem) => ({
      source: 'ots' as const,
      sortDate: `${o.year}-${String(o.month).padStart(2, '0')}-01`,
      data: o,
    })),
  ].sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  const latestNetPay =
    ots.length > 0
      ? ots[0].netPay
      : dolibarr.length > 0
      ? dolibarr[0].amount
      : null;

  async function handleOtsPdf(item: OtsPayslipItem) {
    if (item.payslipPdfPath) {
      window.open(item.payslipPdfPath, '_blank');
      return;
    }
    setGeneratingPdf(item.lineId);
    try {
      const res = await fetch(`/api/hr/payroll-periods/${item.periodId}/payslips`, { method: 'POST' });
      if (res.ok) {
        // Refetch to get updated PDF path
        const updated = await fetch(`/api/hr/employees/${employeeId}/payslips`).then((r) => r.json());
        setOts(updated.ots ?? []);
        const updatedItem = (updated.ots as OtsPayslipItem[]).find((o) => o.lineId === item.lineId);
        if (updatedItem?.payslipPdfPath) window.open(updatedItem.payslipPdfPath, '_blank');
      }
    } finally {
      setGeneratingPdf(null);
    }
  }

  function handleDolibarrPdf(item: DolibarrPayslipItem) {
    window.open(`/api/hr/employees/${employeeId}/payslips/dolibarr/${item.id}/pdf`, '_blank');
  }

  const toggleExpand = (key: string) => setExpandedId((prev: string | null) => (prev === key ? null : key));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Payslips</h2>
            <p className="text-sky-100 text-sm">View all payslips from Dolibarr and OTS Payroll</p>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Dolibarr Payslips</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{dolibarr.length}</p>
          <p className="text-xs text-sky-500 mt-0.5">Historical records</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">OTS Payslips</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{ots.length}</p>
          <p className="text-xs text-emerald-500 mt-0.5">Generated by OTS Payroll</p>
        </div>
        {latestNetPay !== null && (
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Latest Net Pay</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">SAR {fmtSAR(latestNetPay)}</p>
            <p className="text-xs text-amber-500 mt-0.5">Most recent payslip</p>
          </div>
        )}
      </div>

      {/* Payslips list */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="px-6 py-4 border-b flex items-center gap-2 text-sky-700">
          <Receipt className="h-4 w-4" />
          <span className="text-sm font-semibold">All Payslips</span>
          <span className="ml-auto text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-medium">
            {merged.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading payslips…</span>
          </div>
        ) : merged.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">No payslips found</div>
        ) : (
          <div className="divide-y">
            {merged.map((item) => {
              const isDolibarr = item.source === 'dolibarr';
              const key = isDolibarr
                ? `dolibarr-${(item.data as DolibarrPayslipItem).id}`
                : `ots-${(item.data as OtsPayslipItem).lineId}`;
              const expanded = expandedId === key;

              if (isDolibarr) {
                const d = item.data as DolibarrPayslipItem;
                return (
                  <div key={key} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700 border border-sky-200">
                            Dolibarr
                          </span>
                          <span className="text-sm font-semibold text-slate-700">
                            {fmtPeriod(d.dateStart, d.dateEnd)}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{d.ref}</span>
                          {d.isPaid ? (
                            <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                              Unpaid
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {fmtDate(d.dateStart)} – {fmtDate(d.dateEnd)}
                          {d.datePayment && <> · Pay date: {fmtDate(d.datePayment)}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Total</p>
                          <p className="text-sm font-bold text-sky-700">SAR {fmtSAR(d.amount)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => handleDolibarrPdf(d)}
                        >
                          <Printer className="h-3 w-3" />
                          Print
                        </Button>
                        <button
                          onClick={() => toggleExpand(key)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400"
                        >
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-3 grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3 text-xs">
                        <div>
                          <p className="text-slate-400 uppercase tracking-wide text-[10px]">Base Salary</p>
                          <p className="font-semibold text-slate-700 mt-0.5">SAR {fmtSAR(d.salary)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase tracking-wide text-[10px]">Total Disbursed</p>
                          <p className="font-semibold text-sky-700 mt-0.5">SAR {fmtSAR(d.amount)}</p>
                        </div>
                        {d.label && (
                          <div className="col-span-2">
                            <p className="text-slate-400 uppercase tracking-wide text-[10px]">Note</p>
                            <p className="text-slate-600 mt-0.5">{d.label}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // OTS payslip
              const o = item.data as OtsPayslipItem;
              return (
                <div key={key} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          OTS Payroll
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{o.periodLabel}</span>
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-semibold border',
                            o.periodStatus === 'APPROVED' || o.periodStatus === 'LOCKED'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200',
                          )}
                        >
                          {o.periodStatus === 'LOCKED' ? 'Locked' : o.periodStatus === 'APPROVED' ? 'Approved' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Pay date: {fmtDate(o.payDate)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Net Pay</p>
                        <p className="text-sm font-bold text-emerald-700">SAR {fmtSAR(o.netPay)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => handleOtsPdf(o)}
                        disabled={generatingPdf === o.lineId}
                      >
                        {generatingPdf === o.lineId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : o.payslipPdfPath ? (
                          <Download className="h-3 w-3" />
                        ) : (
                          <ExternalLink className="h-3 w-3" />
                        )}
                        {o.payslipPdfPath ? 'Download' : 'Generate PDF'}
                      </Button>
                      <button
                        onClick={() => toggleExpand(key)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400"
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3 bg-slate-50 rounded-lg p-3 text-xs">
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide text-[10px]">Basic</p>
                        <p className="font-semibold text-slate-700 mt-0.5">SAR {fmtSAR(o.basicSalary)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide text-[10px]">Allowances</p>
                        <p className="font-semibold text-slate-700 mt-0.5">SAR {fmtSAR(o.totalAllowances)}</p>
                      </div>
                      {o.overtimePay > 0 && (
                        <div>
                          <p className="text-slate-400 uppercase tracking-wide text-[10px]">Overtime</p>
                          <p className="font-semibold text-slate-700 mt-0.5">SAR {fmtSAR(o.overtimePay)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide text-[10px]">Gross Pay</p>
                        <p className="font-semibold text-slate-700 mt-0.5">SAR {fmtSAR(o.grossPay)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 uppercase tracking-wide text-[10px]">Deductions</p>
                        <p className="font-semibold text-rose-600 mt-0.5">- SAR {fmtSAR(o.totalDeductions)}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-slate-400 uppercase tracking-wide text-[10px]">Net Pay</p>
                        <p className="font-bold text-emerald-700 mt-0.5">SAR {fmtSAR(o.netPay)}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
