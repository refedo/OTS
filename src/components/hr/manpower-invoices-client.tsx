'use client';

import { useState } from 'react';
import { FileText, CheckCircle, Send, DollarSign, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface InvoiceDraft {
  id: string;
  agencyId: string;
  agencyNameEn: string;
  agencyNameAr: string | null;
  dolibarrThirdPartyId: string | null;
  payrollPeriodId: string;
  periodYear: number;
  periodMonth: number;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PUSHED' | 'PAID';
  totalHours: number;
  totalAmount: number;
  lineCount: number;
  dolibarrInvoiceId: string | null;
  dolibarrInvoiceRef: string | null;
  pushedAt: string | null;
  createdByName: string;
  createdAt: string;
}

interface Period {
  id: string;
  year: number;
  month: number;
  status: string;
}

interface KPI {
  total: number;
  draft: number;
  confirmed: number;
  pushed: number;
  paid: number;
  totalAmount: number;
}

interface Props {
  drafts: InvoiceDraft[];
  periods: Period[];
  kpi: KPI;
  canManage: boolean;
  canPush: boolean;
}

function statusBadge(status: InvoiceDraft['status']) {
  switch (status) {
    case 'DRAFT':
      return <Badge className="bg-slate-100 text-slate-600 border-slate-200 border">Draft</Badge>;
    case 'CONFIRMED':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Confirmed</Badge>;
    case 'PUSHED':
      return <Badge className="bg-sky-100 text-sky-700 border-sky-200 border">Pushed</Badge>;
    case 'PAID':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">Paid</Badge>;
  }
}

export function ManpowerInvoicesClient({ drafts: initialDrafts, periods, kpi: initialKpi, canManage, canPush }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [kpi, setKpi] = useState(initialKpi);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatePeriodId, setGeneratePeriodId] = useState<string>('');
  const [generateDialog, setGenerateDialog] = useState(false);
  const [pushConfirmId, setPushConfirmId] = useState<string | null>(null);

  const filtered = drafts.filter(d => {
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchPeriod = periodFilter === 'all' || d.payrollPeriodId === periodFilter;
    return matchStatus && matchPeriod;
  });

  async function handleGenerate() {
    if (!generatePeriodId) return;
    setLoading('generate');
    setError(null);
    try {
      const res = await fetch('/api/hr/manpower-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollPeriodId: generatePeriodId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Generation failed');
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(null);
      setGenerateDialog(false);
    }
  }

  async function handleConfirm(id: string) {
    setLoading(id + '-confirm');
    setError(null);
    try {
      const res = await fetch(`/api/hr/manpower-invoices/${id}/confirm`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Confirm failed');
      }
      setDrafts(prev => prev.map(d => (d.id === id ? { ...d, status: 'CONFIRMED' } : d)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirm failed');
    } finally {
      setLoading(null);
    }
  }

  async function handlePush(id: string) {
    setLoading(id + '-push');
    setError(null);
    setPushConfirmId(null);
    try {
      const res = await fetch(`/api/hr/manpower-invoices/${id}/push`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Push failed');
      setDrafts(prev =>
        prev.map(d =>
          d.id === id
            ? {
                ...d,
                status: 'PUSHED',
                dolibarrInvoiceId: data.dolibarrInvoiceId,
                dolibarrInvoiceRef: data.dolibarrInvoiceRef,
                pushedAt: data.pushedAt,
              }
            : d,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Push to Dolibarr failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Manpower Invoices</h1>
            </div>
            <p className="text-violet-100 text-sm">
              Agency billing drafts auto-generated from manpower attendance — review, confirm, and push to Dolibarr
            </p>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: kpi.total, color: 'slate' },
            { label: 'Draft', value: kpi.draft, color: 'slate' },
            { label: 'Confirmed', value: kpi.confirmed, color: 'amber' },
            { label: 'Pushed', value: kpi.pushed, color: 'sky' },
            { label: 'Paid', value: kpi.paid, color: 'emerald' },
          ].map(t => (
            <div
              key={t.label}
              className={cn(
                'rounded-xl border p-4 shadow-sm',
                t.color === 'slate' && 'bg-gradient-to-b from-slate-50 to-white border-slate-200',
                t.color === 'amber' && 'bg-gradient-to-b from-amber-50 to-white border-amber-200',
                t.color === 'sky' && 'bg-gradient-to-b from-sky-50 to-white border-sky-200',
                t.color === 'emerald' && 'bg-gradient-to-b from-emerald-50 to-white border-emerald-200',
              )}
            >
              <p className={cn('text-xs font-medium uppercase tracking-wide',
                t.color === 'slate' && 'text-slate-500',
                t.color === 'amber' && 'text-amber-600',
                t.color === 'sky' && 'text-sky-600',
                t.color === 'emerald' && 'text-emerald-600',
              )}>{t.label}</p>
              <p className={cn('text-2xl font-bold mt-1',
                t.color === 'slate' && 'text-slate-700',
                t.color === 'amber' && 'text-amber-700',
                t.color === 'sky' && 'text-sky-700',
                t.color === 'emerald' && 'text-emerald-700',
              )}>{t.value}</p>
            </div>
          ))}
        </div>

        {/* Total billed */}
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Billed</p>
          <p className="text-3xl font-bold text-violet-700 mt-1">
            SAR {kpi.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-violet-500 mt-0.5">Across all invoice drafts</p>
        </div>

        {/* Controls */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PUSHED">Pushed</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage && (
              <Button
                onClick={() => setGenerateDialog(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Generate for Period
              </Button>
            )}
          </div>

          {error && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Invoice list */}
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <div className="px-6 py-12 text-center text-slate-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No invoice drafts found</p>
                <p className="text-xs mt-1">Approve a payroll period to auto-generate manpower invoices</p>
              </div>
            )}

            {filtered.map(draft => (
              <div key={draft.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => setExpandedId(expandedId === draft.id ? null : draft.id)}
                      className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {expandedId === draft.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">{draft.agencyNameEn}</span>
                        {statusBadge(draft.status)}
                        <span className="text-xs text-slate-400">
                          {MONTH_NAMES[draft.periodMonth - 1]} {draft.periodYear}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                        <span>{draft.lineCount} slot{draft.lineCount !== 1 ? 's' : ''}</span>
                        <span>{draft.totalHours.toLocaleString('en-US', { minimumFractionDigits: 2 })} hrs</span>
                        <span className="font-medium text-slate-700">
                          SAR {draft.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        {draft.dolibarrInvoiceRef && (
                          <span className="text-sky-600 flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {draft.dolibarrInvoiceRef}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && draft.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfirm(draft.id)}
                        disabled={loading === draft.id + '-confirm'}
                        className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Confirm
                      </Button>
                    )}
                    {canPush && draft.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        onClick={() => setPushConfirmId(draft.id)}
                        disabled={loading === draft.id + '-push'}
                        className="gap-1 bg-sky-600 hover:bg-sky-700 text-white"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Push to Dolibarr
                      </Button>
                    )}
                    {draft.status === 'PUSHED' && (
                      <span className="text-xs text-sky-600 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Pushed {draft.pushedAt ? new Date(draft.pushedAt).toLocaleDateString() : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded detail: reconciliation-style line table */}
                {expandedId === draft.id && (
                  <LineDetail draftId={draft.id} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generate dialog */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Manpower Invoices</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Payroll Period</Label>
            <Select value={generatePeriodId} onValueChange={setGeneratePeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select period…" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {MONTH_NAMES[p.month - 1]} {p.year} — {p.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              This will aggregate all manpower attendance for the selected period and create one invoice draft per agency.
              Existing DRAFT invoices will be recalculated; CONFIRMED/PUSHED/PAID invoices are left untouched.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleGenerate}
              disabled={!generatePeriodId || loading === 'generate'}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {loading === 'generate' ? 'Generating…' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push confirm dialog */}
      <Dialog open={!!pushConfirmId} onOpenChange={() => setPushConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push Invoice to Dolibarr</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            This will create a vendor (supplier) invoice in Dolibarr. The action cannot be undone from OTS — you
            would need to manually void it in Dolibarr if needed. Proceed?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPushConfirmId(null)}>Cancel</Button>
            <Button
              onClick={() => pushConfirmId && handlePush(pushConfirmId)}
              disabled={!!loading}
              className="bg-sky-600 hover:bg-sky-700 text-white gap-2"
            >
              <Send className="h-4 w-4" />
              Confirm Push
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline lazy-loaded line detail with reconciliation data
function LineDetail({ draftId }: { draftId: string }) {
  const [data, setData] = useState<{
    rows: { slotCode: string; trade: string; rawAttendanceHours: number; invoiceHours: number; delta: number; matched: boolean }[];
    summary: { totalRawHours: number; totalInvoiceHours: number; delta: number; allMatched: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  if (!fetched && !loading) {
    setLoading(true);
    setFetched(true);
    fetch(`/api/hr/manpower-invoices/${draftId}/reconcile`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }

  if (loading || !data) {
    return <div className="mt-3 ml-7 text-xs text-slate-400 animate-pulse">Loading lines…</div>;
  }

  return (
    <div className="mt-3 ml-7">
      {!data.summary.allMatched && (
        <div className="flex items-center gap-2 text-xs text-amber-600 mb-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Some invoice hours differ from raw attendance — hours may have been manually adjusted
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b">
              <th className="text-left pb-1 pr-4">Slot</th>
              <th className="text-left pb-1 pr-4">Trade</th>
              <th className="text-right pb-1 pr-4">Attendance Hrs</th>
              <th className="text-right pb-1 pr-4">Invoice Hrs</th>
              <th className="text-right pb-1">Δ</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map(r => (
              <tr key={r.slotCode} className="border-b border-slate-50">
                <td className="py-1 pr-4 font-mono text-slate-700">{r.slotCode}</td>
                <td className="py-1 pr-4 text-slate-500">{r.trade}</td>
                <td className="py-1 pr-4 text-right text-slate-600">{r.rawAttendanceHours.toFixed(2)}</td>
                <td className="py-1 pr-4 text-right text-slate-700 font-medium">{r.invoiceHours.toFixed(2)}</td>
                <td className={cn('py-1 text-right', r.matched ? 'text-emerald-600' : 'text-amber-600 font-medium')}>
                  {r.delta > 0 ? '+' : ''}{r.delta.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-slate-700">
              <td colSpan={2} className="pt-2">Total</td>
              <td className="pt-2 pr-4 text-right">{data.summary.totalRawHours.toFixed(2)}</td>
              <td className="pt-2 pr-4 text-right">{data.summary.totalInvoiceHours.toFixed(2)}</td>
              <td className={cn('pt-2 text-right', data.summary.allMatched ? 'text-emerald-600' : 'text-amber-600')}>
                {data.summary.delta > 0 ? '+' : ''}{data.summary.delta.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
