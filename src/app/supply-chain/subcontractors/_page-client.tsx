'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Handshake, Plus, RefreshCw, Eye, Edit, MoreVertical, TrendingUp,
  DollarSign, CheckCircle2, Clock, AlertTriangle, Ban, Search,
  Building2, FolderOpen, ChevronRight,
} from 'lucide-react';

type Contract = {
  id: string;
  contractNumber: string;
  name: string;
  status: string;
  contractValue: number;
  retentionPercentage: number;
  scopeTypes: string[];
  createdAt: string;
  project: { id: string; projectNumber: string; name: string };
  building: { id: string; designation: string; name: string } | null;
  supplier: { id: string; supplierCode: string; name: string; rating: string | null };
  paymentCertificates: {
    id: string;
    status: string;
    cumulativePercentage: number;
    cumulativeAmount: number;
    netAmountDue: number;
    paidAmount: number;
  }[];
};

type DashStats = {
  totalContracts: number;
  byStatus: Record<string, number>;
  totalValue: number;
  totalPaid: number;
  totalOutstanding: number;
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'Draft',      cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  SUBMITTED: { label: 'Submitted',  cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  APPROVED:  { label: 'Approved',   cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  ACTIVE:    { label: 'Active',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  SUSPENDED: { label: 'Suspended',  cls: 'bg-orange-100 text-orange-700 border-orange-300' },
  COMPLETED: { label: 'Completed',  cls: 'bg-teal-100 text-teal-700 border-teal-300' },
  CANCELLED: { label: 'Cancelled',  cls: 'bg-rose-100 text-rose-700 border-rose-300' },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  DRAFT:     <Clock className="size-3" />,
  SUBMITTED: <AlertTriangle className="size-3" />,
  APPROVED:  <CheckCircle2 className="size-3" />,
  ACTIVE:    <TrendingUp className="size-3" />,
  SUSPENDED: <AlertTriangle className="size-3" />,
  COMPLETED: <CheckCircle2 className="size-3" />,
  CANCELLED: <Ban className="size-3" />,
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-teal-500' : pct >= 60 ? 'bg-emerald-500' : pct >= 30 ? 'bg-amber-500' : 'bg-slate-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-9 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function SubcontractorsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes, statsRes] = await Promise.all([
        fetch('/api/subcontractor-contracts'),
        fetch('/api/subcontractor-contracts/dashboard'),
      ]);
      if (contractsRes.ok) setContracts(await contractsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = contracts.filter(c => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || c.contractNumber.toLowerCase().includes(q) ||
      c.supplier.name.toLowerCase().includes(q) ||
      c.project.projectNumber.toLowerCase().includes(q) ||
      c.project.name.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getCumulativeProgress = (c: Contract) => {
    const latest = c.paymentCertificates
      .filter(cert => cert.status !== 'CANCELLED')
      .sort((a, b) => b.cumulativePercentage - a.cumulativePercentage)[0];
    return latest ? Number(latest.cumulativePercentage) : 0;
  };

  const getTotalPaid = (c: Contract) => c.paymentCertificates
    .filter(cert => cert.status === 'PAID')
    .reduce((s, cert) => s + Number(cert.paidAmount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 max-lg:pt-20 space-y-6">

        {/* ── Hero ── */}
        <div className="rounded-2xl border bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Handshake className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Subcontractor Contracts</h1>
                  <p className="text-orange-100 text-sm">COGS & Installation Subcontractors</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className="size-4" />
              </Button>
              <Link href="/supply-chain/subcontractors/new">
                <Button className="bg-white text-orange-700 hover:bg-orange-50 font-semibold shadow">
                  <Plus className="size-4 mr-2" />
                  New Contract
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Contracts', value: stats.totalContracts, icon: <Handshake className="size-5 text-orange-600" />, bg: 'bg-orange-500/10' },
              { label: 'Active', value: stats.byStatus['ACTIVE'] ?? 0, icon: <TrendingUp className="size-5 text-emerald-600" />, bg: 'bg-emerald-500/10' },
              { label: 'Pending Approval', value: stats.byStatus['SUBMITTED'] ?? 0, icon: <Clock className="size-5 text-amber-600" />, bg: 'bg-amber-500/10' },
              { label: 'Total Value', value: fmt(stats.totalValue), icon: <DollarSign className="size-5 text-blue-600" />, bg: 'bg-blue-500/10', wide: true },
              { label: 'Outstanding', value: fmt(stats.totalOutstanding), icon: <AlertTriangle className="size-5 text-rose-600" />, bg: 'bg-rose-500/10', wide: true },
            ].map((kpi, i) => (
              <Card key={i} className={kpi.wide ? 'sm:col-span-1' : ''}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>{kpi.icon}</div>
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-lg font-bold">{kpi.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Contracts Table ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="size-5" />
                  Contracts
                </CardTitle>
                <CardDescription>All subcontractor contracts across all projects</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-9 w-48"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <RefreshCw className="size-5 animate-spin mr-2" />
                Loading contracts…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Handshake className="size-12 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">
                  {search || statusFilter !== 'ALL' ? 'No contracts match your filters.' : 'No contracts yet.'}
                </p>
                {!search && statusFilter === 'ALL' && (
                  <Link href="/supply-chain/subcontractors/new">
                    <Button variant="outline" size="sm" className="mt-4">
                      <Plus className="size-4 mr-1" />
                      Create First Contract
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Contract #</TableHead>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Project / Building</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead className="text-right">Value (SAR)</TableHead>
                      <TableHead className="min-w-[120px]">Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT;
                      const progress = getCumulativeProgress(c);
                      const paid = getTotalPaid(c);
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/supply-chain/subcontractors/${c.id}`)}>
                          <TableCell>
                            <span className="font-mono font-semibold text-sm text-primary">{c.contractNumber}</span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{c.supplier.name}</p>
                              <p className="text-xs text-muted-foreground">{c.supplier.supplierCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="font-medium">{c.project.projectNumber}</span>
                              {c.building && (
                                <>
                                  <ChevronRight className="size-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{c.building.designation}</span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{c.project.name}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(c.scopeTypes as string[]).map(st => (
                                <span key={st} className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">
                                  {st.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <p className="font-semibold text-sm">{fmt(Number(c.contractValue))}</p>
                              {paid > 0 && <p className="text-xs text-emerald-600">Paid: {fmt(paid)}</p>}
                            </div>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <ProgressBar value={progress} />
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Badge variant="outline" className={`gap-1 ${cfg.cls}`}>
                              {STATUS_ICON[c.status]}
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="size-8 p-0">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/supply-chain/subcontractors/${c.id}`)}>
                                  <Eye className="size-4 mr-2" /> View
                                </DropdownMenuItem>
                                {c.status === 'DRAFT' && (
                                  <DropdownMenuItem onClick={() => router.push(`/supply-chain/subcontractors/${c.id}?edit=1`)}>
                                    <Edit className="size-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => router.push(`/supply-chain/subcontractors/${c.id}`)}>
                                  <Building2 className="size-4 mr-2" /> Payment Certs
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Status breakdown ── */}
        {stats && Object.keys(stats.byStatus).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG)
              .filter(([k]) => (stats.byStatus[k] ?? 0) > 0)
              .map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setStatusFilter(statusFilter === k ? 'ALL' : k)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    statusFilter === k ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${v.cls} gap-1`}>
                      {STATUS_ICON[k]}
                      {v.label}
                    </Badge>
                  </div>
                  <span className="font-bold text-lg">{stats.byStatus[k]}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
