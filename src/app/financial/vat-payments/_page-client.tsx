'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Trash2, Receipt, Edit, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAlert } from '@/hooks/useAlert';

function formatSAR(v: number) {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);
}
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
}

const EMPTY_FORM = {
  periodLabel: '',
  periodStart: '',
  periodEnd: '',
  paymentDate: '',
  amount: '',
  reference: '',
  notes: '',
};

export default function VatPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { showAlert, AlertDialog } = useAlert();

  const load = () => {
    setLoading(true);
    fetch('/api/financial/vat-payments')
      .then(r => r.ok ? r.json() : [])
      .then(d => setPayments(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/financial/sync?entities=vat_payments', { method: 'POST' });
      if (res.ok) {
        load();
      } else {
        const err = await res.json().catch(() => ({ error: 'Sync failed' }));
        showAlert(err.error || 'Sync failed', { type: 'error' });
      }
    } catch {
      showAlert('Sync failed', { type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const openNew = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditTarget(p);
    setForm({
      periodLabel: p.period_label || '',
      periodStart: p.period_start?.slice(0, 10) || '',
      periodEnd:   p.period_end?.slice(0, 10) || '',
      paymentDate: p.payment_date?.slice(0, 10) || '',
      amount:      String(p.amount || ''),
      reference:   p.reference || '',
      notes:       p.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.periodLabel || !form.periodStart || !form.periodEnd || !form.paymentDate || !form.amount) {
      showAlert('Please fill all required fields.', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        periodLabel: form.periodLabel,
        periodStart: form.periodStart,
        periodEnd:   form.periodEnd,
        paymentDate: form.paymentDate,
        amount:      parseFloat(form.amount),
        reference:   form.reference || null,
        notes:       form.notes || null,
      };
      const url = editTarget ? `/api/financial/vat-payments/${editTarget.id}` : '/api/financial/vat-payments';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        showAlert(err.error || 'Failed to save', { type: 'error' });
        return;
      }
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this VAT payment record?')) return;
    const res = await fetch(`/api/financial/vat-payments/${id}`, { method: 'DELETE' });
    if (res.ok) load();
    else showAlert('Failed to delete.', { type: 'error' });
  };

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 text-white">
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
              <Receipt className="size-8 text-orange-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">VAT Payments</h1>
              <p className="text-slate-400 mt-1 text-sm">ZATCA settlement payments — actual amounts paid to tax authority</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
              <Receipt className="size-4 text-orange-300" />
              <span className="text-xs text-slate-400">Total Paid</span>
              <span className="text-sm font-bold">{formatSAR(total)}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
              <span className="text-xs text-slate-400">Records</span>
              <span className="text-sm font-bold">{payments.length}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-1.5"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              {syncing ? 'Syncing from Dolibarr…' : 'Sync from Dolibarr'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 lg:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-5" /> VAT Payment History
            </CardTitle>
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4 mr-1" /> Add Payment
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !payments.length ? (
              <div className="text-center py-16 text-muted-foreground">
                No VAT payments recorded yet.
                <br />
                <Button variant="outline" size="sm" className="mt-4" onClick={openNew}>
                  <Plus className="size-4 mr-1" /> Add First Payment
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Period</th>
                      <th className="text-left p-3">Period Range</th>
                      <th className="text-left p-3">Payment Date</th>
                      <th className="text-left p-3">Reference</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="p-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-semibold">{p.period_label}</td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {formatDate(p.period_start)} — {formatDate(p.period_end)}
                        </td>
                        <td className="p-3">{formatDate(p.payment_date)}</td>
                        <td className="p-3 font-mono text-xs">{p.reference || '—'}</td>
                        <td className="p-3 text-right font-bold text-red-600">{formatSAR(Number(p.amount))}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                              <Edit className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td className="p-3" colSpan={4}>Total</td>
                      <td className="p-3 text-right text-red-600">{formatSAR(total)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit VAT Payment' : 'Record VAT Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Period Label <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Q1 2026" value={form.periodLabel} onChange={e => setForm(f => ({ ...f, periodLabel: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Period Start <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Period End <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (SAR) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>ZATCA Reference</Label>
              <Input placeholder="Reference number" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog />
    </div>
  );
}
