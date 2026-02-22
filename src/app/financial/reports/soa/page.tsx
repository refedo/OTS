'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Download, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

export default function SOAReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [thirdpartyId, setThirdpartyId] = useState('');
  const [type, setType] = useState<'ar' | 'ap'>('ar');
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [thirdparties, setThirdparties] = useState<any[]>([]);
  const [tpLoading, setTpLoading] = useState(false);
  const [tpSearch, setTpSearch] = useState('');

  useEffect(() => {
    async function loadThirdparties() {
      setTpLoading(true);
      try {
        const table = type === 'ar' ? 'fin_customer_invoices' : 'fin_supplier_invoices';
        const res = await fetch(`/api/financial/reports/soa/thirdparties?type=${type}`);
        if (res.ok) setThirdparties(await res.json());
      } catch (e) { console.error(e); }
      finally { setTpLoading(false); }
    }
    loadThirdparties();
  }, [type]);

  const filteredTp = thirdparties.filter(tp =>
    !tpSearch || tp.name.toLowerCase().includes(tpSearch.toLowerCase()) || String(tp.id).includes(tpSearch)
  );

  const fetchReport = async () => {
    if (!thirdpartyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/soa?thirdparty_id=${thirdpartyId}&type=${type}&from=${fromDate}&to=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) {
      console.error('Failed to fetch SOA:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectedTpName = thirdparties.find(tp => String(tp.id) === thirdpartyId)?.name || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/financial">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Statement of Account</h1>
          <p className="text-sm text-muted-foreground">View invoices and payments for a specific client or supplier</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={(v) => { setType(v as 'ar' | 'ap'); setThirdpartyId(''); }}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">Accounts Receivable (AR)</SelectItem>
                  <SelectItem value="ap">Accounts Payable (AP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[280px]">
              <label className="text-sm font-medium">{type === 'ar' ? 'Customer' : 'Supplier'}</label>
              <Select value={thirdpartyId} onValueChange={setThirdpartyId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tpLoading ? 'Loading...' : `Select ${type === 'ar' ? 'customer' : 'supplier'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {filteredTp.map(tp => (
                    <SelectItem key={tp.id} value={String(tp.id)}>
                      {tp.name} ({tp.invoice_count} invoices)
                    </SelectItem>
                  ))}
                  {filteredTp.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">No {type === 'ar' ? 'customers' : 'suppliers'} found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" />
            </div>
            <Button onClick={fetchReport} disabled={loading || !thirdpartyId}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span className="text-lg">{report.thirdpartyName}</span>
                  <Badge variant="outline" className="ml-3">{type === 'ar' ? 'Customer' : 'Supplier'}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Balance</div>
                  <div className={`text-xl font-bold ${report.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatSAR(report.balance)}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Total Invoiced</div>
                  <div className="text-lg font-bold">{formatSAR(report.totalInvoiced)}</div>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                  <div className="text-lg font-bold text-green-600">{formatSAR(report.totalPaid)}</div>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                  <div className="text-lg font-bold text-red-600">{formatSAR(report.balance)}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Reference</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-right p-3">Debit</th>
                      <th className="text-right p-3">Credit</th>
                      <th className="text-right p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lines.map((line: any, i: number) => (
                      <tr key={i} className={`border-b ${line.type === 'Payment' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                        <td className="p-3">{line.date}</td>
                        <td className="p-3 font-mono text-xs">{line.ref}</td>
                        <td className="p-3">
                          <Badge variant={line.type === 'Payment' ? 'default' : line.type === 'Credit Note' ? 'secondary' : 'outline'}>
                            {line.type}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">{line.debit > 0 ? formatSAR(line.debit) : ''}</td>
                        <td className="p-3 text-right text-green-600">{line.credit > 0 ? formatSAR(line.credit) : ''}</td>
                        <td className="p-3 text-right font-semibold">{formatSAR(line.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
