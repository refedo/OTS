'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign, Landmark, Receipt,
  FileText, BarChart3, PieChart, Clock, Loader2, AlertTriangle,
  ArrowRight, CheckCircle, Building2, CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

export default function FinancialDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bankAccountsExpanded, setBankAccountsExpanded] = useState(false);

  const currentYear = new Date().getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, syncRes] = await Promise.all([
        fetch(`/api/financial/dashboard?year=${currentYear}`),
        fetch('/api/financial/sync'),
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (syncRes.ok) setSyncStatus(await syncRes.json());
    } catch (e) {
      console.error('Failed to fetch financial data:', e);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/financial/sync', { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const d = dashboard || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground mt-1">
            Financial overview for {currentYear} — Data synced from Dolibarr ERP
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus?.lastFullSync && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last sync: {new Date(syncStatus.lastFullSync).toLocaleString()}
            </span>
          )}
          <Button onClick={handleSync} disabled={syncing} variant="outline">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{formatSAR(d.totalRevenue || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Expenses</span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{formatSAR(d.totalExpenses || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Net Profit</span>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
            <div className={`text-2xl font-bold ${(d.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatSAR(d.netProfit || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">VAT Payable</span>
              <Receipt className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{formatSAR(d.vatPayable || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total AR</span>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{formatSAR(d.totalAR || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total AP</span>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{formatSAR(d.totalAP || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts - Collapsible */}
      {d.bankAccounts && d.bankAccounts.length > 0 && (
        <Card>
          <CardHeader 
            className="cursor-pointer select-none" 
            onClick={() => setBankAccountsExpanded(!bankAccountsExpanded)}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Bank Accounts
                <Badge variant="outline" className="ml-2">{d.bankAccounts.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {bankAccountsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
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
                      <Badge variant={bank.isOpen ? 'default' : 'secondary'}>
                        {bank.isOpen ? 'Active' : 'Closed'}
                      </Badge>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/financial/reports/trial-balance">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Trial Balance</h3>
                  <p className="text-xs text-muted-foreground">Debit & credit balances for all accounts</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-primary">
                View Report <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/income-statement">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Income Statement (P&L)</h3>
                  <p className="text-xs text-muted-foreground">Revenue, expenses, and net profit</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-primary">
                View Report <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/balance-sheet">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Balance Sheet</h3>
                  <p className="text-xs text-muted-foreground">Assets, liabilities, and equity</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-primary">
                View Report <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/vat">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Receipt className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">VAT Report</h3>
                  <p className="text-xs text-muted-foreground">Input vs output VAT (ZATCA)</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-primary">
                View Report <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/reports/aging">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Aging Report</h3>
                  <p className="text-xs text-muted-foreground">AR/AP aging by due date</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-primary">
                View Report <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financial/journal-entries">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/30">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Journal Entries</h3>
                  <p className="text-xs text-muted-foreground">Browse auto-generated entries</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-primary">
                View Entries <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{syncStatus.counts?.customerInvoices || 0}</div>
                <div className="text-xs text-muted-foreground">Customer Invoices</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{syncStatus.counts?.supplierInvoices || 0}</div>
                <div className="text-xs text-muted-foreground">Supplier Invoices</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{syncStatus.counts?.payments || 0}</div>
                <div className="text-xs text-muted-foreground">Payments</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{syncStatus.counts?.bankAccounts || 0}</div>
                <div className="text-xs text-muted-foreground">Bank Accounts</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{syncStatus.counts?.journalEntries || 0}</div>
                <div className="text-xs text-muted-foreground">Journal Entries</div>
              </div>
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
                          <td className="p-2">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-2">{log.entity_type}</td>
                          <td className="p-2">
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                              {log.status}
                            </Badge>
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
