'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileDown, BarChart2, RefreshCw, Loader2, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';

type DashboardData = {
  year: number;
  programmeCompletionRate: number;
  auditsByDepartment: { scope: string; total: number; completed: number; ncCount: number; ofiCount: number }[];
  ncByClause: { clause: string; count: number }[];
  ncByDepartment: { scope: string; count: number }[];
  openCarAging: { overdue: number; dueSoon: number; onTrack: number };
  ofiAdoptionRate: number;
  totalAudits: number;
  completedAudits: number;
  totalNcs: number;
  totalOfis: number;
  openCars: number;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

async function loadLogoForPDF(): Promise<{ base64: string; aspectRatio: number; isWhite: boolean } | undefined> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return undefined;
    const data = await res.json() as { logoWhite?: string; companyLogo?: string };
    const whitePath = data.logoWhite;
    const colorPath = data.companyLogo;
    const logoPath = whitePath || colorPath;
    if (!logoPath) return undefined;
    const isWhite = !!whitePath;
    const imgRes = await fetch(logoPath);
    if (!imgRes.ok) return undefined;
    const blob = await imgRes.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const aspectRatio = await new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => resolve(1);
      img.src = base64;
    });
    return { base64, aspectRatio, isWhite };
  } catch {
    return undefined;
  }
}

