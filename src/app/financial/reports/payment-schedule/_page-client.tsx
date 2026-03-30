'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Printer, Download, Loader2, PenLine, Plus,
  DollarSign, Clock, CheckCircle2, AlertTriangle, CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

type PaymentSlot =
  | 'downPayment'
  | 'payment2' | 'payment3' | 'payment4' | 'payment5' | 'payment6'
  | 'preliminaryRetention' | 'hoRetention';

type TriggerType = 'date' | 'milestone' | 'delivery' | 'drawing_approval' | 'manual';
type ActionRequired = 'issue_invoice' | 'collection_call' | 'stop_shipping' | 'proceed_shipping' | 'on_hold' | 'no_action';
type ScheduleStatus = 'pending' | 'triggered' | 'invoiced' | 'collected' | 'overdue';

interface Enrichment {
  id: number;
  projectId: string;
  paymentSlot: string;
  invoiceDolibarrId: number | null;
  invoiceRef: string | null;
  dueDate: string | null;
  triggerType: TriggerType | null;
  triggerDescription: string | null;
  actionRequired: ActionRequired | null;
  actionNotes: string | null;
  status: ScheduleStatus;
}

interface PaymentRow {
  id: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  projectStatus: string;
  clientName: string;
  paymentSlot: PaymentSlot;
  slotLabel: string;
  percentage: number;
  amount: number;
  ack: boolean;
  milestone: string | null;
  baseDate: string | null;
  enrichment: Enrichment | null;
}

interface InvoiceOption {
  id: number;
  ref: string;
  ref_client: string | null;
  total_ttc: number;
  date_invoice: string | null;
  date_due: string | null;
  is_paid: number;
}

interface Summary {
  total: number;
  collected: number;
  pending: number;
  overdue: number;
}

