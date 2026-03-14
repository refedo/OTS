'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

interface SalaryRow {
  id: number;
  ref: string;
  label: string;
  amount: number;
  dateStart: string;
  dateEnd: string;
  userId: number;
  isPaid: boolean;
}

export default function SalariesReportPage() {
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/salaries?from=${fromDate}&to=${toDate}`);
      if (res.ok) {
        const data = await res.json();
        setSalaries(data.salaries || []);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (e) {
      console.error('Failed to fetch salaries:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSalaries(); }, []);

  const paidCount = salaries.filter(s => s.isPaid).length;
  const unpaidCount = salaries.filter(s => !s.isPaid).length;
  const paidTotal = salaries.filter(s => s.isPaid).reduce((s, r) => s + r.amount, 0);
  const unpaidTotal = salaries.filter(s => !s.isPaid).reduce((s, r) => s + r.amount, 0);

  // Group by month
  const byMonth: Record<string, SalaryRow[]> = {};
  salaries.forEach(s => {
    const month = s.dateStart ? s.dateStart.slice(0, 7) : 'Unknown';
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/financial">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Salaries & Wages Report</h1>
          <p className="text-sm text-muted-foreground">All salary records synced from Dolibarr</p>
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
            <Button onClick={fetchSalaries} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-teal-200 dark:border-teal-900/50">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Total Salaries</div>
                <div className="text-2xl font-bold text-teal-600">{formatSAR(totalAmount)}</div>
                <div className="text-xs text-muted-foreground mt-1">{salaries.length} records</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-900/50">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Paid</div>
                <div className="text-2xl font-bold text-green-600">{formatSAR(paidTotal)}</div>
                <div className="text-xs text-muted-foreground mt-1">{paidCount} records</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Unpaid</div>
                <div className="text-2xl font-bold text-red-600">{formatSAR(unpaidTotal)}</div>
                <div className="text-xs text-muted-foreground mt-1">{unpaidCount} records</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Months</div>
                <div className="text-2xl font-bold text-blue-600">{Object.keys(byMonth).length}</div>
                <div className="text-xs text-muted-foreground mt-1">with salary data</div>
              </CardContent>
            </Card>
          </div>

          {Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).map(([month, rows]) => {
            const monthTotal = rows.reduce((s, r) => s + r.amount, 0);
            return (
              <Card key={month}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-teal-500" />
                      {month}
                      <Badge variant="outline" className="ml-1">{rows.length}</Badge>
                    </div>
                    <span className="text-teal-600 font-bold">{formatSAR(monthTotal)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Reference</th>
                        <th className="text-left p-2">Label</th>
                        <th className="text-left p-2">Period</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.sort((a, b) => b.amount - a.amount).map((row) => (
                        <tr key={row.id} className="border-b">
                          <td className="p-2 font-mono text-xs">{row.ref}</td>
                          <td className="p-2">{row.label || '—'}</td>
                          <td className="p-2 text-xs">{row.dateStart} → {row.dateEnd}</td>
                          <td className="p-2">
                            <Badge variant={row.isPaid ? 'default' : 'destructive'} className="text-xs">
                              {row.isPaid ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-semibold">{formatSAR(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}

          {salaries.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No salary records found for this period. Make sure salaries are synced from Dolibarr.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
