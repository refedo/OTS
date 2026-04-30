'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Loader2, Building2, CreditCard, TrendingUp, TrendingDown,
  FolderOpen, FileText, ChevronDown, ChevronUp, BarChart3, CalendarClock,
  ArrowUpDown, Truck, Receipt, Clock, FileSpreadsheet, BookOpen, List,
  Layers, Settings, Banknote, Wallet, Package, Users, Hash,
} from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(n);
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountOption {
  code: string;
  label: string;
  totalHT: number;
}

interface Payment {
  amount: number;
  date: string | null;
  method: string | null;
  ref: string | null;
}

interface Invoice {
  id: number;
  ref: string;
  refSupplier: string | null;
  dateInvoice: string | null;
  dateDue: string | null;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  accountHT: number;
  isPaid: boolean;
  projectId: number | null;
  projectRef: string | null;
  projectTitle: string | null;
  supplierId: number | null;
  supplierName: string | null;
  payments: Payment[];
  totalPaid: number;
  balance: number;
}

interface ProjectSummary {
  projectId: number | null;
  projectRef: string;
  projectTitle: string;
  invoiceCount: number;
  accountHT: number;
  totalPaid: number;
  balance: number;
  projectTotalCost: number;
  pctOfProjectCost: number;
}

interface ReportData {
  account: { code: string; label: string };
  period: { from: string; to: string };
  summary: {
    invoiceCount: number;
    totalAccountHT: number;
    totalPaid: number;
    totalBalance: number;
    pctOfGrandTotal: number;
    grandTotalAll: number;
  };
  projectSummary: ProjectSummary[];
  invoices: Invoice[];
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'blue' }: {
  label: string; value: string; sub?: string;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'violet';
}) {
  const ring: Record<string, string> = {
    blue: 'border-l-blue-500', green: 'border-l-emerald-500',
    red: 'border-l-red-500', amber: 'border-l-amber-500', violet: 'border-l-violet-500',
  };
  return (
    <div className={`rounded-xl border border-l-4 bg-white px-5 py-4 shadow-sm ${ring[color]}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AccountInvoiceReportPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string>('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/financial/reports/account-invoice-report/accounts')
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedCode) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const params = new URLSearchParams({ accountCode: selectedCode });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await fetch(`/api/financial/reports/account-invoice-report?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to load report'); return; }
      setReport(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [selectedCode, fromDate, toDate]);

  const toggleProject = (key: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleInvoice = (id: number) => {
    setExpandedInvoices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedAccount = accounts.find((a) => a.code === selectedCode);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="min-w-0">
        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 p-6 m-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <Hash className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Account Invoice Report</h1>
              <p className="text-blue-100 text-sm mt-0.5">
                Invoices &amp; payments by accounting account — distribution across projects
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 flex flex-wrap gap-3 items-end">
            {/* Account selector */}
            <div className="flex-1 min-w-[260px]">
              <label className="block text-xs text-white/70 mb-1">Accounting Account</label>
              {loadingAccounts ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-white/20 text-sm text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
                </div>
              ) : (
                <Select value={selectedCode} onValueChange={setSelectedCode}>
                  <SelectTrigger className="bg-white text-slate-800">
                    <SelectValue placeholder="Select an accounting account…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {accounts.map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        <span className="font-mono text-xs text-slate-500 mr-2">{a.code}</span>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date range */}
            <div>
              <label className="block text-xs text-white/70 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-md border border-input bg-white px-3 text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 rounded-md border border-input bg-white px-3 text-sm text-slate-800"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedCode || loading}
              className="bg-white text-indigo-700 hover:bg-white/90 font-semibold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate Report
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mx-4 flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        )}

        {/* Report */}
        {report && !loading && (
          <div className="px-4 pb-8 space-y-6">
            {/* Account header */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2.5">
                <Hash className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  <span className="font-mono text-slate-500 mr-2">{report.account.code}</span>
                  {report.account.label}
                </h2>
                <p className="text-xs text-slate-500">
                  {report.period.from} → {report.period.to}
                </p>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                label="Total on this Account"
                value={formatSAR(report.summary.totalAccountHT)}
                sub={`${report.summary.invoiceCount} invoices`}
                color="blue"
              />
              <KpiCard
                label="% of All Supplier Spend"
                value={formatPct(report.summary.pctOfGrandTotal)}
                sub={`Grand total: ${formatSAR(report.summary.grandTotalAll)}`}
                color="violet"
              />
              <KpiCard
                label="Total Paid"
                value={formatSAR(report.summary.totalPaid)}
                color="green"
              />
              <KpiCard
                label="Outstanding Balance"
                value={formatSAR(report.summary.totalBalance)}
                color={report.summary.totalBalance > 0 ? 'red' : 'green'}
              />
            </div>

            {/* Per-project breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-indigo-500" />
                  Project Distribution
                  <Badge variant="secondary">{report.projectSummary.length} projects</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {report.projectSummary.map((proj) => {
                  const key = proj.projectId ? String(proj.projectId) : '__no_project__';
                  const isOpen = expandedProjects.has(key);
                  const projectInvoices = report.invoices.filter(
                    (inv) => (proj.projectId ? inv.projectId === proj.projectId : !inv.projectId)
                  );

                  return (
                    <div key={key} className="rounded-lg border bg-white overflow-hidden">
                      {/* Project row */}
                      <button
                        onClick={() => toggleProject(key)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-800 truncate">
                              {proj.projectTitle !== 'No Project' ? proj.projectTitle : 'No Project'}
                            </span>
                            {proj.projectRef && proj.projectRef !== 'No Project' && (
                              <Badge variant="outline" className="text-xs font-mono">{proj.projectRef}</Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">{proj.invoiceCount} inv</Badge>
                          </div>
                          {/* Progress bar: account share of project total cost */}
                          {proj.projectTotalCost > 0 && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${Math.min(proj.pctOfProjectCost, 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-slate-500 shrink-0">
                                {formatPct(proj.pctOfProjectCost)} of project cost
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm text-slate-800">{formatSAR(proj.accountHT)}</p>
                          <p className="text-[11px] text-slate-400">
                            Paid {formatSAR(proj.totalPaid)}
                          </p>
                        </div>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                      </button>

                      {/* Invoices for this project */}
                      {isOpen && (
                        <div className="border-t bg-slate-50 divide-y">
                          {projectInvoices.map((inv) => {
                            const invOpen = expandedInvoices.has(inv.id);
                            return (
                              <div key={inv.id}>
                                <button
                                  onClick={() => toggleInvoice(inv.id)}
                                  className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-white/60 transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-semibold text-slate-700">{inv.ref}</span>
                                      {inv.refSupplier && (
                                        <span className="text-xs text-slate-400">{inv.refSupplier}</span>
                                      )}
                                      {inv.supplierName && (
                                        <Badge variant="outline" className="text-[10px]">{inv.supplierName}</Badge>
                                      )}
                                      <Badge
                                        variant={inv.isPaid ? 'default' : 'secondary'}
                                        className={`text-[10px] ${inv.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                                      >
                                        {inv.isPaid ? 'Paid' : 'Unpaid'}
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {formatDate(inv.dateInvoice)}
                                      {inv.dateDue && ` · Due ${formatDate(inv.dateDue)}`}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs font-semibold text-slate-700">
                                      Account: {formatSAR(inv.accountHT)}
                                    </p>
                                    {inv.balance > 0.01 && (
                                      <p className="text-[11px] text-red-500">Bal: {formatSAR(inv.balance)}</p>
                                    )}
                                  </div>
                                  {invOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                </button>

                                {/* Payments */}
                                {invOpen && (
                                  <div className="px-10 pb-3 pt-1 bg-white/40">
                                    {inv.payments.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic">No payments recorded</p>
                                    ) : (
                                      <div className="space-y-1">
                                        {inv.payments.map((pmt, pi) => (
                                          <div key={pi} className="flex items-center gap-3 text-xs text-slate-600">
                                            <CreditCard className="h-3 w-3 text-emerald-500 shrink-0" />
                                            <span className="font-mono">{formatSAR(pmt.amount)}</span>
                                            <span className="text-slate-400">{formatDate(pmt.date)}</span>
                                            {pmt.method && <span className="text-slate-400">{pmt.method}</span>}
                                            {pmt.ref && <span className="text-slate-300 font-mono text-[10px]">{pmt.ref}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {report.projectSummary.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-6">No invoices found for this account in the selected period.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {!report && !loading && !error && (
          <div className="mx-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <Hash className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <h3 className="text-slate-600 font-semibold mb-1">Select an accounting account</h3>
            <p className="text-slate-400 text-sm">
              Choose an account from the dropdown above, set optional date range, then click Generate Report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
