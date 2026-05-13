'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Landmark, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function formatSAR(v: number) {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);
}
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BankTransactionsPage({ bankId }: { bankId: number }) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/financial/bank-accounts/${bankId}/transactions?page=${page}&limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [bankId, page]);

  const acct = data?.account;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative container mx-auto px-6 lg:px-8 pt-6 pb-8 max-lg:pt-20">
          <div className="flex items-center gap-2 mb-5">
            <Link href="/financial">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10 gap-1">
                <ArrowLeft className="size-4" /> Financial
              </Button>
            </Link>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hidden sm:flex">
              <Landmark className="size-8 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm bg-white/15 border border-white/20 px-2.5 py-0.5 rounded text-slate-200">
                  {acct?.ref ?? '…'}
                </span>
                {acct && (
                  <Badge variant={acct.isOpen ? 'default' : 'secondary'} className="text-xs">
                    {acct.isOpen ? 'Active' : 'Closed'}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {acct?.label ?? 'Bank Account'}
              </h1>
              <p className="text-slate-400 mt-1 text-sm">{acct?.bankName}</p>
            </div>
          </div>
          {acct && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
                <Landmark className="size-4 text-blue-300" />
                <span className="text-xs text-slate-400">Current Balance</span>
                <span className="text-sm font-bold">{formatSAR(acct.balance)}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
                <TrendingUp className="size-4 text-green-400" />
                <span className="text-xs text-slate-400">Transactions</span>
                <span className="text-sm font-bold">{data?.pagination?.total ?? '—'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto p-6 lg:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="size-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : !data?.transactions?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                No transactions found for this account.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Reference</th>
                        <th className="text-left p-3">Party</th>
                        <th className="text-left p-3">Invoice</th>
                        <th className="text-left p-3">Method</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-right p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t: any) => (
                        <tr key={t.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 whitespace-nowrap">{formatDate(t.payment_date)}</td>
                          <td className="p-3 font-mono text-xs">{t.dolibarr_ref || '—'}</td>
                          <td className="p-3 max-w-[200px] truncate">{t.party_name || '—'}</td>
                          <td className="p-3 font-mono text-xs">{t.invoice_ref || t.party_ref || '—'}</td>
                          <td className="p-3">{t.payment_method || '—'}</td>
                          <td className="p-3">
                            {t.payment_type === 'customer' ? (
                              <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 text-xs px-2 py-0.5 rounded-full font-medium">
                                <TrendingUp className="size-3" /> Collection
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 text-xs px-2 py-0.5 rounded-full font-medium">
                                <TrendingDown className="size-3" /> Payment
                              </span>
                            )}
                          </td>
                          <td className={`p-3 text-right font-semibold ${t.payment_type === 'customer' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.payment_type === 'customer' ? '+' : '-'}{formatSAR(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {data.pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} transactions)
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.pages}>
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
