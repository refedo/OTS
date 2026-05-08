'use client';

import { useState, useCallback } from 'react';
import { FileText, RefreshCw, Download, AlertTriangle, CheckCircle2, Clock, TrendingDown, TrendingUp, Users, DollarSign, Calendar, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportRow {
  id: string;
  year: number;
  month: number;
  status: 'GENERATING' | 'READY' | 'FAILED';
  newHires: number;
  resignations: number;
  terminations: number;
  headcountAtEnd: number;
  turnoverRate: string | number;
  burnoutScore: string | number;
  totalPayroll: string | number;
  leaveRequestsTotal: number;
  leaveRequestsApproved: number;
  iqamaExpiredCount: number;
  iqamaDueSoonCount: number;
  docRenewalsDueSoon: number;
  filePath: string | null;
  generatedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

function formatSar(n: number): string {
  return `SAR ${n.toLocaleString('en-SA-u-ca-gregory', { minimumFractionDigits: 0 })}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReportRow['status'] }) {
  if (status === 'READY')      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Ready</Badge>;
  if (status === 'GENERATING') return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Generating…</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
}

// ─── Burnout badge ────────────────────────────────────────────────────────────

function BurnoutBadge({ score }: { score: number }) {
  if (score <= 25) return <span className="text-emerald-600 font-bold">{score.toFixed(0)} <span className="text-xs font-normal text-slate-500">Low</span></span>;
  if (score <= 50) return <span className="text-amber-600 font-bold">{score.toFixed(0)} <span className="text-xs font-normal text-slate-500">Moderate</span></span>;
  if (score <= 75) return <span className="text-orange-600 font-bold">{score.toFixed(0)} <span className="text-xs font-normal text-slate-500">High</span></span>;
  return <span className="text-red-600 font-bold">{score.toFixed(0)} <span className="text-xs font-normal text-slate-500">Critical</span></span>;
}

// ─── Turnover badge ───────────────────────────────────────────────────────────

function TurnoverBadge({ rate }: { rate: number }) {
  if (rate < 5)  return <span className="text-emerald-600 font-bold">{rate.toFixed(1)}%</span>;
  if (rate <= 15) return <span className="text-amber-600 font-bold">{rate.toFixed(1)}%</span>;
  return <span className="text-red-600 font-bold">{rate.toFixed(1)}%</span>;
}

// ─── Report card ─────────────────────────────────────────────────────────────

function ReportCard({ report }: { report: ReportRow }) {
  const [expanded, setExpanded] = useState(false);

  const turnoverRate = toNum(report.turnoverRate);
  const burnoutScore = toNum(report.burnoutScore);
  const totalPayroll = toNum(report.totalPayroll);
  const leavers      = report.resignations + report.terminations;

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">
                {MONTH_NAMES[report.month - 1]} {report.year}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {report.generatedAt
                  ? `Generated ${new Date(report.generatedAt).toLocaleDateString('en-SA-u-ca-gregory')}`
                  : `Created ${new Date(report.createdAt).toLocaleDateString('en-SA-u-ca-gregory')}`}
                {report.createdBy ? ` · ${report.createdBy.name}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} />
            {report.status === 'READY' && report.filePath && (
              <a
                href={report.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </a>
            )}
          </div>
        </div>
      </CardHeader>

      {report.status === 'READY' && (
        <CardContent className="pt-0">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <Users className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-slate-800">{report.headcountAtEnd}</p>
              <p className="text-[10px] text-slate-500">Headcount</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <TrendingDown className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <TurnoverBadge rate={turnoverRate} />
              <p className="text-[10px] text-slate-500 mt-0.5">Turnover Rate</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <TrendingUp className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <BurnoutBadge score={burnoutScore} />
              <p className="text-[10px] text-slate-500 mt-0.5">Burnout Index</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <DollarSign className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <p className="text-sm font-bold text-slate-800">{formatSar(totalPayroll)}</p>
              <p className="text-[10px] text-slate-500">Gross Payroll</p>
            </div>
          </div>

          {/* Expandable detail row */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span>Details</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-slate-600">
              {/* Headcount */}
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Headcount Movement</p>
                <div className="space-y-0.5">
                  <div className="flex justify-between"><span>New Hires</span><span className="text-emerald-600 font-medium">+{report.newHires}</span></div>
                  <div className="flex justify-between"><span>Resignations</span><span className="text-amber-600 font-medium">-{report.resignations}</span></div>
                  <div className="flex justify-between"><span>Terminations</span><span className="text-red-600 font-medium">-{report.terminations}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-1 mt-1"><span>Net Change</span><span className={`font-bold ${report.newHires - leavers >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{report.newHires - leavers >= 0 ? '+' : ''}{report.newHires - leavers}</span></div>
                </div>
              </div>

              {/* Leave */}
              <div className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Leave Requests</p>
                <div className="space-y-0.5">
                  <div className="flex justify-between"><span>Total Submitted</span><span className="font-medium">{report.leaveRequestsTotal}</span></div>
                  <div className="flex justify-between"><span>Approved</span><span className="text-emerald-600 font-medium">{report.leaveRequestsApproved}</span></div>
                </div>
              </div>

              {/* Documents */}
              <div className="rounded-lg border border-slate-100 p-3 sm:col-span-2">
                <p className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Document Renewals</p>
                <div className="flex flex-wrap gap-3">
                  {report.iqamaExpiredCount > 0 && (
                    <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-red-700">
                      {report.iqamaExpiredCount} Iqama expired
                    </span>
                  )}
                  {report.iqamaDueSoonCount > 0 && (
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-700">
                      {report.iqamaDueSoonCount} Iqama due soon
                    </span>
                  )}
                  {report.docRenewalsDueSoon > 0 && (
                    <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-orange-700">
                      {report.docRenewalsDueSoon} other docs due soon
                    </span>
                  )}
                  {report.iqamaExpiredCount === 0 && report.iqamaDueSoonCount === 0 && report.docRenewalsDueSoon === 0 && (
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> All documents current</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}

      {report.status === 'FAILED' && report.errorMessage && (
        <CardContent className="pt-0">
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            <span className="font-semibold">Error:</span> {report.errorMessage}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

interface Props {
  initialReports: ReportRow[];
  canManage: boolean;
}

export function HrMonthlyReportsClient({ initialReports, canManage }: Props) {
  const [reports, setReports]     = useState<ReportRow[]>(initialReports);
  const [loading, setLoading]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [genYear, setGenYear]     = useState<string>(String(new Date().getFullYear()));
  const [genMonth, setGenMonth]   = useState<string>(String(new Date().getMonth() === 0 ? 12 : new Date().getMonth()));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/hr/reports/monthly');
      const data = await res.json() as ReportRow[];
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/reports/monthly', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ year: Number(genYear), month: Number(genMonth) }),
      });
      const result = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError(String(result.error ?? 'Generation failed'));
      } else {
        await refresh();
      }
    } catch {
      setError('Failed to trigger report generation');
    } finally {
      setGenerating(false);
    }
  }, [genYear, genMonth, refresh]);

  // Year options: current year ± 3
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0f3460] to-[#1e64aa] p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">HR Monthly Reports</h1>
            <p className="mt-1 text-sm text-blue-200">
              Auto-generated on the 2nd of each month · PDF download
            </p>
          </div>
          <FileText className="h-10 w-10 text-blue-300 shrink-0" />
        </div>

        {/* KPI summary strip */}
        {reports.length > 0 && reports[0].status === 'READY' && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Latest Report',    value: `${MONTH_NAMES[reports[0].month - 1]} ${reports[0].year}` },
              { label: 'Total Reports',    value: String(reports.filter((r) => r.status === 'READY').length) },
              { label: 'Latest Turnover',  value: `${toNum(reports[0].turnoverRate).toFixed(1)}%` },
              { label: 'Latest Burnout',   value: `${toNum(reports[0].burnoutScore).toFixed(0)}/100` },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-white/10 p-3 text-center">
                <p className="text-lg font-bold">{kpi.value}</p>
                <p className="text-[10px] text-blue-200">{kpi.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate panel */}
      {canManage && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Generate Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Year</label>
                <Select value={genYear} onValueChange={setGenYear}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Month</label>
                <Select value={genMonth} onValueChange={setGenMonth}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={generate}
                disabled={generating || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generating ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <><FileText className="mr-2 h-4 w-4" /> Generate</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={refresh}
                disabled={loading || generating}
                className="ml-auto"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report list */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16">
          <FileText className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No reports generated yet</p>
          {canManage && (
            <p className="text-xs text-slate-400 mt-1">Use the Generate panel above to create the first report</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