interface ReportData {
  rows: PaymentRow[];
  summary: Summary;
  invoices: InvoiceOption[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function effectiveStatus(row: PaymentRow): ScheduleStatus {
  const e = row.enrichment;
  if (!e) return 'pending';
  if (e.status === 'collected' || e.status === 'invoiced') return e.status;
  const dueDate = e.dueDate ?? row.baseDate;
  if (dueDate && new Date(dueDate) < new Date()) return 'overdue';
  return e.status;
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  pending: 'Pending',
  triggered: 'Triggered',
  invoiced: 'Invoiced',
  collected: 'Collected',
  overdue: 'Overdue',
};

const STATUS_VARIANT: Record<ScheduleStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  triggered: 'bg-blue-100 text-blue-700',
  invoiced: 'bg-purple-100 text-purple-700',
  collected: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

const TRIGGER_LABELS: Record<TriggerType, string> = {
  date: 'Date',
  milestone: 'Milestone',
  delivery: 'Delivery',
  drawing_approval: 'Drawing Approval',
  manual: 'Manual',
};

const ACTION_LABELS: Record<ActionRequired, string> = {
  issue_invoice: 'Issue Invoice',
  collection_call: 'Collection Call',
  stop_shipping: 'Stop Shipping',
  proceed_shipping: 'Proceed Shipping',
  on_hold: 'On Hold',
  no_action: 'No Action',
};

// ── Edit Drawer ────────────────────────────────────────────────────────────

interface EditDrawerProps {
  row: PaymentRow | null;
  invoices: InvoiceOption[];
  onClose: () => void;
  onSaved: () => void;
}

function EditDrawer({ row, invoices, onClose, onSaved }: EditDrawerProps) {
  const e = row?.enrichment;

  const [dueDate, setDueDate] = useState('');
  const [invoiceId, setInvoiceId] = useState<string>('none');
  const [triggerType, setTriggerType] = useState<string>('none');
  const [triggerDescription, setTriggerDescription] = useState('');
  const [actionRequired, setActionRequired] = useState<string>('none');
  const [actionNotes, setActionNotes] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setDueDate(e?.dueDate ? e.dueDate.slice(0, 10) : (row.baseDate ? row.baseDate.slice(0, 10) : ''));
    setInvoiceId(e?.invoiceDolibarrId ? String(e.invoiceDolibarrId) : 'none');
    setTriggerType(e?.triggerType ?? 'none');
    setTriggerDescription(e?.triggerDescription ?? '');
    setActionRequired(e?.actionRequired ?? 'none');
    setActionNotes(e?.actionNotes ?? '');
    setStatus(e?.status ?? 'pending');
  }, [row]);

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);

    const selectedInvoice = invoiceId !== 'none' ? invoices.find(i => i.id === parseInt(invoiceId)) : null;

    const payload = {
      projectId: row.projectId,
      paymentSlot: row.paymentSlot,
      dueDate: dueDate || null,
      invoiceDolibarrId: selectedInvoice ? selectedInvoice.id : null,
      invoiceRef: selectedInvoice ? selectedInvoice.ref : null,
      triggerType: triggerType !== 'none' ? triggerType : null,
      triggerDescription: triggerDescription || null,
      actionRequired: actionRequired !== 'none' ? actionRequired : null,
      actionNotes: actionNotes || null,
      status,
    };

    try {
      if (e?.id) {
        await fetch(`/api/financial/payment-schedule-report/${e.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/financial/payment-schedule-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!row || !e?.id) return;
    setSaving(true);
    try {
      await fetch(`/api/financial/payment-schedule-report/${e.id}`, { method: 'DELETE' });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!row} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{row?.slotLabel} — {row?.projectNumber}</SheetTitle>
          <SheetDescription>
            {row?.clientName} · SAR {fmt(row?.amount ?? 0)}
            {row?.percentage ? ` (${row.percentage}%)` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {row?.milestone && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium">Terms: </span>{row.milestone}
            </div>
          )}

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Link to Invoice</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select invoice..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No invoice linked —</SelectItem>
                {invoices.map(inv => (
                  <SelectItem key={inv.id} value={String(inv.id)}>
                    {inv.ref} · SAR {fmt(inv.total_ttc)} · {inv.is_paid ? 'Paid' : 'Unpaid'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="drawing_approval">Drawing Approval</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType && triggerType !== 'none' && (
            <div className="space-y-2">
              <Label>Trigger Description</Label>
              <Input
                value={triggerDescription}
                onChange={e => setTriggerDescription(e.target.value)}
                placeholder="Describe the trigger condition..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Action Required</Label>
            <Select value={actionRequired} onValueChange={setActionRequired}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                <SelectItem value="issue_invoice">Issue Invoice</SelectItem>
                <SelectItem value="collection_call">Collection Call</SelectItem>
                <SelectItem value="stop_shipping">Stop Shipping</SelectItem>
                <SelectItem value="proceed_shipping">Proceed Shipping</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="no_action">No Action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionRequired && actionRequired !== 'none' && (
            <div className="space-y-2">
              <Label>Action Notes</Label>
              <Textarea
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                placeholder="Instructions for the accountant..."
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="triggered">Triggered</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
                <SelectItem value="collected">Collected</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
            {e?.id && (
              <Button variant="outline" onClick={handleClear} disabled={saving}>
                Clear
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Cash Flow Timeline ─────────────────────────────────────────────────────

function CashFlowTimeline({ rows }: { rows: PaymentRow[] }) {
  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const status = effectiveStatus(row);
      if (status === 'collected') continue;
      const dueDate = row.enrichment?.dueDate ?? row.baseDate;
      if (!dueDate) continue;
      const d = new Date(dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + row.amount);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12);
  }, [rows]);

  if (monthlyData.length === 0) return null;

  const maxVal = Math.max(...monthlyData.map(([, v]) => v));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Cash Flow Timeline — Expected Collections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 overflow-x-auto pb-2">
          {monthlyData.map(([month, amount]) => {
            const pct = maxVal > 0 ? (amount / maxVal) * 100 : 0;
            const [yr, mo] = month.split('-');
            const label = new Date(parseInt(yr), parseInt(mo) - 1).toLocaleDateString('en-SA', { month: 'short', year: '2-digit' });
            return (
              <div key={month} className="flex flex-col items-center gap-1 min-w-[60px]">
                <span className="text-xs text-muted-foreground font-medium">
                  {fmt(amount / 1000)}K
                </span>
                <div className="w-10 bg-primary/20 rounded-sm relative" style={{ height: '80px' }}>
                  <div
                    className="w-full bg-primary rounded-sm absolute bottom-0"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PaymentScheduleReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<PaymentRow | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterProjectStatus, setFilterProjectStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterAction !== 'all') params.set('action', filterAction);
      if (filterProjectStatus !== 'all') params.set('projectStatus', filterProjectStatus);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);

      const res = await fetch(`/api/financial/payment-schedule-report?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterAction, filterProjectStatus, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.rows.filter(row =>
      !q ||
      row.projectNumber.toLowerCase().includes(q) ||
      row.projectName.toLowerCase().includes(q) ||
      row.clientName.toLowerCase().includes(q) ||
      row.slotLabel.toLowerCase().includes(q)
    );
  }, [data, search]);

  const exportCsv = () => {
    if (!filteredRows.length) return;
    const headers = ['Project #', 'Project Name', 'Client', 'Slot', '%', 'Amount (SAR)', 'Milestone', 'Due Date', 'Invoice', 'Trigger', 'Action', 'Status'];
    const rows = filteredRows.map(r => {
      const e = r.enrichment;
      const st = effectiveStatus(r);
      return [
        r.projectNumber, r.projectName, r.clientName, r.slotLabel,
        r.percentage > 0 ? `${r.percentage}%` : '-',
        fmt(r.amount),
        r.milestone ?? '',
        fmtDate(e?.dueDate ?? r.baseDate),
        e?.invoiceRef ?? '',
        e?.triggerType ? TRIGGER_LABELS[e.triggerType as TriggerType] : '',
        e?.actionRequired ? ACTION_LABELS[e.actionRequired as ActionRequired] : '',
        STATUS_LABELS[st],
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-schedule-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary ?? { total: 0, collected: 0, pending: 0, overdue: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Payment Schedule</h1>
            <p className="text-muted-foreground mt-1">
              Consolidated payment terms across all projects — invoice tracking, triggers &amp; collection actions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Scheduled</p>
                <p className="text-xl font-bold">SAR {fmt(summary.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-xl font-bold text-green-600">SAR {fmt(summary.collected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-blue-600">SAR {fmt(summary.pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold text-red-600">SAR {fmt(summary.overdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Timeline */}
      {data && <CashFlowTimeline rows={data.rows} />}

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <Label>Search</Label>
              <Input
                placeholder="Project, client, slot..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="triggered">Triggered</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Action</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="issue_invoice">Issue Invoice</SelectItem>
                  <SelectItem value="collection_call">Collection Call</SelectItem>
                  <SelectItem value="stop_shipping">Stop Shipping</SelectItem>
                  <SelectItem value="proceed_shipping">Proceed Shipping</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project Status</Label>
              <Select value={filterProjectStatus} onValueChange={setFilterProjectStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due From</Label>
              <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-48">
              <Label>Due To</Label>
              <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => {
                setFilterStatus('all');
                setFilterAction('all');
                setFilterProjectStatus('all');
                setFilterDateFrom('');
                setFilterDateTo('');
                setSearch('');
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No payment terms found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Amount (SAR)</TableHead>
                    <TableHead>Milestone / Terms</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10 print:hidden" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map(row => {
                    const e = row.enrichment;
                    const st = effectiveStatus(row);
                    const dueDate = e?.dueDate ?? row.baseDate;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/30',
                          st === 'overdue' && 'bg-red-50/50',
                          st === 'collected' && 'bg-green-50/30 opacity-70',
                        )}
                        onClick={() => setEditRow(row)}
                      >
                        <TableCell>
                          <div className="font-medium">{row.projectNumber}</div>
                          <div className="text-xs text-muted-foreground max-w-[140px] truncate">{row.projectName}</div>
                        </TableCell>
                        <TableCell className="text-sm">{row.clientName}</TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{row.slotLabel}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {row.percentage > 0 ? `${row.percentage}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {fmt(row.amount)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {row.milestone ? (
                            <span className="text-xs text-muted-foreground line-clamp-2">{row.milestone}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {fmtDate(dueDate)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e?.invoiceRef ? (
                            <span className="font-mono text-xs">{e.invoiceRef}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e?.triggerType ? (
                            <div>
                              <div className="text-xs font-medium">{TRIGGER_LABELS[e.triggerType as TriggerType]}</div>
                              {e.triggerDescription && (
                                <div className="text-xs text-muted-foreground truncate max-w-[100px]">{e.triggerDescription}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {e?.actionRequired ? (
                            <div>
                              <Badge
                                className={cn(
                                  'text-xs',
                                  e.actionRequired === 'stop_shipping' && 'bg-orange-100 text-orange-700',
                                  e.actionRequired === 'issue_invoice' && 'bg-blue-100 text-blue-700',
                                  e.actionRequired === 'collection_call' && 'bg-yellow-100 text-yellow-700',
                                  e.actionRequired === 'proceed_shipping' && 'bg-green-100 text-green-700',
                                )}
                                variant="secondary"
                              >
                                {ACTION_LABELS[e.actionRequired as ActionRequired]}
                              </Badge>
                              {e.actionNotes && (
                                <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">{e.actionNotes}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', STATUS_VARIANT[st])} variant="secondary">
                            {STATUS_LABELS[st]}
                          </Badge>
                        </TableCell>
                        <TableCell className="print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={ev => { ev.stopPropagation(); setEditRow(row); }}
                          >
                            {e ? <PenLine className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground print:hidden pb-4">
        {filteredRows.length} payment term{filteredRows.length !== 1 ? 's' : ''} shown
        {data && data.rows.length !== filteredRows.length ? ` of ${data.rows.length} total` : ''}
      </div>

      <EditDrawer
        row={editRow}
        invoices={data?.invoices ?? []}
        onClose={() => setEditRow(null)}
        onSaved={() => { setEditRow(null); fetchData(); }}
      />
    </div>
  );
}
