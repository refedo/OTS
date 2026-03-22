'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  ChevronLeft,
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  Weight,
  Layers,
  PieChart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';

interface StatusRow {
  projectNumber: string | null;
  projectName: string | null;
  status: string | null;
  itemCount: number;
  totalAmount: number;
  totalWeight: number;
}

interface SpendRow {
  projectNumber: string | null;
  projectName: string | null;
  totalSpend: number;
  totalTarget: number;
  variancePct: number | null;
}

interface SupplierRow {
  supplierName: string | null;
  poCount: number;
  totalAwarded: number;
  totalWeight: number;
  avgPricePerTon: number | null;
}

interface MonthlyTonnageRow {
  month: string;
  totalWeight: number;
  totalAmount: number;
  itemCount: number;
}

interface ThicknessRow {
  thickness: string;
  totalWeight: number;
  totalAmount: number;
  itemCount: number;
}

interface WeightBreakdownRow {
  projectNumber: string;
  projectName: string;
  buildingName: string;
  totalWeight: number;
  bought: number;
  underRequest: number;
  availableAtFactory: number;
  other: number;
  boughtPct: number;
  underRequestPct: number;
  availableAtFactoryPct: number;
  otherPct: number;
}

interface StatusBreakdownRow {
  status: string;
  totalWeight: number;
  percentage: number;
}

interface OverdueRow {
  id: string;
  sn: string | null;
  projectNumber: string | null;
  projectName: string | null;
  buildingName: string | null;
  itemLabel: string | null;
  status: string | null;
  neededToDate: string | null;
  awardedToRaw: string | null;
  poNumber: string | null;
  daysOverdue: number;
}

