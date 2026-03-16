'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Receipt, Printer, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function VatReportPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-03-31`);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [invoiceData, setInvoiceData] = useState<Record<string, any[]>>({});
  const [loadingInvoices, setLoadingInvoices] = useState<string | null>(null);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);

  const generate = async () => {
    setLoading(true);
    setExpandedRows(new Set());
    setInvoiceData({});
    try {
      const res = await fetch(`/api/financial/reports/vat?from=${fromDate}&to=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleRow = async (key: string, vatRate: number, type: 'output' | 'input') => {
    const next = new Set(expandedRows);
    if (next.has(key)) {
      next.delete(key);
      setExpandedRows(next);
      return;
    }
    next.add(key);
    setExpandedRows(next);

    if (!invoiceData[key]) {
      setLoadingInvoices(key);
      try {
        const res = await fetch(`/api/financial/reports/vat/invoices?from=${fromDate}&to=${toDate}&vat_rate=${vatRate}&type=${type}`);
        if (res.ok) {
          const data = await res.json();
          setInvoiceData(prev => ({ ...prev, [key]: data }));
        }
      } catch (e) { console.error(e); }
      finally { setLoadingInvoices(null); }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">VAT Report</h1>
            <p className="text-muted-foreground mt-1">Input vs Output VAT — ZATCA compliance</p>
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
            <CardHeader className="cursor-pointer select-none" onClick={() => setOutputCollapsed(!outputCollapsed)}>
              <CardTitle className="flex items-center justify-between text-orange-700">
                <span>OUTPUT VAT (Collected on Sales)</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-orange-700">SAR {fmt(report.totalOutputVat)}</Badge>
                  {outputCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
            {!outputCollapsed && (
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium w-8"></th>
                      <th className="text-left p-3 font-medium">VAT Rate</th>
                      <th className="text-right p-3 font-medium">Transactions</th>
                      <th className="text-right p-3 font-medium">Taxable Base (SAR)</th>
                      <th className="text-right p-3 font-medium">VAT Amount (SAR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.outputVat.map((row: any, i: number) => {
                      const key = `output-${row.vatRate}`;
                      const isExpanded = expandedRows.has(key);
                      const invoices = invoiceData[key] || [];
                      return (
                        <>
                          <tr key={i} className="border-b cursor-pointer hover:bg-muted/30" onClick={() => toggleRow(key, row.vatRate, 'output')}>
                            <td className="p-3">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            </td>
                            <td className="p-3 font-semibold">{row.vatRate}%</td>
                            <td className="p-3 text-right">{row.transactionCount}</td>
                            <td className="p-3 text-right font-mono">{fmt(row.taxableBase)}</td>
                            <td className="p-3 text-right font-mono font-semibold">{fmt(row.vatAmount)}</td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${key}-detail`}>
                              <td colSpan={5} className="p-0">
                                {loadingInvoices === key ? (
                                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                ) : invoices.length > 0 ? (
                                  <div className="bg-muted/20 p-3">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">Ref</th>
                                          <th className="text-left p-2">Client</th>
                                          <th className="text-left p-2">Date</th>
                                          <th className="text-left p-2">Product</th>
                                          <th className="text-right p-2">HT</th>
                                          <th className="text-right p-2">VAT</th>
                                          <th className="text-right p-2">TTC</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {invoices.map((inv: any, j: number) => (
                                          <tr key={j} className="border-b hover:bg-muted/30">
                                            <td className="p-2 font-mono">{inv.ref}</td>
                                            <td className="p-2">{inv.thirdparty_name}</td>
                                            <td className="p-2">{inv.date_invoice ? new Date(inv.date_invoice).toLocaleDateString() : ''}</td>
                                            <td className="p-2 truncate max-w-[150px]">{inv.product_label || '-'}</td>
                                            <td className="p-2 text-right font-mono">{fmt(Number(inv.line_ht))}</td>
                                            <td className="p-2 text-right font-mono text-orange-600">{fmt(Number(inv.line_tva))}</td>
                                            <td className="p-2 text-right font-mono">{fmt(Number(inv.line_ttc))}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-center py-3 text-xs text-muted-foreground">No invoice lines found</div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                    {report.outputVat.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No output VAT data</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-orange-50">
                      <td className="p-3"></td>
                      <td className="p-3" colSpan={3}>Total Output VAT</td>
                      <td className="p-3 text-right font-mono">{fmt(report.totalOutputVat)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            )}
          </Card>

          {/* Input VAT */}
          <Card>
            <CardHeader className="cursor-pointer select-none" onClick={() => setInputCollapsed(!inputCollapsed)}>
              <CardTitle className="flex items-center justify-between text-blue-700">
                <span>INPUT VAT (Paid on Purchases)</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-blue-700">SAR {fmt(report.totalInputVat)}</Badge>
                  {inputCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
            {!inputCollapsed && (
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium w-8"></th>
                      <th className="text-left p-3 font-medium">VAT Rate</th>
                      <th className="text-right p-3 font-medium">Transactions</th>
                      <th className="text-right p-3 font-medium">Taxable Base (SAR)</th>
                      <th className="text-right p-3 font-medium">VAT Amount (SAR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.inputVat.map((row: any, i: number) => {
                      const key = `input-${row.vatRate}`;
                      const isExpanded = expandedRows.has(key);
                      const invoices = invoiceData[key] || [];
                      return (
                        <>
                          <tr key={i} className="border-b cursor-pointer hover:bg-muted/30" onClick={() => toggleRow(key, row.vatRate, 'input')}>
                            <td className="p-3">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            </td>
                            <td className="p-3 font-semibold">{row.vatRate}%</td>
                            <td className="p-3 text-right">{row.transactionCount}</td>
                            <td className="p-3 text-right font-mono">{fmt(row.taxableBase)}</td>
                            <td className="p-3 text-right font-mono font-semibold">{fmt(row.vatAmount)}</td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${key}-detail`}>
                              <td colSpan={5} className="p-0">
                                {loadingInvoices === key ? (
                                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                ) : invoices.length > 0 ? (
                                  <div className="bg-muted/20 p-3">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">Ref</th>
                                          <th className="text-left p-2">Supplier</th>
                                          <th className="text-left p-2">Date</th>
                                          <th className="text-left p-2">Product</th>
                                          <th className="text-right p-2">HT</th>
                                          <th className="text-right p-2">VAT</th>
                                          <th className="text-right p-2">TTC</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {invoices.map((inv: any, j: number) => (
                                          <tr key={j} className="border-b hover:bg-muted/30">
                                            <td className="p-2 font-mono">{inv.ref}</td>
                                            <td className="p-2">{inv.thirdparty_name}</td>
                                            <td className="p-2">{inv.date_invoice ? new Date(inv.date_invoice).toLocaleDateString() : ''}</td>
                                            <td className="p-2 truncate max-w-[150px]">{inv.product_label || '-'}</td>
                                            <td className="p-2 text-right font-mono">{fmt(Number(inv.line_ht))}</td>
                                            <td className="p-2 text-right font-mono text-blue-600">{fmt(Number(inv.line_tva))}</td>
                                            <td className="p-2 text-right font-mono">{fmt(Number(inv.line_ttc))}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-center py-3 text-xs text-muted-foreground">No invoice lines found</div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                    {report.inputVat.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No input VAT data</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-blue-50">
                      <td className="p-3"></td>
                      <td className="p-3" colSpan={3}>Total Input VAT</td>
                      <td className="p-3 text-right font-mono">{fmt(report.totalInputVat)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            )}
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
