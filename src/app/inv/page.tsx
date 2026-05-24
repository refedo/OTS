'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, ArrowRightLeft, AlertTriangle, Activity, RefreshCw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
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
  totalValue: number;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  STOCK_IN: 'Stock In',
  ISSUE: 'Issue',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
};

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
        fetch('/api/inv/ledger?pageSize=20'),
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

      // Build warehouse summary from balances
      if (Array.isArray(balances)) {
        const warehouseMap = new Map<string, WarehouseSummary>();
        balances.forEach((b: { warehouse: { code: string; name: string; siteId: string }; isLowStock: boolean }) => {
          const wh = b.warehouse;
          if (!warehouseMap.has(wh.code)) {
            warehouseMap.set(wh.code, { code: wh.code, name: wh.name, siteId: wh.siteId, totalItems: 0, lowStockCount: 0, totalValue: 0 });
          }
          const entry = warehouseMap.get(wh.code)!;
          entry.totalItems++;
          if (b.isLowStock) entry.lowStockCount++;
        });
        setWarehouseSummary(Array.from(warehouseMap.values()));
      }
    } catch (err) {
      console.error('Failed to fetch INV dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Auto-refresh every 60 seconds
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Warehouse stock levels and material movements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/inv/mir-out/new">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              New Issue Request
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Items</p>
                <p className="text-2xl font-bold">{loading ? '—' : kpis?.totalActiveItems ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold">{loading ? '—' : kpis?.pendingMirOuts ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold">{loading ? '—' : kpis?.lowStockItems ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Movements</p>
                <p className="text-2xl font-bold">{loading ? '—' : kpis?.todayMovements ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Ledger */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Movements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
            ) : ledger.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No movements yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.slice(0, 10).map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{entry.item.code}</div>
                        <div className="text-xs text-muted-foreground">{entry.warehouse.code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {entry.direction === 'IN'
                            ? <ArrowUpCircle className="h-4 w-4 text-green-500" />
                            : <ArrowDownCircle className="h-4 w-4 text-red-500" />
                          }
                          <span className="text-xs">{MOVEMENT_TYPE_LABELS[entry.movementType] || entry.movementType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {entry.direction === 'IN' ? '+' : '-'}{entry.quantity} {entry.item.unit}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="p-3 border-t">
              <Link href="/inv/ledger" className="text-xs text-primary hover:underline">View full ledger →</Link>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Stock Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warehouse Stock Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No warehouse data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    formatter={(value, name) => [value, name === 'items' ? 'Total Items' : 'Low Stock']}
                  />
                  <Bar dataKey="items" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Normal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500 inline-block" /> Some Low</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Critical</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
