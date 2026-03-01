'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2, ArrowLeft, Download, Printer, BookOpen, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, DollarSign, Receipt, Percent, Building2,
  FolderKanban, BarChart3,
} from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Raw Materials': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Subcontractors': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Transportation': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Labor': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Equipment': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Rent & Facilities': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Operating Expenses': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Administrative': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Financial Expenses': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  'VAT': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Liability': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Other / Unclassified': 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

const BAR_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-cyan-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500',
  'bg-slate-500', 'bg-lime-500', 'bg-rose-500', 'bg-gray-500',
];

export default function OTSJournalEntriesPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [groupBy, setGroupBy] = useState<string>('none');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const generate = async () => {
    setLoading(true);
    try {
      let url = `/api/financial/reports/ots-journal-entries?from=${fromDate}&to=${toDate}`;
      if (groupBy && groupBy !== 'none') url += `&groupBy=${groupBy}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const url = `/api/financial/reports/ots-journal-entries?from=${fromDate}&to=${toDate}&export=excel`;
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `ots-journal-entries-${fromDate}-to-${toDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const toggleEntry = (pieceNum: string) => {
    const next = new Set(expandedEntries);
    if (next.has(pieceNum)) next.delete(pieceNum);
    else next.add(pieceNum);
    setExpandedEntries(next);
  };

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const s = report?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              OTS Journal Entries
            </h1>
            <p className="text-muted-foreground mt-1">
              Double-entry journal entries from supplier invoices with proper expense categorization
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {report && (
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" /> Export Excel
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div>
              <Label>Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="No grouping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Print Header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-bold">OTS Journal Entries Report</h1>
            <p className="text-sm text-gray-500">Period: {report.fromDate} to {report.toDate}</p>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-orange-200 dark:border-orange-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                  <DollarSign className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-orange-600">{formatSAR(s.totalExpenses || 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">Debit entries</div>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total VAT Input</span>
                  <Percent className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{formatSAR(s.totalVAT || 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">Recoverable VAT</div>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Payables</span>
                  <Building2 className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{formatSAR(s.totalPayables || 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">Credit entries</div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Categories</span>
                  <FolderKanban className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{s.categoryCount || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Expense categories</div>
              </CardContent>
            </Card>

            <Card className={`${s.isAllBalanced ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-yellow-200 dark:border-yellow-900/50'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Journal Entries</span>
                  {s.isAllBalanced 
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <AlertCircle className="h-4 w-4 text-yellow-500" />
                  }
                </div>
                <div className={`text-2xl font-bold ${s.isAllBalanced ? 'text-emerald-600' : 'text-yellow-600'}`}>
                  {s.entryCount || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.isAllBalanced ? 'All balanced' : 'Check balances'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Summary */}
          {report.categorySummary && report.categorySummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Expense Categories Summary
                  <Badge variant="outline">{report.categorySummary.length} categories</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.categorySummary.map((cat: any, idx: number) => {
                    const barColor = BAR_COLORS[idx % BAR_COLORS.length];
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge className={CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Other / Unclassified']}>
                              {cat.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">{cat.accountCode}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{formatSAR(cat.totalDebit)}</span>
                            <span className="text-xs text-muted-foreground w-14 text-right">{formatPct(cat.percentOfTotal)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all duration-500`}
                            style={{ width: `${Math.max(cat.percentOfTotal, 0.5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grouped by Category View */}
          {report.groupBy === 'category' && report.groups && (
            <Card>
              <CardHeader>
                <CardTitle>Journal Entries by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.groups.map((group: any) => {
                    const isExpanded = expandedCategories.has(group.category);
                    return (
                      <div key={group.category} className="border rounded-lg">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleCategory(group.category)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={CATEGORY_COLORS[group.category] || CATEGORY_COLORS['Other / Unclassified']}>
                              {group.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{group.entryCount} entries</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold">{formatSAR(group.totalDebit)}</span>
                            <span className="text-sm text-muted-foreground">{formatPct(group.percentOfTotal)}</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                        {isExpanded && group.entries && (
                          <div className="border-t p-4 bg-muted/10">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium">Date</th>
                                  <th className="text-left p-2 font-medium">Piece #</th>
                                  <th className="text-left p-2 font-medium">Supplier</th>
                                  <th className="text-left p-2 font-medium">Project</th>
                                  <th className="text-right p-2 font-medium">Debit</th>
                                  <th className="text-right p-2 font-medium">Credit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.entries.map((entry: any) => (
                                  <tr key={entry.pieceNum} className="border-b hover:bg-muted/20">
                                    <td className="p-2">{entry.entryDate}</td>
                                    <td className="p-2 font-mono">{entry.pieceNum}</td>
                                    <td className="p-2">{entry.supplierName}</td>
                                    <td className="p-2">{entry.projectRef || '—'}</td>
                                    <td className="p-2 text-right font-mono">{formatSAR(entry.totalDebit)}</td>
                                    <td className="p-2 text-right font-mono">{formatSAR(entry.totalCredit)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Standard Journal Entries List */}
          {!report.groupBy && report.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Journal Entries
                  </div>
                  {report.pagination && (
                    <span className="text-sm font-normal text-muted-foreground">
                      Showing {report.data.length} of {report.pagination.total}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.data.map((entry: any) => {
                    const isExpanded = expandedEntries.has(entry.pieceNum);
                    return (
                      <div key={entry.pieceNum} className="border rounded-lg">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30"
                          onClick={() => toggleEntry(entry.pieceNum)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-medium">{entry.pieceNum}</span>
                              <span className="text-xs text-muted-foreground">{entry.entryDate}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{entry.supplierName}</span>
                              {entry.projectRef && (
                                <span className="text-xs text-muted-foreground">{entry.projectRef}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-mono">
                                <span className="text-green-600">DR: {formatSAR(entry.totalDebit)}</span>
                              </div>
                              <div className="text-sm font-mono">
                                <span className="text-red-600">CR: {formatSAR(entry.totalCredit)}</span>
                              </div>
                            </div>
                            {entry.isBalanced 
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : <AlertCircle className="h-4 w-4 text-yellow-500" />
                            }
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t bg-muted/10">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30">
                                  <th className="text-left p-2 font-medium">Account</th>
                                  <th className="text-left p-2 font-medium">Category</th>
                                  <th className="text-left p-2 font-medium">Description</th>
                                  <th className="text-right p-2 font-medium">Debit</th>
                                  <th className="text-right p-2 font-medium">Credit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entry.lines.map((line: any, idx: number) => (
                                  <tr key={idx} className="border-b hover:bg-muted/20">
                                    <td className="p-2">
                                      <div className="font-mono text-xs">{line.accountCode}</div>
                                      <div className="text-xs text-muted-foreground">{line.accountName}</div>
                                    </td>
                                    <td className="p-2">
                                      <Badge className={`text-xs ${CATEGORY_COLORS[line.costCategory] || CATEGORY_COLORS['Other / Unclassified']}`}>
                                        {line.costCategory}
                                      </Badge>
                                    </td>
                                    <td className="p-2 text-xs max-w-[200px] truncate" title={line.description}>
                                      {line.description}
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                      {line.debit > 0 ? <span className="text-green-600">{formatSAR(line.debit)}</span> : '—'}
                                    </td>
                                    <td className="p-2 text-right font-mono">
                                      {line.credit > 0 ? <span className="text-red-600">{formatSAR(line.credit)}</span> : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-muted/50 font-semibold">
                                  <td colSpan={3} className="p-2 text-right">Total</td>
                                  <td className="p-2 text-right font-mono text-green-600">{formatSAR(entry.totalDebit)}</td>
                                  <td className="p-2 text-right font-mono text-red-600">{formatSAR(entry.totalCredit)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
