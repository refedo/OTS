'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Landmark, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface ForecastWeek {
  week: number;
  weekStart: string;
  weekEnd: string;
  expectedCollections: number;
  expectedPayments: number;
  netFlow: number;
  projectedBalance: number;
}

interface ForecastReport {
  generatedAt: string;
  openingBalance: number;
  weeks: ForecastWeek[];
}

interface ScheduleEnrichment {
  dueDate: string | null;
  receivedAmount: number | string | null;
  status: string;
}

interface ScheduleRow {
  id: string;
  projectNumber: string;
  projectName: string;
  clientName: string;
  slotLabel: string;
  amount: number;
  enrichment: ScheduleEnrichment | null;
  baseDate: string | null;
}

interface MonthGroup {
  key: string;
  label: string;
  monthStart: string;
  monthEnd: string;
  collections: number;
  payments: number;
  netFlow: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return Number(v);
}

function monthLastDay(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CashFlowForecastPage() {
  const [report, setReport] = useState<ForecastReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [monthDrilldown, setMonthDrilldown] = useState<Map<string, ScheduleRow[]>>(new Map());
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/financial/reports/cash-flow-forecast')
      .then(res => res.ok ? res.json() : null)
      .then((data: ForecastReport | null) => { if (data) setReport(data); })
      .catch(() => { /* fetch failed — loading state cleared below */ })
      .finally(() => setLoading(false));
  }, []);

  // Group the 13 weeks into calendar months
  const monthGroups = useMemo<MonthGroup[]>(() => {
    if (!report) return [];
    const map = new Map<string, MonthGroup>();
    for (const w of report.weeks) {
      const d = new Date(w.weekStart);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const existing = map.get(key);
      if (existing) {
        existing.collections += w.expectedCollections;
        existing.payments += w.expectedPayments;
        existing.netFlow += w.netFlow;
      } else {
        const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const monthEnd = monthLastDay(year, month);
        map.set(key, { key, label, monthStart, monthEnd, collections: w.expectedCollections, payments: w.expectedPayments, netFlow: w.netFlow });
      }
    }
    return Array.from(map.values());
  }, [report]);

  const loadDrilldown = useCallback(async (group: MonthGroup) => {
    if (monthDrilldown.has(group.key)) return;
    setLoadingMonth(group.key);
    try {
      const res = await fetch(
        `/api/financial/payment-schedule-report?dateFrom=${group.monthStart}&dateTo=${group.monthEnd}`,
      );
      if (res.ok) {
        const data = await res.json() as { rows: ScheduleRow[] };
        setMonthDrilldown(prev => new Map(prev).set(group.key, data.rows));
      }
    } catch {
      // drilldown fetch failed silently
    } finally {
      setLoadingMonth(null);
    }
  }, [monthDrilldown]);

  const toggleMonth = useCallback((group: MonthGroup) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(group.key)) {
        next.delete(group.key);
      } else {
        next.add(group.key);
        loadDrilldown(group);
      }
      return next;
    });
  }, [loadDrilldown]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/financial">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Cash Flow Forecast</h1>
          <p className="text-sm text-muted-foreground">13-week rolling projection based on invoice due dates</p>
        </div>
      </div>

      {report && (
        <>
          <Card className="border-blue-200 dark:border-blue-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Landmark className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Opening Balance (Current Bank Total)</div>
                  <div className="text-2xl font-bold text-blue-600">{formatSAR(report.openingBalance)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 13-Week Rolling Table */}
          <Card>
            <CardHeader>
              <CardTitle>13-Week Rolling Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Week</th>
                      <th className="text-left p-3">Period</th>
                      <th className="text-right p-3">Expected Collections</th>
                      <th className="text-right p-3">Expected Payments</th>
                      <th className="text-right p-3">Net Flow</th>
                      <th className="text-right p-3">Projected Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.weeks.map(w => (
                      <tr key={w.week} className={cn('border-b hover:bg-muted/30', w.projectedBalance < 0 && 'bg-red-50 dark:bg-red-950/20')}>
                        <td className="p-3 font-medium">Week {w.week}</td>
                        <td className="p-3 text-xs text-muted-foreground">{w.weekStart} — {w.weekEnd}</td>
                        <td className="p-3 text-right text-green-600">{formatSAR(w.expectedCollections)}</td>
                        <td className="p-3 text-right text-red-600">{formatSAR(w.expectedPayments)}</td>
                        <td className={cn('p-3 text-right font-medium', w.netFlow >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatSAR(w.netFlow)}
                        </td>
                        <td className={cn('p-3 text-right font-bold', w.projectedBalance >= 0 ? 'text-blue-600' : 'text-red-600')}>
                          {formatSAR(w.projectedBalance)}
                          {w.projectedBalance < 0 && (
                            <Badge variant="destructive" className="ml-2 text-xs">Deficit</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Generated: {new Date(report.generatedAt).toLocaleString()}. Forecast based on unpaid invoice due dates.
              </div>
            </CardContent>
          </Card>

          {/* Monthly Summary + Payment Schedule Drill-Down */}
          {monthGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Summary — Payment Schedule Drill-Down</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Aggregated from the 13-week forecast. Expand each month to see which payment terms are due.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 w-8" />
                      <th className="text-left p-3">Month</th>
                      <th className="text-right p-3">Collections</th>
                      <th className="text-right p-3">Payments</th>
                      <th className="text-right p-3">Net Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthGroups.map(group => {
                      const isOpen = expandedMonths.has(group.key);
                      const drillRows = monthDrilldown.get(group.key);
                      const isLoading = loadingMonth === group.key;
                      return (
                        <>
                          <tr
                            key={group.key}
                            className="border-b hover:bg-muted/30 cursor-pointer"
                            onClick={() => toggleMonth(group)}
                          >
                            <td className="p-3 text-muted-foreground">
                              {isOpen
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />
                              }
                            </td>
                            <td className="p-3 font-medium">{group.label}</td>
                            <td className="p-3 text-right text-green-600">{formatSAR(group.collections)}</td>
                            <td className="p-3 text-right text-red-600">{formatSAR(group.payments)}</td>
                            <td className={cn('p-3 text-right font-medium', group.netFlow >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {formatSAR(group.netFlow)}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={`${group.key}-detail`} className="border-b bg-muted/10">
                              <td colSpan={5} className="p-0">
                                {isLoading ? (
                                  <div className="flex justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  </div>
                                ) : !drillRows || drillRows.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">
                                    No payment terms due in {group.label}.
                                  </p>
                                ) : (
                                  <div className="px-4 py-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      Payment terms due in {group.label} — {drillRows.length} item{drillRows.length !== 1 ? 's' : ''}
                                    </p>
                                    <table className="w-full text-xs border rounded-md overflow-hidden">
                                      <thead>
                                        <tr className="bg-muted/50 border-b">
                                          <th className="text-left p-2">Project</th>
                                          <th className="text-left p-2">Client</th>
                                          <th className="text-left p-2">Slot</th>
                                          <th className="text-right p-2">Amount</th>
                                          <th className="text-right p-2">Received</th>
                                          <th className="text-right p-2">Balance</th>
                                          <th className="text-left p-2">Due Date</th>
                                          <th className="text-left p-2">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {drillRows.map(r => {
                                          const received = toNum(r.enrichment?.receivedAmount);
                                          const balance = Math.max(r.amount - received, 0);
                                          const dueDate = r.enrichment?.dueDate ?? r.baseDate;
                                          return (
                                            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                                              <td className="p-2">
                                                <div className="font-medium">{r.projectNumber}</div>
                                                <div className="text-muted-foreground truncate max-w-[120px]">{r.projectName}</div>
                                              </td>
                                              <td className="p-2 text-muted-foreground">{r.clientName}</td>
                                              <td className="p-2">{r.slotLabel}</td>
                                              <td className="p-2 text-right font-mono">{formatSAR(r.amount)}</td>
                                              <td className="p-2 text-right font-mono text-green-600">
                                                {received > 0 ? formatSAR(received) : '—'}
                                              </td>
                                              <td className="p-2 text-right font-mono font-medium text-amber-600">
                                                {formatSAR(balance > 0 ? balance : r.amount)}
                                              </td>
                                              <td className="p-2 whitespace-nowrap">{fmtDate(dueDate)}</td>
                                              <td className="p-2">
                                                <Badge
                                                  variant="secondary"
                                                  className={cn('text-xs', {
                                                    'bg-gray-100 text-gray-700': r.enrichment?.status === 'pending' || !r.enrichment,
                                                    'bg-blue-100 text-blue-700': r.enrichment?.status === 'triggered',
                                                    'bg-purple-100 text-purple-700': r.enrichment?.status === 'invoiced',
                                                    'bg-amber-100 text-amber-700': r.enrichment?.status === 'partially_received',
                                                    'bg-green-100 text-green-700': r.enrichment?.status === 'collected',
                                                    'bg-red-100 text-red-700': r.enrichment?.status === 'overdue',
                                                  })}
                                                >
                                                  {r.enrichment?.status ?? 'pending'}
                                                </Badge>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
