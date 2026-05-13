'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, ArrowLeft, Save, Plus, Trash2, TrendingDown,
  CalendarClock, BarChart3, ChevronDown, Copy, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

type MonthAmounts = [number, number, number, number, number, number,
                     number, number, number, number, number, number];

interface ForecastRow {
  id: number;
  year: number;
  category: string;
  sortOrder: number;
  notes: string | null;
  months: MonthAmounts;
}

interface ForecastData {
  year: number;
  forecast: ForecastRow[];
  isTemplate: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `SAR ${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `SAR ${(amount / 1_000).toFixed(1)}K`;
  return formatSAR(amount);
}

function parseAmount(val: string): number {
  const n = parseFloat(val.replace(/,/g, ''));
  return isNaN(n) || n < 0 ? 0 : n;
}

function rowTotal(months: MonthAmounts): number {
  return months.reduce((s, v) => s + v, 0);
}

function colTotal(rows: ForecastRow[], monthIdx: number): number {
  return rows.reduce((s, r) => s + r.months[monthIdx], 0);
}

function grandTotal(rows: ForecastRow[]): number {
  return rows.reduce((s, r) => s + rowTotal(r.months), 0);
}

function nextId(rows: ForecastRow[]): number {
  const minId = rows.reduce((m, r) => Math.min(m, r.id), 0);
  return minId - 1;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ExpensesForecastPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<ForecastData | null>(null);
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<'saved' | 'error' | null>(null);
  const [fillTarget, setFillTarget] = useState<number | null>(null); // row id for fill-across dropdown
  const fillRef = useRef<HTMLDivElement>(null);

  const fetchForecast = useCallback(async (y: number) => {
    setLoading(true);
    setDirty(false);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/financial/reports/expenses-forecast?year=${y}`);
      if (res.ok) {
        const d: ForecastData = await res.json();
        setData(d);
        setRows(d.forecast.map(r => ({ ...r, months: [...r.months] as MonthAmounts })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForecast(year); }, [year, fetchForecast]);

  // Close fill dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fillRef.current && !fillRef.current.contains(e.target as Node)) {
        setFillTarget(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateCell = (rowId: number, monthIdx: number, raw: string) => {
    setRows((prev: ForecastRow[]) => prev.map((r: ForecastRow) =>
      r.id !== rowId ? r : {
        ...r,
        months: r.months.map((v: number, i: number) => i === monthIdx ? parseAmount(raw) : v) as MonthAmounts,
      }
    ));
    setDirty(true);
    setSaveMsg(null);
  };

  const updateCategory = (rowId: number, value: string) => {
    setRows((prev: ForecastRow[]) => prev.map((r: ForecastRow) => r.id !== rowId ? r : { ...r, category: value }));
    setDirty(true);
  };

  const fillAcross = (rowId: number, sourceIdx: number) => {
    const row = rows.find((r: ForecastRow) => r.id === rowId);
    if (!row) return;
    const val = row.months[sourceIdx];
    setRows((prev: ForecastRow[]) => prev.map((r: ForecastRow) =>
      r.id !== rowId ? r : { ...r, months: Array(12).fill(val) as MonthAmounts }
    ));
    setDirty(true);
    setFillTarget(null);
  };

  const addRow = () => {
    const id = nextId(rows);
    setRows((prev: ForecastRow[]) => [
      ...prev,
      {
        id,
        year,
        category: 'New Expense',
        sortOrder: prev.length + 1,
        notes: null,
        months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as MonthAmounts,
      },
    ]);
    setDirty(true);
  };

  const deleteRow = (rowId: number) => {
    setRows((prev: ForecastRow[]) => prev.filter((r: ForecastRow) => r.id !== rowId));
    setDirty(true);
  };

  const save = async () => {
    if (!dirty) return;
    // Validate categories are non-empty
    const invalid = rows.some((r: ForecastRow) => !r.category.trim());
    if (invalid) { setSaveMsg('error'); return; }

    setSaving(true);
    setSaveMsg(null);
    try {
      const body = {
        year,
        rows: rows.map((r: ForecastRow, i: number) => ({
          category: r.category.trim(),
          sortOrder: i + 1,
          notes: r.notes ?? null,
          months: r.months,
        })),
      };
      const res = await fetch('/api/financial/reports/expenses-forecast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveMsg('saved');
        setDirty(false);
        fetchForecast(year);
      } else {
        setSaveMsg('error');
      }
    } catch {
      setSaveMsg('error');
    } finally {
      setSaving(false);
    }
  };

  // KPI calculations
  const grand = grandTotal(rows);
  const monthTotals = MONTH_LABELS.map((_, i) => colTotal(rows, i));
  const maxMonth = Math.max(...monthTotals, 0);
  const avgMonthly = monthTotals.filter(v => v > 0).length > 0
    ? grand / monthTotals.filter(v => v > 0).length
    : 0;
  const topCategory = rows.slice().sort((a: ForecastRow, b: ForecastRow) => rowTotal(b.months) - rowTotal(a.months))[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link href="/financial">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Expenses Cash-Out Forecast</h1>
          <p className="text-sm text-muted-foreground">
            Plan and track fixed monthly operational expenses for the full year
          </p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear((y: number) => y - 1)}>‹</Button>
          <span className="font-semibold text-lg w-14 text-center">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear((y: number) => y + 1)}>›</Button>
          <Button variant="outline" size="icon" title="Refresh" onClick={() => fetchForecast(year)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Annual Total</p>
                <p className="text-lg font-bold text-red-600">{formatCompact(grand)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Monthly (active)</p>
                <p className="text-lg font-bold">{formatCompact(avgMonthly)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Peak Month</p>
                <p className="text-lg font-bold">{formatCompact(maxMonth)}</p>
                <p className="text-xs text-muted-foreground">
                  {MONTH_LABELS[monthTotals.indexOf(maxMonth)]} {year}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-purple-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Largest Category</p>
                <p className="text-base font-bold truncate max-w-[130px]">
                  {topCategory?.category ?? '—'}
                </p>
                {topCategory && (
                  <p className="text-xs text-muted-foreground">
                    {formatCompact(rowTotal(topCategory.months))}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Monthly Expense Budget — {year}</CardTitle>
            {data?.isTemplate && (
              <p className="text-xs text-muted-foreground mt-1">
                No saved data for {year} yet. Fill in the amounts and save.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saveMsg === 'saved' && (
              <Badge variant="outline" className="text-green-600 border-green-400">Saved</Badge>
            )}
            {saveMsg === 'error' && (
              <Badge variant="destructive">Save failed</Badge>
            )}
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b">
                  <th className="text-left p-3 sticky left-0 bg-muted/60 z-10 min-w-[160px]">
                    Category
                  </th>
                  {MONTH_LABELS.map(m => (
                    <th key={m} className="text-right p-2 min-w-[90px] font-medium">{m}</th>
                  ))}
                  <th className="text-right p-3 min-w-[110px] font-semibold bg-muted/80">
                    Annual Total
                  </th>
                  <th className="p-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row: ForecastRow) => {
                  const total = rowTotal(row.months);
                  return (
                    <tr key={row.id} className="border-b hover:bg-muted/20 group">
                      {/* Category cell */}
                      <td className="p-2 sticky left-0 bg-background z-10 group-hover:bg-muted/20">
                        <Input
                          value={row.category}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCategory(row.id, e.target.value)}
                          className="h-7 text-sm font-medium border-transparent hover:border-input focus:border-input bg-transparent"
                        />
                      </td>
                      {/* Month cells */}
                      {row.months.map((val: number, monthIdx: number) => (
                        <td key={monthIdx} className="p-1 relative">
                          <div className="flex items-center">
                            <Input
                              type="number"
                              min={0}
                              step={100}
                              value={val === 0 ? '' : val}
                              placeholder="0"
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCell(row.id, monthIdx, e.target.value)}
                              className="h-7 text-right text-xs w-full border-transparent hover:border-input focus:border-input bg-transparent pr-1"
                            />
                            {/* Fill-across trigger */}
                            <div className="relative" ref={fillTarget === row.id ? fillRef : undefined}>
                              <button
                                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded text-muted-foreground transition-opacity ml-0.5"
                                title="Fill all months with this value"
                                onClick={() => setFillTarget(fillTarget === row.id ? null : row.id)}
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              {fillTarget === row.id && (
                                <div className="absolute right-0 top-6 z-20 bg-popover border rounded shadow-lg p-2 min-w-[160px] text-xs">
                                  <p className="font-medium mb-1 text-muted-foreground">Fill all months with:</p>
                                  {row.months.map((v: number, i: number) => (
                                    <button
                                      key={i}
                                      className="block w-full text-left px-2 py-1 rounded hover:bg-muted"
                                      onClick={() => fillAcross(row.id, i)}
                                    >
                                      {MONTH_LABELS[i]}: {formatSAR(v)}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      ))}
                      {/* Row total */}
                      <td className={cn(
                        'p-3 text-right font-semibold tabular-nums bg-muted/30',
                        total > 0 ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {total > 0 ? formatSAR(total) : '—'}
                      </td>
                      {/* Delete */}
                      <td className="p-1">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 rounded text-destructive transition-opacity"
                          title="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Monthly totals footer */}
              <tfoot>
                <tr className="bg-muted/60 border-t-2 font-semibold">
                  <td className="p-3 sticky left-0 bg-muted/60 z-10 text-sm">Monthly Total</td>
                  {monthTotals.map((total, i) => (
                    <td key={i} className="p-2 text-right tabular-nums text-sm">
                      {total > 0 ? formatSAR(total) : '—'}
                    </td>
                  ))}
                  <td className="p-3 text-right tabular-nums text-sm font-bold text-red-600 bg-muted/80">
                    {formatSAR(grand)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly bar chart (visual) */}
      {grand > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Cash-Out Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {MONTH_LABELS.map((label, i) => {
                const val = monthTotals[i];
                const pct = maxMonth > 0 ? (val / maxMonth) * 100 : 0;
                return (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <span className="w-8 text-muted-foreground text-xs shrink-0">{label}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          val > 0 ? 'bg-red-500/70' : 'bg-transparent'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-28 text-right tabular-nums text-xs font-medium">
                      {val > 0 ? formatCompact(val) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category breakdown */}
      {rows.length > 0 && grand > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Annual Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rows
                .filter((r: ForecastRow) => rowTotal(r.months) > 0)
                .sort((a: ForecastRow, b: ForecastRow) => rowTotal(b.months) - rowTotal(a.months))
                .map((r: ForecastRow) => {
                  const total = rowTotal(r.months);
                  const pct = grand > 0 ? (total / grand) * 100 : 0;
                  return (
                    <div key={r.id} className="flex items-center gap-3 text-sm">
                      <span className="w-36 text-xs truncate shrink-0">{r.category}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500/70 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs text-muted-foreground">
                        {pct.toFixed(1)}%
                      </span>
                      <span className="w-28 text-right tabular-nums text-xs font-medium">
                        {formatCompact(total)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {dirty && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
            {saving
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
