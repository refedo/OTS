'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface PaymentRow {
  amount: number;
  baseDate: string | null;
  enrichment: {
    dueDate: string | null;
    status: string;
    receivedAmount: number | string | null;
  } | null;
}

interface ReportData {
  summary: { total: number; collected: number; pending: number; overdue: number };
  rows: PaymentRow[];
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function PaymentScheduleWidget() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/financial/payment-schedule-report');
        if (!res.ok) throw new Error('Failed to fetch');
        setData(await res.json());
        setError(null);
      } catch {
        setError('Failed to load payment data');
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  const thisMonthForecast = useMemo(() => {
    if (!data) return 0;
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return data.rows.reduce((sum, row) => {
      const status = row.enrichment?.status ?? 'pending';
      if (status === 'collected') return sum;
      const dueDate = row.enrichment?.dueDate ?? row.baseDate;
      if (!dueDate) return sum;
      const d = new Date(dueDate);
      const rowKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return rowKey === key ? sum + row.amount : sum;
    }, 0);
  }, [data]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="size-4 text-emerald-600" />
            Payment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="size-4 text-emerald-600" />
            Payment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error ?? 'No data'}</p>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;

  return (
    <Link href="/financial/reports/payment-schedule">
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="size-4 text-emerald-600" />
            Payment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* This month forecast */}
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">This Month's Forecast</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              SAR {fmt(thisMonthForecast)}
            </p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">SAR {fmt(summary.collected)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/20">
              <Clock className="size-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">SAR {fmt(summary.pending)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20 col-span-2">
              <AlertTriangle className="size-4 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">SAR {fmt(summary.overdue)}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-right">Total: SAR {fmt(summary.total)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
