'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Printer, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/balance-sheet?as_of=${asOfDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const renderSection = (sections: any[], color: string) => (
    <div className="space-y-2">
      {sections.map((sec: any, i: number) => (
        <div key={i}>
          <div className="font-semibold text-muted-foreground text-xs uppercase tracking-wide mb-1">{sec.category}</div>
          {sec.accounts.map((a: any, j: number) => (
            <div key={j} className="flex justify-between pl-4 py-0.5 hover:bg-muted/30 text-sm">
              <span>{a.accountCode} — {a.accountName}</span>
              <span className="font-mono">{fmt(a.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between pl-4 font-semibold text-sm border-t mt-1 pt-1">
            <span>Total {sec.category}</span>
            <span className="font-mono">{fmt(sec.subtotal)}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Balance Sheet</h1>
            <p className="text-muted-foreground mt-1">Assets, liabilities, and equity as of a specific date</p>
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
              <Label>As of Date</Label>
              <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Building2 className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Balance Sheet as of {report.asOfDate}</h2>
            {report.isBalanced ? (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Balanced
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Unbalanced (diff: {fmt(Math.abs(report.totalAssets - report.totalLiabilitiesAndEquity))})
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-700">ASSETS</CardTitle>
              </CardHeader>
              <CardContent>
                {renderSection(report.assets, 'blue')}
                <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-4 text-blue-700">
                  <span>TOTAL ASSETS</span>
                  <span className="font-mono">{fmt(report.totalAssets)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Liabilities & Equity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-red-700">LIABILITIES & EQUITY</CardTitle>
              </CardHeader>
              <CardContent>
                {report.liabilities.length > 0 && (
                  <div className="mb-4">
                    <div className="font-bold text-red-600 mb-2">Liabilities</div>
                    {renderSection(report.liabilities, 'red')}
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Total Liabilities</span>
                      <span className="font-mono">{fmt(report.totalLiabilities)}</span>
                    </div>
                  </div>
                )}

                {report.equity.length > 0 && (
                  <div className="mb-4">
                    <div className="font-bold text-purple-600 mb-2">Equity</div>
                    {renderSection(report.equity, 'purple')}
                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Total Equity</span>
                      <span className="font-mono">{fmt(report.totalEquity)}</span>
                    </div>
                  </div>
                )}

                {/* Net Profit */}
                <div className="flex justify-between py-2 border-t text-sm">
                  <span className="font-semibold">Current Year Net Profit/(Loss)</span>
                  <span className={`font-mono font-semibold ${report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(report.netProfit)}
                  </span>
                </div>

                <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-4 text-red-700">
                  <span>TOTAL L&E</span>
                  <span className="font-mono">{fmt(report.totalLiabilitiesAndEquity)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
