'use client';

import { useState } from 'react';
import {
  Treemap,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  ArrowLeft,
  Layers,
  BarChart3,
  ChevronLeft,
  DollarSign,
  Building2,
  Users,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';

interface SupplierEntry {
  supplier_id: number;
  supplier_name: string;
  total_spend: number;
  invoice_count: number;
  pct: number;
}

interface AccountEntry {
  account_code: string;
  account_name: string;
  account_category: string;
  total_spend: number;
  supplier_count: number;
  invoice_count: number;
  suppliers: SupplierEntry[];
}

interface CogsMapReport {
  summary: {
    totalSpend: number;
    accountCount: number;
    supplierCount: number;
    topAccountName: string;
  };
  accounts: AccountEntry[];
}

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `SAR ${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `SAR ${(amount / 1_000).toFixed(1)}K`;
  return formatSAR(amount);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

const TREEMAP_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
];

interface TreemapNode {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  size: number;
  color: string;
  accountRef: AccountEntry;
  [key: string]: unknown;
}

const CustomTreemapContent = (props: Partial<TreemapNode>) => {
  const { x = 0, y = 0, width = 0, height = 0, name = '', size = 0, color = '#0ea5e9' } = props;
  const tooSmall = width < 60 || height < 40;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill: color, stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }}
        rx={4}
      />
      {!tooSmall && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={Math.min(13, width / 8)}
            fontWeight="600"
          >
            {name.length > 18 ? name.slice(0, 16) + '…' : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.85)"
            fontSize={Math.min(11, width / 10)}
          >
            {formatCompact(size)}
          </text>
        </>
      )}
    </g>
  );
};

export default function CogsSupplierMapPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [report, setReport] = useState<CogsMapReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountEntry | null>(null);

  const generate = async () => {
    setLoading(true);
    setSelectedAccount(null);
    try {
      const res = await fetch(
        `/api/financial/reports/cogs-supplier-map?from=${fromDate}&to=${toDate}`
      );
      if (res.ok) setReport(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const treemapData = report?.accounts.map((acct, i) => ({
    name: acct.account_name,
    size: acct.total_spend,
    account_code: acct.account_code,
    color: TREEMAP_COLORS[i % TREEMAP_COLORS.length],
    accountRef: acct,
  })) ?? [];

  const selectedColor = selectedAccount
    ? TREEMAP_COLORS[
        (report?.accounts.findIndex((a) => a.account_code === selectedAccount.account_code) ?? 0) %
          TREEMAP_COLORS.length
      ]
    : '#0ea5e9';

  const barData =
    selectedAccount?.suppliers.slice(0, 15).map((s) => ({
      name: s.supplier_name.length > 24 ? s.supplier_name.slice(0, 22) + '…' : s.supplier_name,
      spend: s.total_spend,
    })) ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTreemapClick = (node: any) => {
    if (node?.accountRef) {
      setSelectedAccount(node.accountRef as AccountEntry);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero Banner */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4 flex-wrap">
            <Link href="/financial">
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </Link>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">COGS Supplier Map</h1>
              <p className="text-sky-100 text-sm">
                Expenses by GL account with supplier breakdown — click any tile to drill down
              </p>
            </div>
          </div>
        </div>

        {/* Date Filters */}
        <Card className="rounded-2xl border bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <Label className="text-sm font-medium mb-1 block">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={generate} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Tiles */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-sky-500" />
                <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total Spend</p>
              </div>
              <p className="text-2xl font-bold text-sky-700">{formatCompact(report.summary.totalSpend)}</p>
              <p className="text-xs text-sky-500 mt-0.5">excl. VAT</p>
            </div>

            <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">GL Accounts</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{report.summary.accountCount}</p>
              <p className="text-xs text-emerald-500 mt-0.5">with spend</p>
            </div>

            <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3.5 w-3.5 text-violet-500" />
                <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Suppliers</p>
              </div>
              <p className="text-2xl font-bold text-violet-700">{report.summary.supplierCount}</p>
              <p className="text-xs text-violet-500 mt-0.5">unique</p>
            </div>

            <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Top Account</p>
              </div>
              <p
                className="text-base font-bold text-amber-700 truncate leading-tight mt-1"
                title={report.summary.topAccountName}
              >
                {report.summary.topAccountName}
              </p>
              <p className="text-xs text-amber-500 mt-0.5">largest by spend</p>
            </div>
          </div>
        )}

        {/* Treemap view */}
        {report && !selectedAccount && (
          <Card className="rounded-2xl border bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Spend by GL Account
              </CardTitle>
              <p className="text-xs text-muted-foreground">Click any tile to drill down into suppliers</p>
            </CardHeader>
            <CardContent className="pt-6">
              {treemapData.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No COGS data found for the selected period.</p>
                  <p className="text-xs mt-1">Ensure supplier invoices are synced and COA mappings are configured.</p>
                </div>
              ) : (
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      content={<CustomTreemapContent />}
                      onClick={handleTreemapClick}
                    />
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Drill-down view */}
        {report && selectedAccount && (
          <>
            {/* Account header */}
            <Card className="rounded-2xl border bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAccount(null)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> All Accounts
                  </Button>
                  <div
                    className="w-3 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold truncate">{selectedAccount.account_name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedAccount.account_code} · {selectedAccount.account_category}
                    </p>
                  </div>
                  <div className="text-right ml-auto">
                    <div className="text-xl font-bold">{formatCompact(selectedAccount.total_spend)}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedAccount.supplier_count} suppliers · {selectedAccount.invoice_count} invoices
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Horizontal BarChart */}
            {barData.length > 0 && (
              <Card className="rounded-2xl border bg-white shadow-sm">
                <CardHeader className="px-6 py-4 border-b">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    Top Suppliers by Spend
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        layout="vertical"
                        margin={{ top: 0, right: 24, left: 160, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v: number) => formatCompact(v)}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          width={150}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatSAR(value), 'Spend']}
                        />
                        <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
                          {barData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={selectedColor} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Supplier detail table */}
            <Card className="rounded-2xl border bg-white shadow-sm">
              <CardHeader className="px-6 py-4 border-b">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  All Suppliers — {selectedAccount.account_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-secondary/50">
                        <th className="text-left p-3 font-medium text-slate-700">#</th>
                        <th className="text-left p-3 font-medium text-slate-700">Supplier</th>
                        <th className="text-right p-3 font-medium text-slate-700">Spend (excl. VAT)</th>
                        <th className="text-right p-3 font-medium text-slate-700">Invoices</th>
                        <th className="text-right p-3 font-medium text-slate-700">% of Account</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccount.suppliers.map((s, idx) => (
                        <tr key={s.supplier_id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="p-3 font-medium">{s.supplier_name}</td>
                          <td className="p-3 text-right font-mono text-sm">
                            {formatSAR(s.total_spend)}
                          </td>
                          <td className="p-3 text-right">{s.invoice_count}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(s.pct, 100)}%`,
                                    backgroundColor: selectedColor,
                                  }}
                                />
                              </div>
                              <span className="text-xs w-12 text-right tabular-nums">
                                {formatPct(s.pct)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold bg-secondary/50">
                        <td colSpan={2} className="p-3">Total</td>
                        <td className="p-3 text-right font-mono">{formatSAR(selectedAccount.total_spend)}</td>
                        <td className="p-3 text-right">{selectedAccount.invoice_count}</td>
                        <td className="p-3 text-right text-xs">100.0%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Initial empty state */}
        {!report && !loading && (
          <Card className="rounded-2xl border bg-white shadow-sm">
            <CardContent className="py-20 text-center text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Select a date range and click Generate</p>
              <p className="text-xs mt-1">
                Displays expenses by COGS GL account with supplier breakdown
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
