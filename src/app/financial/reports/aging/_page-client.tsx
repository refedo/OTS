'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Clock, Printer, ChevronDown, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function AgingReportPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'payable' ? 'ap' : 'ar';
  const [type, setType] = useState<'ar' | 'ap'>(initialType);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const generate = async () => {
    setLoading(true);
    setExpanded(new Set());
    try {
      const res = await fetch(`/api/financial/reports/aging?type=${type}&as_of=${asOfDate}`);
      if (res.ok) setReport(await res.json());
    } finally { setLoading(false); }
  };

  const toggleExpand = (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const filteredRows = (report?.rows ?? []).filter((row: any) =>
    !search ||
    row.thirdpartyName?.toLowerCase().includes(search.toLowerCase()) ||
    row.invoices?.some((inv: any) => inv.ref?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Aging Report</h1>
            <p className="text-sm text-muted-foreground">Accounts Receivable / Payable aging by due date</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setType('ar'); setReport(null); }}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    type === 'ar'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-input bg-background hover:bg-green-50 text-green-700 dark:hover:bg-green-950/30',
                  )}
                >AR</button>
                <button
                  type="button"
                  onClick={() => { setType('ap'); setReport(null); }}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    type === 'ap'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-input bg-background hover:bg-red-50 text-red-700 dark:hover:bg-red-950/30',
                  )}
                >AP</button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">As of Date</label>
              <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="w-[160px]" />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
              Generate
            </Button>
            <div className="relative flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name or invoice…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Bucket Summary Cards ──────────────────────────────────────────────── */}
      {report && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 print:hidden">
          {[
            { label: 'Current',   value: report.totals.current,    color: 'text-green-600' },
            { label: '1-30 Days', value: report.totals.days1to30,  color: 'text-yellow-600' },
            { label: '31-60 Days',value: report.totals.days31to60, color: 'text-orange-600' },
            { label: '61-90 Days',value: report.totals.days61to90, color: 'text-red-500' },
            { label: '90+ Days',  value: report.totals.days90plus, color: 'text-red-700' },
            { label: 'Total',     value: report.totals.total,      color: type === 'ar' ? 'text-green-700' : 'text-red-700' },
          ].map(b => (
            <div key={b.label} className="p-3 border rounded-lg text-center">
              <div className="text-xs text-muted-foreground">{b.label}</div>
              <div className={cn('text-sm font-bold tabular-nums', b.color)}>{fmt(b.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Report Table ──────────────────────────────────────────────────────── */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{report.type === 'ar' ? 'Accounts Receivable' : 'Accounts Payable'} Aging</span>
              <Badge
                variant="outline"
                className={cn(
                  type === 'ar'
                    ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
                )}
              >
                as of {report.asOfDate}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Third Party</th>
                    <th className="text-right p-3 font-medium text-green-700">Current</th>
                    <th className="text-right p-3 font-medium text-yellow-700">1-30 Days</th>
                    <th className="text-right p-3 font-medium text-orange-600 hidden sm:table-cell">31-60 Days</th>
                    <th className="text-right p-3 font-medium text-red-500 hidden sm:table-cell">61-90 Days</th>
                    <th className="text-right p-3 font-medium text-red-700">90+ Days</th>
                    <th className="text-right p-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row: any, idx: number) => (
                    <React.Fragment key={`tp-${row.thirdpartyId}-${idx}`}>
                      <tr
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleExpand(row.thirdpartyId)}
                      >
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-1">
                            {expanded.has(row.thirdpartyId)
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <span className="truncate">{row.thirdpartyName}</span>
                            <Badge variant="secondary" className="ml-1 text-xs shrink-0">{row.invoices.length}</Badge>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-green-700 dark:text-green-400">
                          {row.buckets.current > 0 ? fmt(row.buckets.current) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-yellow-700 dark:text-yellow-400">
                          {row.buckets.days1to30 > 0 ? fmt(row.buckets.days1to30) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-orange-600 hidden sm:table-cell">
                          {row.buckets.days31to60 > 0 ? fmt(row.buckets.days31to60) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-red-500 hidden sm:table-cell">
                          {row.buckets.days61to90 > 0 ? fmt(row.buckets.days61to90) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-red-700 font-semibold">
                          {row.buckets.days90plus > 0 ? fmt(row.buckets.days90plus) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">{fmt(row.buckets.total)}</td>
                      </tr>
                      {expanded.has(row.thirdpartyId) && row.invoices.map((inv: any, j: number) => (
                        <tr key={`inv-${row.thirdpartyId}-${j}`} className="border-b bg-muted/20 text-xs">
                          <td className="p-2 pl-10" colSpan={2}>
                            <span className="font-mono font-semibold">{inv.ref}</span>
                            <span className="text-muted-foreground ml-2">
                              Inv: {inv.dateInvoice} | Due: {inv.dateDue}
                            </span>
                            <span className={cn(
                              'ml-2 font-medium',
                              inv.daysOverdue > 0 ? 'text-red-600' : 'text-green-600',
                            )}>
                              {inv.daysOverdue > 0 ? `${inv.daysOverdue}d overdue` : 'current'}
                            </span>
                            {inv.paymentTermsLabel && (
                              <Badge variant="secondary" className="ml-2 text-xs">{inv.paymentTermsLabel}</Badge>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono">{fmt(inv.totalAmount)}</td>
                          <td className="p-2 text-right font-mono text-green-600 hidden sm:table-cell">{fmt(inv.amountPaid)}</td>
                          <td className="p-2 text-right font-mono font-semibold text-orange-700 hidden sm:table-cell">{fmt(inv.remaining)}</td>
                          <td className="p-2 text-center" colSpan={2}>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                inv.ageBucket === 'Current' && 'border-green-300 text-green-700',
                                inv.ageBucket === '1-30 Days' && 'border-yellow-300 text-yellow-700',
                                inv.ageBucket === '31-60 Days' && 'border-orange-300 text-orange-700',
                                inv.ageBucket === '61-90 Days' && 'border-red-400 text-red-600',
                                inv.ageBucket === '90+ Days' && 'border-red-600 text-red-700 bg-red-50',
                              )}
                            >
                              {inv.ageBucket}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No outstanding invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td className="p-3">TOTALS</td>
                    <td className="p-3 text-right font-mono text-green-700">{fmt(report.totals.current)}</td>
                    <td className="p-3 text-right font-mono text-yellow-700">{fmt(report.totals.days1to30)}</td>
                    <td className="p-3 text-right font-mono text-orange-600 hidden sm:table-cell">{fmt(report.totals.days31to60)}</td>
                    <td className="p-3 text-right font-mono text-red-500 hidden sm:table-cell">{fmt(report.totals.days61to90)}</td>
                    <td className="p-3 text-right font-mono text-red-700">{fmt(report.totals.days90plus)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