const formatSAR = (val: number | null) => {
  if (val === null || val === undefined) return '—';
  if (val < 1000000) {
    return `${(val / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
  }
  return `${(val / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
};

const formatTon = (val: number | null) => {
  if (val === null || val === undefined || val === 0) return '—';
  // Convert kg to tons by dividing by 1000
  const tons = val / 1000;
  return `${tons.toLocaleString('en-US', { maximumFractionDigits: 1 })} T`;
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-60 mt-1" /></CardHeader>
      <CardContent><Skeleton className="h-40 w-full" /></CardContent>
    </Card>
  );
}

export default function LcrReportsPage() {
  const [statusData, setStatusData] = useState<StatusRow[]>([]);
  const [spendData, setSpendData] = useState<SpendRow[]>([]);
  const [supplierData, setSupplierData] = useState<SupplierRow[]>([]);
  const [overdueData, setOverdueData] = useState<OverdueRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyTonnageRow[]>([]);
  const [thicknessData, setThicknessData] = useState<ThicknessRow[]>([]);
  const [weightData, setWeightData] = useState<WeightBreakdownRow[]>([]);
  const [statusBreakdownData, setStatusBreakdownData] = useState<{ data: StatusBreakdownRow[], total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState({
    status: true, spend: true, supplier: true, overdue: true,
    monthly: true, thickness: true, weight: true, breakdown: true,
  });

  // Filter for status breakdown
  const [breakdownProjectFilter, setBreakdownProjectFilter] = useState('all');

  // Filters for procurement status chart
  const [statusProjectFilter, setStatusProjectFilter] = useState('all');
  const [statusStatusFilter, setStatusStatusFilter] = useState('all');

  useEffect(() => {
    fetch('/api/supply-chain/lcr/reports/status').then(r => r.json()).then(d => { setStatusData(d); setLoading(l => ({ ...l, status: false })); }).catch(() => setLoading(l => ({ ...l, status: false })));
    fetch('/api/supply-chain/lcr/reports/spend-vs-target').then(r => r.json()).then(d => { setSpendData(d); setLoading(l => ({ ...l, spend: false })); }).catch(() => setLoading(l => ({ ...l, spend: false })));
    fetch('/api/supply-chain/lcr/reports/supplier-performance').then(r => r.json()).then(d => { setSupplierData(d); setLoading(l => ({ ...l, supplier: false })); }).catch(() => setLoading(l => ({ ...l, supplier: false })));
    fetch('/api/supply-chain/lcr/reports/overdue').then(r => r.json()).then(d => { setOverdueData(d); setLoading(l => ({ ...l, overdue: false })); }).catch(() => setLoading(l => ({ ...l, overdue: false })));
    fetch('/api/supply-chain/lcr/reports/monthly-tonnage').then(r => r.json()).then(d => { setMonthlyData(d); setLoading(l => ({ ...l, monthly: false })); }).catch(() => setLoading(l => ({ ...l, monthly: false })));
    fetch('/api/supply-chain/lcr/reports/by-thickness').then(r => r.json()).then(d => { setThicknessData(d); setLoading(l => ({ ...l, thickness: false })); }).catch(() => setLoading(l => ({ ...l, thickness: false })));
    fetch('/api/supply-chain/lcr/reports/weight-breakdown').then(r => r.json()).then(d => { setWeightData(d); setLoading(l => ({ ...l, weight: false })); }).catch(() => setLoading(l => ({ ...l, weight: false })));
    fetch('/api/supply-chain/lcr/reports/status-breakdown').then(r => r.json()).then(d => { setStatusBreakdownData(d); setLoading(l => ({ ...l, breakdown: false })); }).catch(() => setLoading(l => ({ ...l, breakdown: false })));
  }, [breakdownProjectFilter]);

  // Color mapping for different statuses
  const STATUS_CHART_COLORS: Record<string, string> = {
    'Bought': '#22c55e',
    'Under Request': '#f97316',
    'Available at factory': '#3b82f6',
    'Available at Factory': '#3b82f6',
    'Requested': '#eab308',
    'Ordered': '#6366f1',
    'Received': '#10b981',
    'Cancelled': '#9ca3af',
    'Canceled': '#9ca3af',
    'Suspended': '#ef4444',
    'Closed': '#64748b',
    'Converted to Built-Up': '#a855f7',
    'Merged to other thickness': '#8b5cf6',
    'Not available in the market': '#dc2626',
    'Only Price Request': '#ca8a04',
    'Replaced': '#06b6d4',
    'Unknown': '#6b7280',
  };

  const getStatusColor = (status: string): string => {
    return STATUS_CHART_COLORS[status] ?? `hsl(${Math.abs(status.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 70%, 50%)`;
  };

  // Derive unique projects and statuses from statusData for filter dropdowns
  const allProjects = useMemo(() => Array.from(new Set(statusData.map(r => r.projectNumber ?? 'Unknown'))).sort(), [statusData]);
  const allStatuses = useMemo(() => Array.from(new Set(statusData.map(r => r.status ?? 'Unknown'))).sort(), [statusData]);

  // Filtered + aggregated chart data
  const { chartData, uniqueStatuses } = useMemo(() => {
    const filtered = statusData.filter(row => {
      const proj = row.projectNumber ?? 'Unknown';
      const stat = row.status ?? 'Unknown';
      if (statusProjectFilter !== 'all' && proj !== statusProjectFilter) return false;
      if (statusStatusFilter !== 'all' && stat !== statusStatusFilter) return false;
      return true;
    });

    const byProject = new Map<string, Record<string, string | number>>();
    const statuses = new Set<string>();
    for (const row of filtered) {
      const key = row.projectNumber ?? 'Unknown';
      const status = row.status ?? 'Unknown';
      statuses.add(status);
      if (!byProject.has(key)) byProject.set(key, { name: key });
      const entry = byProject.get(key)!;
      entry[status] = ((entry[status] as number) ?? 0) + row.itemCount;
    }
    return {
      chartData: Array.from(byProject.values()),
      uniqueStatuses: Array.from(statuses).sort(),
    };
  }, [statusData, statusProjectFilter, statusStatusFilter]);

  // Thickness chart colors
  const THICKNESS_COLORS = ['#3b82f6','#f97316','#22c55e','#a855f7','#eab308','#06b6d4','#ef4444','#64748b','#10b981','#8b5cf6'];

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="size-6" />
            LCR Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Procurement analytics and insights</p>
        </div>
        <Link href="/supply-chain/lcr">
          <Button variant="outline" size="sm"><ChevronLeft className="size-4 mr-1" /> Back to LCR</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Card 1: Procurement Status */}
        {loading.status ? <SkeletonCard /> : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Package className="size-4" /> Procurement Status</CardTitle>
              <CardDescription>Item count by project and status</CardDescription>
              <div className="flex gap-2 pt-1 flex-wrap">
                <Select value={statusProjectFilter} onValueChange={setStatusProjectFilter}>
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {allProjects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusStatusFilter} onValueChange={setStatusStatusFilter}>
                  <SelectTrigger className="h-7 text-xs w-40">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {uniqueStatuses.map((status) => (
                      <Bar key={status} dataKey={status} fill={getStatusColor(status)} stackId="a" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 2: Spend vs Target */}
        {loading.spend ? <SkeletonCard /> : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4" /> Spend vs Target</CardTitle>
              <CardDescription>Actual spend (Amount column) vs target price per project</CardDescription>
            </CardHeader>
            <CardContent>
              {spendData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-2 py-2 font-medium">Project</th>
                        <th className="text-right px-2 py-2 font-medium">Spend</th>
                        <th className="text-right px-2 py-2 font-medium">Target</th>
                        <th className="text-right px-2 py-2 font-medium">Var %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spendData.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-2 py-1.5 font-medium">{row.projectNumber ?? 'Unknown'}</td>
                          <td className="px-2 py-1.5 text-right">{formatSAR(row.totalSpend)}</td>
                          <td className="px-2 py-1.5 text-right">{formatSAR(row.totalTarget)}</td>
                          <td className="px-2 py-1.5 text-right">
                            {row.variancePct !== null ? (
                              <span className={row.variancePct > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                                {row.variancePct > 0 ? '+' : ''}{row.variancePct}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 3: Monthly Tonnage */}
        {loading.monthly ? <SkeletonCard /> : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Weight className="size-4" /> Monthly Tonnage Purchases</CardTitle>
              <CardDescription>Total weight (tonnes) purchased per month by buying date</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data available — ensure items have a buying date and weight</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit=" T" />
                    <Tooltip formatter={(val: number) => [`${val.toLocaleString('en-US', { maximumFractionDigits: 1 })} T`, 'Weight']} />
                    <Legend />
                    <Line type="monotone" dataKey="totalWeight" name="Tonnage" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 4: Purchases by Thickness */}
        {loading.thickness ? <SkeletonCard /> : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Layers className="size-4" /> Purchases by Thickness</CardTitle>
              <CardDescription>Weight and amount breakdown by steel thickness</CardDescription>
            </CardHeader>
            <CardContent>
              {thicknessData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={thicknessData.slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} unit=" T" />
                      <YAxis type="category" dataKey="thickness" tick={{ fontSize: 10 }} width={60} />
                      <Tooltip formatter={(val: number) => [`${val.toLocaleString('en-US', { maximumFractionDigits: 1 })} T`]} />
                      <Bar dataKey="totalWeight" name="Weight">
                        {thicknessData.slice(0, 15).map((_, i) => (
                          <Cell key={i} fill={THICKNESS_COLORS[i % THICKNESS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-card">
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-2 py-1.5 font-medium">Thickness</th>
                          <th className="text-right px-2 py-1.5 font-medium">Items</th>
                          <th className="text-right px-2 py-1.5 font-medium">Weight</th>
                          <th className="text-right px-2 py-1.5 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thicknessData.map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-2 py-1">{row.thickness}</td>
                            <td className="px-2 py-1 text-right">{row.itemCount}</td>
                            <td className="px-2 py-1 text-right">{formatTon(row.totalWeight)}</td>
                            <td className="px-2 py-1 text-right">{formatSAR(row.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 5: Supplier Performance */}
        {loading.supplier ? <SkeletonCard /> : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" /> Supplier Performance</CardTitle>
              <CardDescription>P.O. count, total SAR and weight by supplier</CardDescription>
            </CardHeader>
            <CardContent>
              {supplierData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-2 py-2 font-medium">Supplier</th>
                        <th className="text-right px-2 py-2 font-medium">P.O.s</th>
                        <th className="text-right px-2 py-2 font-medium">Total SAR</th>
                        <th className="text-right px-2 py-2 font-medium">Weight</th>
                        <th className="text-right px-2 py-2 font-medium">Avg/Ton</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierData.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-2 py-1.5">{row.supplierName ?? '—'}</td>
                          <td className="px-2 py-1.5 text-right">{row.poCount}</td>
                          <td className="px-2 py-1.5 text-right">{row.totalAwarded > 0 ? formatSAR(row.totalAwarded) : '—'}</td>
                          <td className="px-2 py-1.5 text-right">{row.totalWeight > 0 ? formatTon(row.totalWeight) : '—'}</td>
                          <td className="px-2 py-1.5 text-right">
                            {row.avgPricePerTon !== null ? formatSAR(row.avgPricePerTon) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 6: Weight Breakdown by Status */}
        {loading.weight ? <SkeletonCard /> : (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><PieChart className="size-4" /> Weight Procurement Status</CardTitle>
              <CardDescription>% of total weight per project/building that is Bought, Under Request, Available at factory, or other</CardDescription>
            </CardHeader>
            <CardContent>
              {weightData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data available — ensure items have weight values</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-2 py-2 font-medium">Project</th>
                        <th className="text-left px-2 py-2 font-medium">Building</th>
                        <th className="text-right px-2 py-2 font-medium">Total (T)</th>
                        <th className="px-2 py-2 font-medium text-center min-w-[320px]">Status Breakdown</th>
                        <th className="text-right px-2 py-2 font-medium text-green-700">Bought %</th>
                        <th className="text-right px-2 py-2 font-medium text-orange-600">Under Req %</th>
                        <th className="text-right px-2 py-2 font-medium text-blue-600">At Factory %</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Other %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weightData.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-2 py-2 font-medium">{row.projectNumber}</td>
                          <td className="px-2 py-2 text-muted-foreground text-xs max-w-[120px] truncate" title={row.buildingName}>{row.buildingName}</td>
                          <td className="px-2 py-2 text-right font-mono text-xs">{formatTon(row.totalWeight)}</td>
                          <td className="px-2 py-2">
                            <div className="flex h-4 rounded overflow-hidden w-full min-w-[280px]">
                              {row.boughtPct > 0 && <div className="bg-green-500" style={{ width: `${row.boughtPct}%` }} title={`Bought: ${row.boughtPct}%`} />}
                              {row.underRequestPct > 0 && <div className="bg-orange-400" style={{ width: `${row.underRequestPct}%` }} title={`Under Request: ${row.underRequestPct}%`} />}
                              {row.availableAtFactoryPct > 0 && <div className="bg-blue-400" style={{ width: `${row.availableAtFactoryPct}%` }} title={`Available at factory: ${row.availableAtFactoryPct}%`} />}
                              {row.otherPct > 0 && <div className="bg-gray-300" style={{ width: `${row.otherPct}%` }} title={`Other: ${row.otherPct}%`} />}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right text-green-700 font-medium">{row.boughtPct}%</td>
                          <td className="px-2 py-2 text-right text-orange-600 font-medium">{row.underRequestPct}%</td>
                          <td className="px-2 py-2 text-right text-blue-600 font-medium">{row.availableAtFactoryPct}%</td>
                          <td className="px-2 py-2 text-right text-muted-foreground">{row.otherPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 7: Status Breakdown */}
        {loading.breakdown ? <SkeletonCard /> : (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4" /> Status Breakdown by Tonnage</CardTitle>
              <CardDescription>Total weight distribution across procurement statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {statusBreakdownData.data.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 border">
                      <div className="text-xs text-muted-foreground mb-1">Total Project Weight</div>
                      <div className="text-xl font-bold">{formatTon(statusBreakdownData.total)}</div>
                    </div>
                    {statusBreakdownData.data.slice(0, 3).map((row, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3 border">
                        <div className="text-xs text-muted-foreground mb-1">{row.status}</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-xl font-bold">{row.percentage}%</div>
                          <div className="text-xs text-muted-foreground">{formatTon(row.totalWeight)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium">Status</th>
                          <th className="text-right px-3 py-2 font-medium">Weight (Tons)</th>
                          <th className="text-right px-3 py-2 font-medium">Percentage</th>
                          <th className="px-3 py-2 font-medium">Distribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusBreakdownData.data.map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-3 py-2 font-medium">
                              <Badge variant="outline" style={{ 
                                backgroundColor: `${getStatusColor(row.status)}15`,
                                borderColor: getStatusColor(row.status),
                                color: getStatusColor(row.status)
                              }}>
                                {row.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{formatTon(row.totalWeight)}</td>
                            <td className="px-3 py-2 text-right font-bold">{row.percentage}%</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                                  <div 
                                    className="h-full transition-all" 
                                    style={{ 
                                      width: `${row.percentage}%`,
                                      backgroundColor: getStatusColor(row.status)
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 8: Overdue Items */}
        {loading.overdue ? <SkeletonCard /> : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-red-500" /> Overdue Items</CardTitle>
              <CardDescription>Items past their needed-by date without delivery</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueData.length === 0 ? (
                <p className="text-sm text-green-600 text-center py-8">No overdue items</p>
              ) : (
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-2 py-2 font-medium">Project</th>
                        <th className="text-left px-2 py-2 font-medium">Item</th>
                        <th className="text-left px-2 py-2 font-medium">Needed By</th>
                        <th className="text-right px-2 py-2 font-medium">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueData.slice(0, 20).map((row) => (
                        <tr key={row.id} className="border-b">
                          <td className="px-2 py-1.5">{row.projectNumber ?? '—'}</td>
                          <td className="px-2 py-1.5 max-w-[150px] truncate" title={row.itemLabel ?? undefined}>{row.itemLabel ?? '—'}</td>
                          <td className="px-2 py-1.5 text-red-600">{formatDate(row.neededToDate)}</td>
                          <td className="px-2 py-1.5 text-right">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {row.daysOverdue}d
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {overdueData.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Showing 20 of {overdueData.length} overdue items
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
