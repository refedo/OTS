'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign, Landmark, Receipt,
  FileText, BarChart3, Clock, Loader2,
  ArrowRight, CheckCircle, Building2, CreditCard, ChevronDown, ChevronUp,
  Percent, Users, Wallet, FolderOpen, ArrowUpDown, Banknote, Package,
} from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    if (m >= 1) return `${sign}SAR ${m.toFixed(2)}M`;
    return `${sign}SAR ${(abs / 1_000).toFixed(0)}K`;
  }
  if (abs >= 1_000) return `${sign}SAR ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}SAR ${abs.toFixed(0)}`;
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatGMT3(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function FinancialDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null);
  const [bankAccountsExpanded, setBankAccountsExpanded] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const [fromYear, setFromYear] = useState(currentYear.toString());
  const [toYear, setToYear] = useState(currentYear.toString());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, syncRes] = await Promise.all([
        fetch(`/api/financial/dashboard?fromYear=${fromYear}&toYear=${toYear}`),
        fetch('/api/financial/sync'),
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (syncRes.ok) setSyncStatus(await syncRes.json());
    } catch (e) {
      console.error('Failed to fetch financial data:', e);
    } finally {
      setLoading(false);
    }
  }, [fromYear, toYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/financial/sync', { method: 'POST' });
      if (res.ok) await fetchData();
    } catch (e) { console.error('Sync failed:', e); }
    finally { setSyncing(false); }
  };

  const handlePartialSync = async (entity: string) => {
    setSyncingEntity(entity);
    try {
      const res = await fetch(`/api/financial/sync?entities=${entity}`, { method: 'POST' });
      if (res.ok) await fetchData();
    } catch (e) { console.error(`Partial sync failed for ${entity}:`, e); }
    finally { setSyncingEntity(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const d = dashboard || {};
  const yearLabel = fromYear === toYear ? fromYear : `${fromYear}–${toYear}`;

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Financial overview for {yearLabel} — Data synced from Dolibarr ERP
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={fromYear} onValueChange={v => { setFromYear(v); if (Number(v) > Number(toYear)) setToYear(v); }}>
              <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">to</span>
            <Select value={toYear} onValueChange={v => { setToYear(v); if (Number(v) < Number(fromYear)) setFromYear(v); }}>
              <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {syncStatus?.lastFullSync && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last sync: {formatGMT3(syncStatus.lastFullSync)}
            </span>
          )}
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* KPI Cards - Row 1: P&L */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Link href="/financial/reports/income-statement">
          <Card className="hover:border-green-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">{formatCompact(d.totalRevenue || 0)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{formatSAR(d.totalRevenue || 0)}</div>
              <div className="text-[10px] text-primary mt-1 flex items-center">Income Statement <ArrowRight className="h-3 w-3 ml-1" /></div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/expenses-analysis">
          <Card className="hover:border-red-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Expenses</span>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">{formatCompact(d.totalExpenses || 0)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{formatSAR(d.totalExpenses || 0)}</div>
              <div className="text-[10px] text-primary mt-1 flex items-center">Expenses Analysis <ArrowRight className="h-3 w-3 ml-1" /></div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/income-statement">
          <Card className="hover:border-blue-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Net Profit</span>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </div>
              <div className={`text-2xl font-bold ${(d.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCompact(d.netProfit || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{formatSAR(d.netProfit || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Margin: <span className={`font-semibold ${(d.netMarginPct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPct(d.netMarginPct || 0)}</span></div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/aging">
          <Card className="hover:border-blue-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total AR</span>
                <CreditCard className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{formatCompact(d.totalAR || 0)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{formatSAR(d.totalAR || 0)}</div>
              <div className="text-[10px] text-primary mt-1 flex items-center">Aging Report <ArrowRight className="h-3 w-3 ml-1" /></div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/aging">
          <Card className="hover:border-purple-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total AP</span>
                <CreditCard className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold">{formatCompact(d.totalAP || 0)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{formatSAR(d.totalAP || 0)}</div>
              <div className="text-[10px] text-primary mt-1 flex items-center">Aging Report <ArrowRight className="h-3 w-3 ml-1" /></div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Row 2: Margins, ROA/ROE, Salaries, Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Link href="/financial/reports/income-statement">
          <Card className="border-green-200 dark:border-green-900/50 hover:border-green-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Gross Profit</span>
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              </div>
              <div className="text-lg font-bold text-green-600">{formatCompact(d.grossProfit || 0)}</div>
              <div className="text-[10px] text-muted-foreground">{formatSAR(d.grossProfit || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Margin: <span className="font-semibold text-green-600">{formatPct(d.grossMarginPct || 0)}</span></div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/assets">
          <Card className="border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">ROA</span>
                <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="text-lg font-bold text-indigo-600">{formatPct(d.roaPct || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Assets: {formatCompact(d.totalAssets || 0)}</div>
              <div className="text-[10px] text-primary mt-1 flex items-center">Asset Report <ArrowRight className="h-3 w-3 ml-1" /></div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/balance-sheet">
          <Card className="border-purple-200 dark:border-purple-900/50 hover:border-purple-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">ROE</span>
                <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div className="text-lg font-bold text-purple-600">{formatPct(d.roePct || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Equity: {formatCompact(d.totalEquity || 0)}</div>
              <div className="text-[10px] text-primary mt-1 flex items-center">Balance Sheet <ArrowRight className="h-3 w-3 ml-1" /></div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/salaries">
          <Card className="border-teal-200 dark:border-teal-900/50 hover:border-teal-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Salaries & Wages</span>
                <Users className="h-3.5 w-3.5 text-teal-500" />
              </div>
              <div className="text-lg font-bold text-teal-600">{formatCompact(d.salariesExpense || 0)}</div>
              <div className="text-[10px] text-muted-foreground">{formatSAR(d.salariesExpense || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {d.totalExpenses > 0 ? formatPct(((d.salariesExpense || 0) / d.totalExpenses) * 100) : '0.0%'} of expenses
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/project-analysis">
          <Card className="border-violet-200 dark:border-violet-900/50 hover:border-violet-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Projects</span>
                <FolderOpen className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <div className="text-lg font-bold text-violet-600">{d.projectCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">Synced from Dolibarr</div>
              <div className="text-[10px] text-primary mt-1 flex items-center">Project Analysis <ArrowRight className="h-3 w-3 ml-1" /></div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* VAT Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/financial/reports/vat">
          <Card className="border-orange-200 dark:border-orange-900/50 hover:border-orange-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  {(d.netVatPayable || 0) >= 0 ? 'Net VAT Payable' : 'Net VAT Refundable'}
                </span>
                <Receipt className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <div className={`text-lg font-bold ${(d.netVatPayable || 0) >= 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {formatCompact(Math.abs(d.netVatPayable || 0))}
              </div>
              <div className="text-[10px] text-muted-foreground">{formatSAR(Math.abs(d.netVatPayable || 0))}</div>
              <div className="text-[10px] text-primary mt-1 flex items-center">VAT Report <ArrowRight className="h-3 w-3 ml-1" /></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/financial/reports/vat">
          <Card className="border-blue-200 dark:border-blue-900/50 hover:border-blue-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Output VAT (Sales)</span>
                <Receipt className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="text-lg font-bold text-blue-600">{formatCompact(d.vatOutputTotal || 0)}</div>
              <div className="text-[10px] text-muted-foreground">{formatSAR(d.vatOutputTotal || 0)}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/financial/reports/vat">
          <Card className="border-green-200 dark:border-green-900/50 hover:border-green-400 transition-colors cursor-pointer h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Input VAT (Purchases)</span>
                <Receipt className="h-3.5 w-3.5 text-green-500" />
              </div>
              <div className="text-lg font-bold text-green-600">{formatCompact(d.vatInputTotal || 0)}</div>
              <div className="text-[10px] text-muted-foreground">{formatSAR(d.vatInputTotal || 0)}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Bank Accounts - Collapsible */}
      {d.bankAccounts && d.bankAccounts.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer select-none" onClick={() => setBankAccountsExpanded(!bankAccountsExpanded)}>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Bank Accounts
                <Badge variant="outline" className="ml-2">{d.bankAccounts.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {bankAccountsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          {bankAccountsExpanded && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {d.bankAccounts.map((bank: any) => (
                  <div key={bank.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm truncate">{bank.label}</span>
                      <Badge variant={bank.isOpen ? 'default' : 'secondary'}>{bank.isOpen ? 'Active' : 'Closed'}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{bank.bankName}</div>
                    <div className="text-xl font-bold">{formatSAR(bank.balance)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Quick Links to Reports */}
      <h2 className="text-xl font-semibold mt-2">Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/financial/reports/trial-balance', icon: BarChart3, color: 'blue', title: 'Trial Balance', desc: 'Debit & credit balances for all accounts' },
          { href: '/financial/reports/income-statement', icon: TrendingUp, color: 'green', title: 'Income Statement (P&L)', desc: 'Revenue, expenses, and net profit' },
          { href: '/financial/reports/balance-sheet', icon: Building2, color: 'purple', title: 'Balance Sheet', desc: 'Assets, liabilities, and equity' },
          { href: '/financial/reports/vat', icon: Receipt, color: 'orange', title: 'VAT Report', desc: 'Input vs output VAT (ZATCA)' },
          { href: '/financial/reports/aging', icon: Clock, color: 'red', title: 'Aging Report', desc: 'AR/AP aging by due date' },
          { href: '/financial/reports/soa', icon: FileText, color: 'cyan', title: 'Statement of Account', desc: 'Per-client/supplier account statement' },
          { href: '/financial/reports/cash-flow', icon: ArrowUpDown, color: 'emerald', title: 'Monthly Cash In/Out', desc: 'Monthly collections vs payments' },
          { href: '/financial/reports/cash-flow-forecast', icon: TrendingUp, color: 'sky', title: 'Cash Flow Forecast', desc: '13-week rolling cash projection' },
          { href: '/financial/reports/project-analysis', icon: FolderOpen, color: 'violet', title: 'Project Analysis', desc: 'Comprehensive project P&L, costs & collections' },
          { href: '/financial/reports/wip', icon: Wallet, color: 'amber', title: 'WIP Report', desc: 'Work-in-progress receivables & payables' },
          { href: '/financial/reports/projects-dashboard', icon: Banknote, color: 'lime', title: 'Projects Financial', desc: 'All projects invoicing & collection' },
          { href: '/financial/reports/project-cost-structure', icon: BarChart3, color: 'rose', title: 'Cost Structure', desc: 'Project cost breakdown by category' },
          { href: '/financial/reports/expenses-analysis', icon: TrendingDown, color: 'fuchsia', title: 'Expenses Analysis', desc: 'Detailed expense analysis & trends' },
          { href: '/financial/reports/assets', icon: Package, color: 'indigo', title: 'Asset Report', desc: 'All asset accounts and balances' },
          { href: '/financial/reports/salaries', icon: Users, color: 'teal', title: 'Salaries & Wages', desc: 'Salary records synced from Dolibarr' },
          { href: '/financial/journal-entries', icon: FileText, color: 'slate', title: 'Journal Entries', desc: 'Browse auto-generated entries' },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-${link.color}-100 dark:bg-${link.color}-900/30`}>
                    <link.icon className={`h-5 w-5 text-${link.color}-600`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{link.title}</h3>
                    <p className="text-xs text-muted-foreground">{link.desc}</p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-primary">
                  View <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
              {[
                { label: 'Projects', key: 'projects', syncKey: 'projects' },
                { label: 'Customer Invoices', key: 'customerInvoices', syncKey: 'customer_invoices' },
                { label: 'Supplier Invoices', key: 'supplierInvoices', syncKey: 'supplier_invoices' },
                { label: 'Payments', key: 'payments', syncKey: 'payments' },
                { label: 'Salaries', key: 'salaries', syncKey: 'salaries' },
                { label: 'Bank Accounts', key: 'bankAccounts', syncKey: 'bank_accounts' },
                { label: 'Journal Entries', key: 'journalEntries', syncKey: 'journal_entries', btnLabel: 'Regenerate' },
              ].map((item) => (
                <div key={item.key} className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{syncStatus.counts?.[item.key] || 0}</div>
                  <div className="text-xs text-muted-foreground mb-2">{item.label}</div>
                  {item.syncKey && (
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      disabled={!!syncingEntity || syncing}
                      onClick={() => handlePartialSync(item.syncKey)}>
                      {syncingEntity === item.syncKey ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      {item.btnLabel || 'Sync'}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {syncStatus.recentLogs && syncStatus.recentLogs.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Recent Sync Logs</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Entity</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-right p-2">Created</th>
                        <th className="text-right p-2">Updated</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncStatus.recentLogs.slice(0, 10).map((log: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{formatGMT3(log.created_at)}</td>
                          <td className="p-2">{log.entity_type}</td>
                          <td className="p-2">
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">{log.status}</Badge>
                          </td>
                          <td className="p-2 text-right">{log.records_created}</td>
                          <td className="p-2 text-right">{log.records_updated}</td>
                          <td className="p-2 text-right">{log.records_total}</td>
                          <td className="p-2 text-right">{(log.duration_ms / 1000).toFixed(1)}s</td>
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

      {/* Management Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/financial/chart-of-accounts">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Chart of Accounts</h3>
                <p className="text-xs text-muted-foreground">Manage account codes and categories</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/financial/settings">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Account Mapping & Settings</h3>
                <p className="text-xs text-muted-foreground">Configure default accounts and bank mappings</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
