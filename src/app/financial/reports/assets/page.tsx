'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Package, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

interface AssetRow {
  accountCode: string;
  accountName: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function AssetReportPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/assets?from=${fromDate}&to=${toDate}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (e) {
      console.error('Failed to fetch assets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);

  const grouped = assets.reduce((acc, a) => {
    const cat = a.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {} as Record<string, AssetRow[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/financial">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Asset Report</h1>
          <p className="text-sm text-muted-foreground">All asset accounts from journal entries</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" />
            </div>
            <Button onClick={fetchAssets} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-indigo-200 dark:border-indigo-900/50">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Total Assets</div>
                <div className="text-2xl font-bold text-indigo-600">{formatSAR(totalAssets)}</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Asset Categories</div>
                <div className="text-2xl font-bold text-blue-600">{Object.keys(grouped).length}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-900/50">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Asset Accounts</div>
                <div className="text-2xl font-bold text-green-600">{assets.length}</div>
              </CardContent>
            </Card>
          </div>

          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, rows]) => {
            const catTotal = rows.reduce((s, r) => s + r.balance, 0);
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-indigo-500" />
                      {category}
                      <Badge variant="outline" className="ml-1">{rows.length}</Badge>
                    </div>
                    <span className="text-indigo-600 font-bold">{formatSAR(catTotal)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Account Code</th>
                        <th className="text-left p-2">Account Name</th>
                        <th className="text-right p-2">Debit</th>
                        <th className="text-right p-2">Credit</th>
                        <th className="text-right p-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.sort((a, b) => b.balance - a.balance).map((row) => (
                        <tr key={row.accountCode} className="border-b">
                          <td className="p-2 font-mono text-xs">{row.accountCode}</td>
                          <td className="p-2">{row.accountName}</td>
                          <td className="p-2 text-right">{formatSAR(row.debit)}</td>
                          <td className="p-2 text-right">{formatSAR(row.credit)}</td>
                          <td className="p-2 text-right font-semibold">{formatSAR(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}

          {assets.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No asset accounts found for this period.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
