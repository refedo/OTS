'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, ChevronLeft, ChevronRight, ArrowLeft, Download, List, FolderTree, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function fmt(n: number): string {
  if (!n || n === 0) return '';
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const JOURNAL_CODES = [
  { value: 'all', label: 'All Journals' },
  { value: 'VTE', label: 'VTE — Sales' },
  { value: 'ACH', label: 'ACH — Purchases' },
  { value: 'BQ', label: 'BQ — Bank' },
  { value: 'OD', label: 'OD — Misc' },
];

const SOURCE_TYPES = [
  { value: 'all', label: 'All Sources' },
  { value: 'customer_invoice', label: 'Customer Invoice' },
  { value: 'supplier_invoice', label: 'Supplier Invoice' },
  { value: 'customer_payment', label: 'Customer Payment' },
  { value: 'supplier_payment', label: 'Supplier Payment' },
];

export default function JournalEntriesPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [journalCode, setJournalCode] = useState('all');
  const [sourceType, setSourceType] = useState('all');
  const [accountCode, setAccountCode] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (journalCode && journalCode !== 'all') params.set('journal_code', journalCode);
      if (sourceType && sourceType !== 'all') params.set('source_type', sourceType);
      if (accountCode) params.set('account_code', accountCode);
      params.set('page', String(page));
      params.set('limit', '100');

      const res = await fetch(`/api/financial/journal-entries?${params}`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [fromDate, toDate, journalCode, sourceType, accountCode, page]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const fetchHierarchy = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      params.set('groupBy', 'account');

      const res = await fetch(`/api/financial/journal-entries?${params}`);
      if (res.ok) setHierarchyData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (viewMode === 'hierarchy') fetchHierarchy();
  }, [viewMode, fetchHierarchy]);

  const toggleAccountExpand = (accountCode: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountCode)) newExpanded.delete(accountCode);
    else newExpanded.add(accountCode);
    setExpandedAccounts(newExpanded);
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (journalCode && journalCode !== 'all') params.set('journal_code', journalCode);
      if (sourceType && sourceType !== 'all') params.set('source_type', sourceType);
      if (accountCode) params.set('account_code', accountCode);
      params.set('export', 'excel');
      params.set('limit', '10000');

      const res = await fetch(`/api/financial/journal-entries?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `journal-entries-${fromDate}-to-${toDate}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Export Complete', description: 'Journal entries exported to Excel' });
      } else {
        toast({ title: 'Export Failed', description: 'Failed to export journal entries', variant: 'destructive' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Export Failed', description: 'An error occurred during export', variant: 'destructive' });
    }
    finally { setExporting(false); }
  };

  const entries = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/financial">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Journal Entries</h1>
          <p className="text-muted-foreground mt-1">Browse auto-generated double-entry journal entries</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label>Journal</Label>
              <Select value={journalCode} onValueChange={v => { setJournalCode(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All Journals" /></SelectTrigger>
                <SelectContent>
                  {JOURNAL_CODES.map(j => (
                    <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source Type</Label>
              <Select value={sourceType} onValueChange={v => { setSourceType(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All Sources" /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account Code</Label>
              <Input placeholder="e.g. 411000" value={accountCode}
                onChange={e => { setAccountCode(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Entries ({pagination.total})
          </CardTitle>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
                <List className="h-4 w-4 mr-1" /> List
              </Button>
              <Button variant={viewMode === 'hierarchy' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('hierarchy')}>
                <FolderTree className="h-4 w-4 mr-1" /> By Account
              </Button>
            </div>
            {/* Export Button */}
            <Button variant="outline" size="sm" onClick={exportToExcel} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              Export Excel
            </Button>
            {/* Pagination */}
            {viewMode === 'list' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-left py-2 px-3 font-medium">Journal</th>
                    <th className="text-left py-2 px-3 font-medium">Account</th>
                    <th className="text-left py-2 px-3 font-medium">Description</th>
                    <th className="text-left py-2 px-3 font-medium">Source</th>
                    <th className="text-right py-2 px-3 font-medium">Debit</th>
                    <th className="text-right py-2 px-3 font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No entries found for the selected criteria
                      </td>
                    </tr>
                  ) : entries.map((e: any) => (
                    <tr key={e.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 text-muted-foreground">{e.entry_date}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">{e.journal_code}</Badge>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-xs">{e.account_code}</span>
                        {e.account?.account_name && (
                          <span className="ml-2 text-muted-foreground text-xs">{e.account.account_name}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 max-w-[200px] truncate text-xs" title={e.description}>
                        {e.description || '—'}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-xs">{e.source_type}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-green-600">{fmt(e.debit)}</td>
                      <td className="py-2 px-3 text-right font-mono text-red-600">{fmt(e.credit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Hierarchy View by Account */
            <div className="p-4">
              {hierarchyData?.accounts?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No entries found</div>
              ) : (
                <div className="space-y-1">
                  {(hierarchyData?.accounts || []).map((acct: any) => (
                    <div key={acct.account_code} className="border rounded-lg">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleAccountExpand(acct.account_code)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedAccounts.has(acct.account_code) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronUp className="h-4 w-4 rotate-180" />
                          }
                          <span className="font-mono text-sm">{acct.account_code}</span>
                          <span className="font-medium">{acct.account_name}</span>
                          <Badge variant="outline" className="text-xs">{acct.entry_count} entries</Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-green-600 font-mono">Dr: {fmt(acct.total_debit)}</span>
                          <span className="text-red-600 font-mono">Cr: {fmt(acct.total_credit)}</span>
                          <span className={`font-semibold font-mono ${acct.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            Bal: {fmt(Math.abs(acct.balance))} {acct.balance >= 0 ? 'Dr' : 'Cr'}
                          </span>
                        </div>
                      </div>
                      {expandedAccounts.has(acct.account_code) && acct.entries && (
                        <div className="border-t bg-muted/20">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1.5 px-3 font-medium">Date</th>
                                <th className="text-left py-1.5 px-3 font-medium">Journal</th>
                                <th className="text-left py-1.5 px-3 font-medium">Description</th>
                                <th className="text-right py-1.5 px-3 font-medium">Debit</th>
                                <th className="text-right py-1.5 px-3 font-medium">Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {acct.entries.slice(0, 50).map((e: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-muted/30">
                                  <td className="py-1.5 px-3 text-muted-foreground">{e.entry_date}</td>
                                  <td className="py-1.5 px-3"><Badge variant="outline" className="text-[10px]">{e.journal_code}</Badge></td>
                                  <td className="py-1.5 px-3 max-w-[300px] truncate">{e.description || '—'}</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-green-600">{fmt(e.debit)}</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-red-600">{fmt(e.credit)}</td>
                                </tr>
                              ))}
                              {acct.entries.length > 50 && (
                                <tr><td colSpan={5} className="py-2 text-center text-muted-foreground">Showing 50 of {acct.entries.length} entries</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
