'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Package, ArrowRightLeft, AlertTriangle, Activity, RefreshCw,
  ArrowUpCircle, ArrowDownCircle, TrendingUp, Boxes, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface KPIs {
  totalActiveItems: number;
  pendingMirOuts: number;
  lowStockItems: number;
  todayMovements: number;
}

interface LedgerEntry {
  id: string;
  createdAt: string;
  direction: 'IN' | 'OUT';
  movementType: string;
  quantity: number;
  balanceAfter: number;
  referenceNo: string | null;
  item: { code: string; name: string; unit: string };
  warehouse: { code: string; name: string };
  performedBy: { name: string };
}

interface WarehouseSummary {
  code: string;
  name: string;
  siteId: string;
  totalItems: number;
  lowStockCount: number;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  STOCK_IN: 'Stock In',
  ISSUE: 'Issue',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
};

const KPI_CONFIG = [
  {
    key: 'totalActiveItems',
    label: 'Active Items',
    icon: Boxes,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    href: '/inv/stock',
  },
  {
    key: 'pendingMirOuts',
    label: 'Pending Approvals',
    icon: ArrowRightLeft,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    href: '/inv/mir-out?status=PENDING_APPROVAL',
  },
  {
    key: 'lowStockItems',
    label: 'Low Stock Alerts',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    href: '/inv/stock',
  },
  {
    key: 'todayMovements',
    label: "Today's Movements",
    icon: Activity,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    href: '/inv/ledger',
  },
] as const;

const QUICK_LINKS = [
  { label: 'Stock Levels', href: '/inv/stock', icon: Package, desc: 'View warehouse balances' },
  { label: 'New Material Issue', href: '/inv/mir-out/new', icon: ArrowRightLeft, desc: 'HEXA-FRM-029' },
  { label: 'New Return', href: '/inv/returns/new', icon: TrendingUp, desc: 'HEXA-FRM-030' },
  { label: 'Full Ledger', href: '/inv/ledger', icon: Activity, desc: 'All movements history' },
];

export default function InvDashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [warehouseSummary, setWarehouseSummary] = useState<WarehouseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, mirOutRes, balanceRes, ledgerRes] = await Promise.all([
        fetch('/api/inv/items?activeOnly=true'),
        fetch('/api/inv/mir-out?status=PENDING_APPROVAL&pageSize=1'),
        fetch('/api/inv/balance'),
        fetch('/api/inv/ledger?pageSize=15'),
      ]);

      const [items, mirOuts, balances, ledgerData] = await Promise.all([
        itemsRes.json(),
        mirOutRes.json(),
        balanceRes.json(),
        ledgerRes.json(),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayLedgerRes = await fetch(`/api/inv/ledger?dateFrom=${today}&pageSize=1`);
      const todayLedger = await todayLedgerRes.json();

      const lowStock = Array.isArray(balances) ? balances.filter((b: { isLowStock: boolean }) => b.isLowStock).length : 0;

      setKpis({
        totalActiveItems: Array.isArray(items) ? items.length : 0,
        pendingMirOuts: mirOuts?.total ?? 0,
        lowStockItems: lowStock,
        todayMovements: todayLedger?.total ?? 0,
      });

      setLedger(ledgerData?.entries ?? []);

      if (Array.isArray(balances)) {
        const whMap = new Map<string, WarehouseSummary>();
        balances.forEach((b: { warehouse: { code: string; name: string; siteId: string }; isLowStock: boolean }) => {
          const wh = b.warehouse;
          if (!whMap.has(wh.code)) {
            whMap.set(wh.code, { code: wh.code, name: wh.name, siteId: wh.siteId, totalItems: 0, lowStockCount: 0 });
          }
          const entry = whMap.get(wh.code)!;
          entry.totalItems++;
          if (b.isLowStock) entry.lowStockCount++;
        });
        setWarehouseSummary(Array.from(whMap.values()));
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const chartData = warehouseSummary.map(wh => ({
    name: wh.code,
    items: wh.totalItems,
    lowStock: wh.lowStockCount,
    fill: wh.lowStockCount > 0 ? (wh.lowStockCount > wh.totalItems * 0.3 ? '#ef4444' : '#f59e0b') : '#22c55e',
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="border-b bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-6 w-6 opacity-80" />
                <span className="text-blue-200 text-sm font-medium uppercase tracking-wider">Inventory Module</span>
              </div>
              <h1 className="text-3xl font-bold">Warehouse Dashboard</h1>
              <p className="text-blue-200 text-sm mt-1">Real-time stock levels and material movement overview</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => setRefreshKey(k => k + 1)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button asChild size="sm" className="bg-white text-blue-700 hover:bg-blue-50">
                <Link href="/inv/mir-out/new">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  New Issue Request
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CONFIG.map(cfg => {
            const Icon = cfg.icon;
            const value = kpis?.[cfg.key] ?? 0;
            return (
              <Link key={cfg.key} href={cfg.href}>
                <Card className={`border ${cfg.border} hover:shadow-md transition-all cursor-pointer`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${cfg.bg}`}>
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{cfg.label}</p>
                        <p className="text-2xl font-bold mt-0.5">{loading ? '—' : value.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_LINKS.map(link => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors">
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{link.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Recent Ledger — 3 cols */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Movements</CardTitle>
                <Link href="/inv/ledger" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading movements…</div>
              ) : ledger.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No movements yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs">By</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map(entry => (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium text-sm">{entry.item.code}</div>
                          <div className="text-xs text-muted-foreground">{entry.warehouse.code}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {entry.direction === 'IN'
                              ? <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              : <ArrowDownCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            }
                            <span className="text-xs">{MOVEMENT_TYPE_LABELS[entry.movementType] || entry.movementType}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${entry.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {entry.direction === 'IN' ? '+' : '−'}{entry.quantity} {entry.item.unit}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {entry.performedBy?.name?.split(' ')[0]}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Warehouse Chart — 2 cols */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Warehouse Stock</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
              ) : chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => [value, 'Items']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="items" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Normal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Some Low
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Critical
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
