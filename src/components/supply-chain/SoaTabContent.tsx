'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Info } from 'lucide-react';

interface SoaLine {
  date: string;
  dateDue?: string;
  ref: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
  remainToPay?: number;
}

interface ActivePaymentTerms {
  net_days: number;
  discount_days: number | null;
  discount_percentage: number | null;
  valid_from: string;
}

interface SoaData {
  thirdpartyId: number;
  thirdpartyName: string;
  type: 'ar' | 'ap';
  fromDate: string;
  toDate: string;
  lines: SoaLine[];
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  creditLimit: number | null;
  activePaymentTerms: ActivePaymentTerms | null;
}

interface Props {
  thirdpartyId: number;
  type: 'ar' | 'ap';
  apiBase: string; // e.g. '/api/supply-chain/suppliers/123/soa'
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-SA-u-ca-gregory', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });

export function SoaTabContent({ thirdpartyId, type, apiBase }: Props) {
  const currentYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${currentYear}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<SoaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}?from=${from}&to=${to}`);
      if (!res.ok) throw new Error('Failed to load statement of account');
      setData(await res.json());
    } catch {
      setError('Failed to load. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function exportCsv() {
    if (!data) return;
    const header = 'Date,Reference,Type,Debit (SAR),Credit (SAR),Balance (SAR)';
    const rows = data.lines.map(l =>
      `${l.date},${l.ref},${l.type},${l.debit.toFixed(2)},${l.credit.toFixed(2)},${l.balance.toFixed(2)}`
    );
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `SoA_${data.thirdpartyName}_${from}_${to}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
        {data && (
          <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto">
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Payment terms banner */}
      {data?.activePaymentTerms && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <span className="font-medium">Current Payment Terms: </span>
            Net {data.activePaymentTerms.net_days} days
            {data.activePaymentTerms.discount_days && data.activePaymentTerms.discount_percentage
              ? ` · ${data.activePaymentTerms.discount_percentage}% discount if paid within ${data.activePaymentTerms.discount_days} days`
              : ''}
            <span className="text-blue-600 ml-2">(effective {fmtDate(data.activePaymentTerms.valid_from)})</span>
          </div>
        </div>
      )}
      {data && !data.activePaymentTerms && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
          <Info className="h-4 w-4 text-slate-400 shrink-0" />
          <p className="text-sm text-slate-500">No payment terms on record for this {type === 'ap' ? 'supplier' : 'customer'}.</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-4 py-3">{error}</p>
      )}

      {data && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: type === 'ap' ? 'Total Invoiced (AP)' : 'Total Invoiced (AR)', value: data.totalInvoiced, color: 'text-slate-800' },
              { label: 'Total Paid', value: data.totalPaid, color: 'text-green-700' },
              { label: 'Outstanding Balance', value: data.balance, color: data.balance > 0 ? 'text-red-700' : 'text-green-700' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-lg font-bold tabular-nums ${s.color}`}>{fmt(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Ledger table */}
          {data.lines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No transactions found for the selected period.</div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-medium">Date</th>
                    <th className="px-3 py-2.5 text-left font-medium">Reference</th>
                    <th className="px-3 py-2.5 text-left font-medium">Type</th>
                    <th className="px-3 py-2.5 text-right font-medium">Debit</th>
                    <th className="px-3 py-2.5 text-right font-medium">Credit</th>
                    <th className="px-3 py-2.5 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">{fmtDate(line.date)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{line.ref}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          line.type === 'Invoice' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {line.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {line.debit > 0 ? fmt(line.debit) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {line.credit > 0 ? fmt(line.credit) : '—'}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${line.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {fmt(Math.abs(line.balance))}
                        {line.balance !== 0 && (
                          <span className="text-xs font-normal ml-0.5">{line.balance > 0 ? 'DR' : 'CR'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {loading && !data && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
