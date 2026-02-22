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
import { Loader2, FileText, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Journal</th>
                    <th className="text-center p-3 font-medium">Piece #</th>
                    <th className="text-left p-3 font-medium">Account</th>
                    <th className="text-left p-3 font-medium">Label</th>
                    <th className="text-right p-3 font-medium">Debit</th>
                    <th className="text-right p-3 font-medium">Credit</th>
                    <th className="text-left p-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e: any, i: number) => (
                    <tr key={e.id || i} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-xs">{e.entry_date ? new Date(e.entry_date).toLocaleDateString() : ''}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{e.journal_code}</Badge>
                      </td>
                      <td className="p-3 text-center text-xs text-muted-foreground">{e.piece_num}</td>
                      <td className="p-3">
                        <span className="font-mono font-semibold text-xs">{e.account_code}</span>
                        {e.account_name && (
                          <span className="text-xs text-muted-foreground ml-1">— {e.account_name}</span>
                        )}
                      </td>
                      <td className="p-3 text-xs max-w-[200px] truncate">{e.label}</td>
                      <td className="p-3 text-right font-mono text-xs">{fmt(Number(e.debit))}</td>
                      <td className="p-3 text-right font-mono text-xs">{fmt(Number(e.credit))}</td>
                      <td className="p-3 text-xs text-muted-foreground">{e.source_ref || e.source_type}</td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No journal entries found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
