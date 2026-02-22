'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Clock, Printer, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function AgingReportPage() {
  const [type, setType] = useState<'ar' | 'ap'>('ar');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const generate = async () => {
    setLoading(true);
    setExpanded(new Set());
    try {
      const res = await fetch(`/api/financial/reports/aging?type=${type}&as_of=${asOfDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleExpand = (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Aging Report</h1>
            <p className="text-muted-foreground mt-1">Accounts Receivable / Payable aging by due date</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={type} onValueChange={v => setType(v as 'ar' | 'ap')}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">Accounts Receivable (AR)</SelectItem>
                  <SelectItem value="ap">Accounts Payable (AP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>As of Date</Label>
              <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>
              {report.type === 'ar' ? 'Accounts Receivable' : 'Accounts Payable'} Aging — as of {report.asOfDate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Third Party</th>
                    <th className="text-right p-3 font-medium">Current</th>
                    <th className="text-right p-3 font-medium">1-30 Days</th>
                    <th className="text-right p-3 font-medium">31-60 Days</th>
                    <th className="text-right p-3 font-medium">61-90 Days</th>
                    <th className="text-right p-3 font-medium">90+ Days</th>
                    <th className="text-right p-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row: any, idx: number) => (
                    <React.Fragment key={`tp-${row.thirdpartyId}-${idx}`}>
                      <tr className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleExpand(row.thirdpartyId)}>
                        <td className="p-3 font-medium flex items-center gap-1">
                          {expanded.has(row.thirdpartyId)
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          {row.thirdpartyName}
                          <Badge variant="secondary" className="ml-2 text-xs">{row.invoices.length}</Badge>
                        </td>
                        <td className="p-3 text-right font-mono">{row.buckets.current > 0 ? fmt(row.buckets.current) : ''}</td>
                        <td className="p-3 text-right font-mono">{row.buckets.days1to30 > 0 ? fmt(row.buckets.days1to30) : ''}</td>
                        <td className="p-3 text-right font-mono">{row.buckets.days31to60 > 0 ? fmt(row.buckets.days31to60) : ''}</td>
                        <td className="p-3 text-right font-mono">{row.buckets.days61to90 > 0 ? fmt(row.buckets.days61to90) : ''}</td>
                        <td className="p-3 text-right font-mono text-red-600">{row.buckets.days90plus > 0 ? fmt(row.buckets.days90plus) : ''}</td>
                        <td className="p-3 text-right font-mono font-semibold">{fmt(row.buckets.total)}</td>
                      </tr>
                      {expanded.has(row.thirdpartyId) && row.invoices.map((inv: any, j: number) => (
                        <tr key={`inv-${row.thirdpartyId}-${j}-${inv.ref}`} className="border-b bg-muted/20">
                          <td className="p-2 pl-10 text-xs" colSpan={2}>
                            <span className="font-mono font-semibold">{inv.ref}</span>
                            <span className="text-muted-foreground ml-2">
                              Inv: {inv.dateInvoice} | Due: {inv.dateDue} | {inv.daysOverdue}d overdue
                            </span>
                            {inv.paymentTermsLabel && (
                              <Badge variant="secondary" className="ml-2 text-xs">{inv.paymentTermsLabel}</Badge>
                            )}
                          </td>
                          <td className="p-2 text-right text-xs font-mono">{fmt(inv.totalAmount)}</td>
                          <td className="p-2 text-right text-xs font-mono text-green-600">{fmt(inv.amountPaid)}</td>
                          <td className="p-2 text-right text-xs font-mono font-semibold" colSpan={2}>{fmt(inv.remaining)}</td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className="text-xs">{inv.ageBucket}</Badge>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {report.rows.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No outstanding invoices found</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td className="p-3">TOTALS</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.current)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.days1to30)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.days31to60)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.days61to90)}</td>
                    <td className="p-3 text-right font-mono text-red-600">{fmt(report.totals.days90plus)}</td>
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
