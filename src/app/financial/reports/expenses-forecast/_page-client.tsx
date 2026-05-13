'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2, ArrowLeft, Save, Plus, Trash2, TrendingDown,
  CalendarClock, BarChart3, RefreshCw, ChevronDown, ChevronUp,
  Sparkles, Repeat, CalendarRange,
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

type Frequency = 'monthly' | 'annual';

// ── Constants ──────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface PresetCategory {
  value: string;
  label: string;
  icon: string;
  group: string;
  defaultFrequency: Frequency;
}

const PRESET_CATEGORIES: PresetCategory[] = [
  { value: 'Salaries',           label: 'Salaries',           icon: '👥', group: 'Personnel',  defaultFrequency: 'monthly' },
  { value: 'GOSI / Saudization', label: 'GOSI',               icon: '🏥', group: 'Personnel',  defaultFrequency: 'monthly' },
  { value: 'Factory Leases',     label: 'Factory Leases',     icon: '🏭', group: 'Facilities', defaultFrequency: 'annual'  },
  { value: 'Office Rent',        label: 'Office Rent',        icon: '🏢', group: 'Facilities', defaultFrequency: 'annual'  },
  { value: 'Electricity',        label: 'Electricity',        icon: '⚡', group: 'Utilities',  defaultFrequency: 'monthly' },
  { value: 'Water',              label: 'Water',              icon: '💧', group: 'Utilities',  defaultFrequency: 'monthly' },
  { value: 'Fuel',               label: 'Fuel',               icon: '⛽', group: 'Utilities',  defaultFrequency: 'monthly' },
  { value: 'Telecom',            label: 'Telecom',            icon: '📡', group: 'Utilities',  defaultFrequency: 'monthly' },
  { value: 'Maintenance',        label: 'Maintenance',        icon: '🔧', group: 'Operations', defaultFrequency: 'monthly' },
  { value: 'Insurance',          label: 'Insurance',          icon: '🛡️', group: 'Operations', defaultFrequency: 'annual'  },
  { value: 'Transportation',     label: 'Transportation',     icon: '🚛', group: 'Operations', defaultFrequency: 'monthly' },
  { value: 'Office Expenses',    label: 'Office Expenses',    icon: '📋', group: 'Operations', defaultFrequency: 'monthly' },
  { value: '__other__',          label: 'Other',              icon: '✏️', group: 'Other',      defaultFrequency: 'monthly' },
];

const CATEGORY_GROUPS = ['Personnel', 'Facilities', 'Utilities', 'Operations', 'Other'];

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

function buildMonths(amount: number, frequency: Frequency): MonthAmounts {
  if (frequency === 'monthly') {
    return Array(12).fill(amount) as MonthAmounts;
  }
  // annual: distribute equally, rounding so the total stays correct
  const base = Math.floor(amount / 12);
  const remainder = Math.round(amount - base * 12);
  const months = Array(12).fill(base) as MonthAmounts;
  if (remainder > 0) months[0] = base + remainder;
  return months;
}

// ── Add Expense Dialog ─────────────────────────────────────────────────────

interface AddExpenseDialogProps {
  open: boolean;
  year: number;
  existingCategories: string[];
  onClose: () => void;
  onAdd: (row: Omit<ForecastRow, 'id' | 'year' | 'sortOrder'>) => void;
}

