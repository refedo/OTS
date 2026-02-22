'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Receipt, Printer } from 'lucide-react';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function VatReportPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-03-31`);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/vat?from=${fromDate}&to=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">VAT Report</h1>
          <p className="text-muted-foreground mt-1">Input vs Output VAT — ZATCA compliance</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-6">
          {/* Output VAT */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-700">OUTPUT VAT (Collected on Sales)</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">VAT Rate</th>
                    <th className="text-right p-3 font-medium">Transactions</th>
                    <th className="text-right p-3 font-medium">Taxable Base (SAR)</th>
                    <th className="text-right p-3 font-medium">VAT Amount (SAR)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.outputVat.map((row: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-semibold">{row.vatRate}%</td>
                      <td className="p-3 text-right">{row.transactionCount}</td>
                      <td className="p-3 text-right font-mono">{fmt(row.taxableBase)}</td>
                      <td className="p-3 text-right font-mono font-semibold">{fmt(row.vatAmount)}</td>
                    </tr>
                  ))}
                  {report.outputVat.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No output VAT data</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold bg-orange-50">
                    <td className="p-3" colSpan={3}>Total Output VAT</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totalOutputVat)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Input VAT */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">INPUT VAT (Paid on Purchases)</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">VAT Rate</th>
                    <th className="text-right p-3 font-medium">Transactions</th>
                    <th className="text-right p-3 font-medium">Taxable Base (SAR)</th>
                    <th className="text-right p-3 font-medium">VAT Amount (SAR)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.inputVat.map((row: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-semibold">{row.vatRate}%</td>
                      <td className="p-3 text-right">{row.transactionCount}</td>
                      <td className="p-3 text-right font-mono">{fmt(row.taxableBase)}</td>
                      <td className="p-3 text-right font-mono font-semibold">{fmt(row.vatAmount)}</td>
                    </tr>
                  ))}
                  {report.inputVat.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No input VAT data</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold bg-blue-50">
                    <td className="p-3" colSpan={3}>Total Input VAT</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totalInputVat)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Net VAT */}
          <Card className={report.netVatPayable >= 0 ? 'border-orange-300' : 'border-green-300'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">
                    {report.netVatPayable >= 0 ? 'NET VAT PAYABLE' : 'NET VAT REFUNDABLE'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Period: {report.fromDate} to {report.toDate}
                  </div>
                </div>
                <div className={`text-3xl font-bold font-mono ${report.netVatPayable >= 0 ? 'text-orange-700' : 'text-green-700'}`}>
                  SAR {fmt(Math.abs(report.netVatPayable))}
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Output VAT ({fmt(report.totalOutputVat)}) - Input VAT ({fmt(report.totalInputVat)}) = {fmt(report.netVatPayable)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