async function exportPDF(data: DashboardData): Promise<void> {
  const { PDFReportBuilder } = await import('@/lib/pdf-builder');
  const logo = await loadLogoForPDF();
  const pdf = new PDFReportBuilder('landscape', 'steel');

  pdf.addHeader(
    'Hexa Steel®',
    'Integrated Management System — ISO 9001:2015 / ISO 14001:2015 / ISO 45001:2018',
    logo,
  );

  pdf.addTitle(
    `Audit Programme Dashboard — ${data.year}`,
    'HEXA-REC-026 · Procedure: Hexa-ISP-004 · ISO 9001:2015 §9.2',
  );

  pdf.addMetadataBox({
    'Year': String(data.year),
    'Generated': new Date().toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' }),
    'Document Ref': 'HEXA-REC-026',
    'Status': 'Auto-generated',
  });

  pdf.addSectionHeader('Programme Summary');
  pdf.addInfoGrid({
    'Completion Rate': `${data.programmeCompletionRate.toFixed(1)}%`,
    'OFI Adoption Rate': `${data.ofiAdoptionRate.toFixed(1)}%`,
    'Total Audits Scheduled': String(data.totalAudits),
    'Completed Audits': String(data.completedAudits),
    'Total NCs Raised': String(data.totalNcs),
    'Total OFIs Raised': String(data.totalOfis),
    'Open CARs': String(data.openCars),
    'Overdue CARs': String(data.openCarAging.overdue),
  }, 2);

  if (data.auditsByDepartment.length > 0) {
    pdf.addSectionHeader('Audits by Department');
    pdf.addTable(
      ['Department', 'Scheduled', 'Completed', 'NCs', 'OFIs', 'Completion %'],
      data.auditsByDepartment.map(d => [
        d.scope,
        d.total,
        d.completed,
        d.ncCount,
        d.ofiCount,
        d.total > 0 ? `${((d.completed / d.total) * 100).toFixed(0)}%` : '0%',
      ]),
      { alternateRows: true },
    );
  }

  if (data.ncByClause.length > 0) {
    pdf.addSectionHeader('NC Count by ISO Clause');
    const sorted = [...data.ncByClause].sort((a, b) => b.count - a.count);
    pdf.addTable(
      ['ISO Clause', 'NC Count'],
      sorted.map(c => [c.clause, c.count]),
      { alternateRows: true },
    );
  }

  pdf.addSectionHeader('CAR Aging');
  pdf.addInfoGrid({
    'Overdue': String(data.openCarAging.overdue),
    'Due Soon (≤14 days)': String(data.openCarAging.dueSoon),
    'On Track': String(data.openCarAging.onTrack),
    'Total Open CARs': String(data.openCars),
  }, 2);

  pdf.addFooter(
    'Hexa Steel® OTS · Confidential IMS Document · hexasteel.sa/ots',
    'HEXA-REC-026 · Hexa-ISP-004 · ISO 9001:2015 §9.2 — Auto-generated · No manual entry required',
  );

  const blob = pdf.getBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `HEXA-REC-026_Programme-Dashboard_${data.year}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProgrammeDashboardClient() {
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/ims/programme-dashboard?year=${y}`);
      if (!res.ok) { setError(true); return; }
      setData(await res.json() as DashboardData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(year); }, [fetchData, year]);

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportPDF(data);
    } finally {
      setExporting(false);
    }
  };

  const sortedNcByClause = data
    ? [...data.ncByClause].sort((a, b) => b.count - a.count)
    : [];
  const maxNcClauseCount = sortedNcByClause[0]?.count ?? 0;

  const sortedNcByDept = data
    ? [...data.ncByDepartment].sort((a, b) => b.count - a.count)
    : [];
  const maxNcDeptCount = sortedNcByDept[0]?.count ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <BarChart2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Audit Programme Dashboard</h1>
              <p className="text-slate-300 text-sm mt-0.5">ISO 9001:2015 §9.2 — Annual audit programme performance</p>
              <p className="text-slate-400/70 text-xs font-mono mt-1">HEXA-REC-026 · Auto-generated · Procedure: Hexa-ISP-004</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-28 bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={handleExport}
              disabled={exporting || !data}
            >
              {exporting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <FileDown className="w-3.5 h-3.5" />}
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            <span className="text-sm">Loading dashboard data…</span>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <AlertCircle className="w-8 h-8 text-red-300" />
            <span className="text-sm text-red-500">Failed to load dashboard data.</span>
            <Button size="sm" variant="outline" onClick={() => fetchData(year)} className="gap-1.5 mt-1">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <>
          {/* Controls */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => fetchData(year)} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rounded-xl border bg-white border-slate-200 p-4 hover:shadow-sm transition-shadow">
              <p className="text-xs text-slate-500 font-medium mb-2">Programme Completion</p>
              <p className="text-3xl font-bold text-[#2c3e50]">
                {data.programmeCompletionRate.toFixed(0)}
                <span className="text-lg font-semibold text-slate-400">%</span>
              </p>
            </div>
            <div className="rounded-xl border bg-blue-50 border-blue-200 p-4 hover:shadow-sm transition-shadow">
              <p className="text-xs text-slate-500 font-medium mb-2">Audits Scheduled</p>
              <p className="text-3xl font-bold text-blue-700">{data.totalAudits}</p>
            </div>
            <div className="rounded-xl border bg-emerald-50 border-emerald-200 p-4 hover:shadow-sm transition-shadow">
              <p className="text-xs text-slate-500 font-medium mb-2">Completed Audits</p>
              <p className="text-3xl font-bold text-emerald-700">{data.completedAudits}</p>
            </div>
            <div className="rounded-xl border bg-red-50 border-red-200 p-4 hover:shadow-sm transition-shadow">
              <p className="text-xs text-slate-500 font-medium mb-2">Total NCs Raised</p>
              <p className="text-3xl font-bold text-red-700">{data.totalNcs}</p>
            </div>
            <div className="rounded-xl border bg-amber-50 border-amber-200 p-4 hover:shadow-sm transition-shadow">
              <p className="text-xs text-slate-500 font-medium mb-2">Open CARs</p>
              <p className="text-3xl font-bold text-amber-700">{data.openCars}</p>
            </div>
            <div className="rounded-xl border bg-purple-50 border-purple-200 p-4 hover:shadow-sm transition-shadow">
              <p className="text-xs text-slate-500 font-medium mb-2">OFI Adoption Rate</p>
              <p className="text-3xl font-bold text-purple-700">
                {data.ofiAdoptionRate.toFixed(0)}
                <span className="text-lg font-semibold text-slate-400">%</span>
              </p>
            </div>
          </div>

          {/* Row 1: Audits by Dept + NC by Clause */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audits by Department */}
            <Card className="border shadow-sm overflow-hidden">
              <CardHeader className="px-4 py-3 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#2c3e50]">Audits by Department</CardTitle>
                  <p className="text-xs text-slate-400">{data.auditsByDepartment.length} depts</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data.auditsByDepartment.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">No audit data for {data.year}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wide">
                          <th className="px-4 py-2.5 text-left font-semibold">Dept</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Sched.</th>
                          <th className="px-4 py-2.5 text-center font-semibold">Done</th>
                          <th className="px-4 py-2.5 text-center font-semibold">NCs</th>
                          <th className="px-4 py-2.5 text-center font-semibold">OFIs</th>
                          <th className="px-4 py-2.5 text-left font-semibold">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.auditsByDepartment.map(row => {
                          const pct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
                          return (
                            <tr key={row.scope} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-slate-700 max-w-[120px] truncate" title={row.scope}>{row.scope}</td>
                              <td className="px-4 py-2.5 text-center text-slate-600">{row.total}</td>
                              <td className="px-4 py-2.5 text-center text-slate-600">{row.completed}</td>
                              <td className="px-4 py-2.5 text-center">
                                {row.ncCount > 0
                                  ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">{row.ncCount}</span>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {row.ofiCount > 0
                                  ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{row.ofiCount}</span>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-4 py-2.5 min-w-[90px]">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NC by ISO Clause */}
            <Card className="border shadow-sm overflow-hidden">
              <CardHeader className="px-4 py-3 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#2c3e50]">NC Count by ISO Clause</CardTitle>
                  <p className="text-xs text-slate-400">{sortedNcByClause.length} clauses</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {sortedNcByClause.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">No NCs recorded for {data.year}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wide">
                          <th className="px-4 py-2.5 text-left font-semibold">ISO Clause</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedNcByClause.map((row, idx) => (
                          <tr
                            key={row.clause}
                            className={`hover:bg-slate-50/80 transition-colors ${idx === 0 && row.count === maxNcClauseCount && maxNcClauseCount > 0 ? 'bg-red-50/60' : ''}`}
                          >
                            <td className={`px-4 py-2.5 font-mono text-sm ${idx === 0 && row.count === maxNcClauseCount && maxNcClauseCount > 0 ? 'font-bold text-red-700' : 'text-slate-700'}`}>
                              {row.clause}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold ${idx === 0 && row.count === maxNcClauseCount && maxNcClauseCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                {row.count}
                              </span>
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

          {/* Row 2: NC by Dept + CAR Aging */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NC by Department */}
            <Card className="border shadow-sm overflow-hidden">
              <CardHeader className="px-4 py-3 border-b bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#2c3e50]">NC Count by Department</CardTitle>
                  <p className="text-xs text-slate-400">{sortedNcByDept.length} depts</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {sortedNcByDept.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No NCs recorded for {data.year}</div>
                ) : (
                  <div className="space-y-2">
                    {sortedNcByDept.map((row, idx) => {
                      const pct = maxNcDeptCount > 0 ? Math.round((row.count / maxNcDeptCount) * 100) : 0;
                      return (
                        <div key={row.scope} className="flex items-center gap-3">
                          <div className="w-5 text-center text-xs text-slate-400 font-mono shrink-0">{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-700 truncate font-medium" title={row.scope}>{row.scope}</span>
                              <span className="ml-2 shrink-0 inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                {row.count}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-red-400 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CAR Aging */}
            <Card className="border shadow-sm overflow-hidden">
              <CardHeader className="px-4 py-3 border-b bg-slate-50">
                <CardTitle className="text-sm font-semibold text-[#2c3e50]">CAR Aging</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-800">Overdue</p>
                      <p className="text-xs text-red-600">Past target close date</p>
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-red-700">{data.openCarAging.overdue}</span>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Due Soon</p>
                      <p className="text-xs text-amber-600">Within 14 days</p>
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-amber-700">{data.openCarAging.dueSoon}</span>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">On Track</p>
                      <p className="text-xs text-emerald-600">More than 14 days remaining</p>
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-emerald-700">{data.openCarAging.onTrack}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer Note */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500 text-center">
              This dashboard is auto-generated from live data. No manual entry required. Exported as HEXA-REC-026 with Hexa Steel® IMS header.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