function AddExpenseDialog({ open, year, existingCategories, onClose, onAdd }: AddExpenseDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [amountRaw, setAmountRaw] = useState('');
  const [notes, setNotes] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedPreset(null);
      setCustomName('');
      setFrequency('monthly');
      setAmountRaw('');
      setNotes('');
    }
  }, [open]);

  // Auto-set default frequency when selecting a preset
  const handlePresetSelect = (preset: PresetCategory) => {
    setSelectedPreset(preset.value);
    setFrequency(preset.defaultFrequency);
    setTimeout(() => amountRef.current?.focus(), 50);
  };

  const categoryName = selectedPreset === '__other__'
    ? customName.trim()
    : selectedPreset ?? '';

  const amount = parseAmount(amountRaw);
  const previewMonths = amount > 0 ? buildMonths(amount, frequency) : null;
  const previewTotal = previewMonths ? previewMonths.reduce((s, v) => s + v, 0) : 0;

  const isDuplicate = existingCategories.includes(categoryName);
  const canAdd = categoryName.length > 0 && amount > 0 && !isDuplicate;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      category: categoryName,
      notes: notes.trim() || null,
      months: buildMonths(amount, frequency),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Add Expense — {year}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Category picker */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Expense Type
            </Label>
            <div className="space-y-3">
              {CATEGORY_GROUPS.map(group => {
                const items = PRESET_CATEGORIES.filter(c => c.group === group);
                return (
                  <div key={group}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-medium">
                      {group}
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {items.map(preset => {
                        const alreadyExists = preset.value !== '__other__' &&
                          existingCategories.includes(preset.value);
                        return (
                          <button
                            key={preset.value}
                            disabled={alreadyExists}
                            onClick={() => handlePresetSelect(preset)}
                            className={cn(
                              'flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all',
                              'hover:border-primary hover:bg-primary/5',
                              selectedPreset === preset.value
                                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                : 'border-border bg-muted/30',
                              alreadyExists && 'opacity-40 cursor-not-allowed hover:border-border hover:bg-transparent'
                            )}
                            title={alreadyExists ? 'Already in budget' : preset.value}
                          >
                            <span className="text-xl leading-none">{preset.icon}</span>
                            <span className="text-[10px] font-medium leading-tight">{preset.label}</span>
                            {alreadyExists && (
                              <span className="text-[9px] text-muted-foreground">added</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom category name (shown when "Other" is selected) */}
          {selectedPreset === '__other__' && (
            <div className="space-y-1.5">
              <Label htmlFor="custom-name">Category Name</Label>
              <Input
                id="custom-name"
                placeholder="e.g. Software Subscriptions"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                autoFocus
              />
              {isDuplicate && customName.trim() && (
                <p className="text-xs text-destructive">This category is already in the budget.</p>
              )}
            </div>
          )}

          {/* Frequency */}
          {selectedPreset && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                How is this expense paid?
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFrequency('monthly')}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all',
                    frequency === 'monthly'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  )}
                >
                  <Repeat className="h-4 w-4 shrink-0 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Monthly</p>
                    <p className="text-[11px] text-muted-foreground">Same amount each month</p>
                  </div>
                </button>
                <button
                  onClick={() => setFrequency('annual')}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all',
                    frequency === 'annual'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  )}
                >
                  <CalendarRange className="h-4 w-4 shrink-0 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Annual Total</p>
                    <p className="text-[11px] text-muted-foreground">Spread equally over 12 months</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Amount */}
          {selectedPreset && (
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">
                {frequency === 'monthly' ? 'Monthly Amount (SAR)' : 'Annual Total (SAR)'}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  SAR
                </span>
                <Input
                  ref={amountRef}
                  id="expense-amount"
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="0"
                  value={amountRaw}
                  onChange={e => setAmountRaw(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && canAdd) handleAdd(); }}
                  className="pl-12 text-lg font-semibold"
                />
              </div>
            </div>
          )}

          {/* Live preview */}
          {previewMonths && amount > 0 && (
            <div className="rounded-lg bg-muted/50 border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Monthly Breakdown Preview
              </p>
              <div className="grid grid-cols-6 gap-1">
                {MONTH_LABELS.map((label, i) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-medium tabular-nums">
                      {(previewMonths[i] / 1000).toFixed(0)}K
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-xs text-muted-foreground">Annual total</span>
                <span className="text-sm font-bold text-primary">{formatCompact(previewTotal)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedPreset && (
            <div className="space-y-1.5">
              <Label htmlFor="expense-notes" className="text-muted-foreground text-xs">
                Notes (optional)
              </Label>
              <Textarea
                id="expense-notes"
                placeholder="e.g. Factory 1 + Factory 2 combined lease"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!canAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add to Budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Quick Fill Dialog ──────────────────────────────────────────────────────

interface QuickFillDialogProps {
  row: ForecastRow | null;
  onClose: () => void;
  onApply: (rowId: number, months: MonthAmounts) => void;
}

function QuickFillDialog({ row, onClose, onApply }: QuickFillDialogProps) {
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [amountRaw, setAmountRaw] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (row) {
      setAmountRaw('');
      setFrequency('monthly');
      setTimeout(() => amountRef.current?.focus(), 50);
    }
  }, [row]);

  const amount = parseAmount(amountRaw);
  const canApply = amount > 0;

  const handleApply = () => {
    if (!row || !canApply) return;
    onApply(row.id, buildMonths(amount, frequency));
    onClose();
  };

  return (
    <Dialog open={!!row} onOpenChange={(v: boolean) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Quick Fill — {row?.category}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFrequency('monthly')}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all text-sm',
                frequency === 'monthly'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Repeat className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <div>
                <p className="font-medium text-xs">Monthly</p>
                <p className="text-[10px] text-muted-foreground">Same each month</p>
              </div>
            </button>
            <button
              onClick={() => setFrequency('annual')}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all text-sm',
                frequency === 'annual'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <CalendarRange className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              <div>
                <p className="font-medium text-xs">Annual</p>
                <p className="text-[10px] text-muted-foreground">÷ 12 months</p>
              </div>
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qf-amount" className="text-xs">
              {frequency === 'monthly' ? 'Monthly Amount (SAR)' : 'Annual Total (SAR)'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">SAR</span>
              <Input
                ref={amountRef}
                id="qf-amount"
                type="number"
                min={0}
                step={1000}
                placeholder="0"
                value={amountRaw}
                onChange={e => setAmountRaw(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canApply) handleApply(); }}
                className="pl-12 font-semibold"
              />
            </div>
          </div>

          {amount > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              {frequency === 'monthly'
                ? `Fills all 12 months with ${formatSAR(amount)} → ${formatCompact(amount * 12)} annually`
                : `${formatSAR(amount)} ÷ 12 = ${formatCompact(Math.round(amount / 12))} per month`}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleApply} disabled={!canApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ExpensesForecastPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<ForecastData | null>(null);
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<'saved' | 'error' | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [quickFillRow, setQuickFillRow] = useState<ForecastRow | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

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

  const updateNotes = (rowId: number, value: string) => {
    setRows((prev: ForecastRow[]) => prev.map((r: ForecastRow) =>
      r.id !== rowId ? r : { ...r, notes: value || null }
    ));
    setDirty(true);
  };

  const applyQuickFill = (rowId: number, months: MonthAmounts) => {
    setRows((prev: ForecastRow[]) => prev.map((r: ForecastRow) =>
      r.id !== rowId ? r : { ...r, months }
    ));
    setDirty(true);
    setSaveMsg(null);
  };

  const handleAddExpense = (partial: Omit<ForecastRow, 'id' | 'year' | 'sortOrder'>) => {
    const id = nextId(rows);
    setRows((prev: ForecastRow[]) => [
      ...prev,
      { id, year, sortOrder: prev.length + 1, ...partial },
    ]);
    setDirty(true);
  };

  const deleteRow = (rowId: number) => {
    setRows((prev: ForecastRow[]) => prev.filter((r: ForecastRow) => r.id !== rowId));
    setExpandedNotes(prev => { const s = new Set(prev); s.delete(rowId); return s; });
    setDirty(true);
  };

  const toggleNotes = (rowId: number) => {
    setExpandedNotes(prev => {
      const s = new Set(prev);
      if (s.has(rowId)) s.delete(rowId); else s.add(rowId);
      return s;
    });
  };

  const save = async () => {
    if (!dirty) return;
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
  const topCategory = rows.slice().sort((a, b) => rowTotal(b.months) - rowTotal(a.months))[0];
  const existingCategories = rows.map(r => r.category);
  const unbudgetedCount = rows.filter(r => rowTotal(r.months) === 0).length;

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
            Plan fixed operational expenses per year — monthly or annual totals auto-distributed
          </p>
        </div>
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
                <p className="text-xs text-muted-foreground">Avg Monthly</p>
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

      {/* Unbudgeted warning */}
      {unbudgetedCount > 0 && grand > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">{unbudgetedCount} categor{unbudgetedCount === 1 ? 'y has' : 'ies have'} no amounts set.</span>
          <span className="text-amber-700 dark:text-amber-400">Use Quick Fill to set amounts quickly.</span>
        </div>
      )}

      {/* Forecast Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Monthly Budget — {year}</CardTitle>
            {data?.isTemplate && (
              <p className="text-xs text-muted-foreground mt-1">
                No saved data for {year}. Click <strong>Add Expense</strong> to build your budget.
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
            <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Expense
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4">📊</span>
              <p className="text-lg font-semibold mb-1">No expenses budgeted yet</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                Add your fixed operational expenses — salaries, leases, utilities — and we'll distribute the amounts across months automatically.
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add First Expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="text-left p-3 sticky left-0 bg-muted/60 z-10 min-w-[170px]">Category</th>
                    {MONTH_LABELS.map(m => (
                      <th key={m} className="text-right p-2 min-w-[80px] font-medium">{m}</th>
                    ))}
                    <th className="text-right p-3 min-w-[100px] font-semibold bg-muted/80">Annual</th>
                    <th className="text-right p-2 min-w-[50px] font-medium text-muted-foreground text-xs">%</th>
                    <th className="p-2 w-20 text-center text-xs text-muted-foreground font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: ForecastRow) => {
                    const total = rowTotal(row.months);
                    const pct = grand > 0 ? (total / grand) * 100 : 0;
                    const notesExpanded = expandedNotes.has(row.id);
                    const isEmpty = total === 0;

                    return (
                      <React.Fragment key={row.id}>
                        <tr className={cn(
                          'border-b group',
                          isEmpty ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/60' : 'hover:bg-muted/20'
                        )}>
                          {/* Category */}
                          <td className={cn(
                            'p-2 sticky left-0 z-10',
                            isEmpty
                              ? 'bg-amber-50/40 dark:bg-amber-950/10 group-hover:bg-amber-50/60'
                              : 'bg-background group-hover:bg-muted/20'
                          )}>
                            <Input
                              value={row.category}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCategory(row.id, e.target.value)}
                              className="h-7 text-sm font-medium border-transparent hover:border-input focus:border-input bg-transparent"
                            />
                          </td>
                          {/* Month cells */}
                          {row.months.map((val: number, monthIdx: number) => (
                            <td key={monthIdx} className="p-1">
                              <Input
                                type="number"
                                min={0}
                                step={100}
                                value={val === 0 ? '' : val}
                                placeholder="—"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCell(row.id, monthIdx, e.target.value)}
                                className={cn(
                                  'h-7 text-right text-xs w-full border-transparent hover:border-input focus:border-input bg-transparent',
                                  val > 0 ? 'text-foreground' : 'text-muted-foreground'
                                )}
                              />
                            </td>
                          ))}
                          {/* Annual total */}
                          <td className={cn(
                            'p-3 text-right font-semibold tabular-nums bg-muted/30',
                            total > 0 ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {total > 0 ? formatSAR(total) : '—'}
                          </td>
                          {/* Percentage */}
                          <td className="p-2 text-right tabular-nums text-xs text-muted-foreground">
                            {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                          </td>
                          {/* Actions */}
                          <td className="p-1 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => setQuickFillRow(row)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Quick fill months"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => toggleNotes(row.id)}
                                className={cn(
                                  'p-1 rounded hover:bg-muted transition-colors',
                                  row.notes || notesExpanded
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                                title="Toggle notes"
                              >
                                {notesExpanded
                                  ? <ChevronUp className="h-3.5 w-3.5" />
                                  : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => deleteRow(row.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Notes row */}
                        {notesExpanded && (
                          <tr className="border-b bg-muted/10">
                            <td colSpan={16} className="px-3 py-2">
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-muted-foreground mt-1.5 shrink-0">Note:</span>
                                <Input
                                  value={row.notes ?? ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNotes(row.id, e.target.value)}
                                  placeholder="Add a note for this expense…"
                                  className="h-7 text-xs border-muted bg-transparent"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr className="bg-muted/60 border-t-2 font-semibold">
                    <td className="p-3 sticky left-0 bg-muted/60 z-10 text-sm">Monthly Total</td>
                    {monthTotals.map((total, i) => (
                      <td key={i} className="p-2 text-right tabular-nums text-sm">
                        {total > 0 ? formatCompact(total) : '—'}
                      </td>
                    ))}
                    <td className="p-3 text-right tabular-nums text-sm font-bold text-red-600 bg-muted/80">
                      {formatSAR(grand)}
                    </td>
                    <td className="p-2 text-right text-xs text-muted-foreground">100%</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly distribution chart */}
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
                      <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
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

      {/* Sticky save bar */}
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

      {/* Dialogs */}
      <AddExpenseDialog
        open={addDialogOpen}
        year={year}
        existingCategories={existingCategories}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddExpense}
      />
      <QuickFillDialog
        row={quickFillRow}
        onClose={() => setQuickFillRow(null)}
        onApply={applyQuickFill}
      />
    </div>
  );
}
