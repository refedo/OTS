'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users, ArrowLeft, Mail, Phone, MapPin, CreditCard, FileText, Banknote, BarChart3, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PaymentTermsBadge } from '@/components/supply-chain/PaymentTermsBadge';
import { SoaTabContent } from '@/components/supply-chain/SoaTabContent';

interface CustomerOverview {
  dolibarr_id: number;
  name: string;
  code_client: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  town: string | null;
  country_code: string | null;
  tva_intra: string | null;
  credit_limit: number | null;
  contacts: Contact[];
  active_payment_terms: PaymentTermsRow | null;
}

interface Contact {
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone_pro: string | null;
  phone_mobile: string | null;
  poste: string | null;
}

interface PaymentTermsRow {
  id: number;
  net_days: number;
  discount_days: number | null;
  discount_percentage: number | null;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  created_at: string;
}

interface CreditLimitRow {
  id: number;
  credit_limit: number;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  created_at: string;
}

interface InvoiceRow {
  dolibarr_id: number;
  ref: string;
  ref_client: string | null;
  date_invoice: string;
  date_due: string | null;
  total_ht: number;
  total_ttc: number;
  is_paid: number;
}

interface PaymentRow {
  dolibarr_ref: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  invoice_ref: string;
  ref_client: string | null;
}

interface ProjectRow {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  contractValue: string | null;
  contractDate: string | null;
  plannedEndDate: string | null;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-SA-u-ca-gregory', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PROJECT_STATUS_STYLE: Record<string, string> = {
  Active:    'bg-green-100 text-green-700',
  Completed: 'bg-slate-100 text-slate-600',
  'On Hold': 'bg-amber-100 text-amber-700',
  Draft:     'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-600',
};

export function CustomerDetailClient({ customerId }: { customerId: number }) {
  const [overview, setOverview] = useState<CustomerOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/financial/customers/${customerId}`);
    if (res.ok) setOverview(await res.json());
    setLoading(false);
  }, [customerId]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <div className="h-48 bg-gradient-to-br from-slate-900 to-cyan-900 animate-pulse" />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-8 bg-muted rounded animate-pulse w-1/2 mb-4" />
        <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-muted rounded-xl animate-pulse"/>)}</div>
      </div>
    </div>
  );

  if (!overview) return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-4">
      <Users className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">Customer not found.</p>
      <Link href="/financial/customers"><Button variant="outline">Back to Customers</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <Link href="/financial/customers"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white text-sm mb-5 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <Users className="h-8 w-8 text-cyan-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold">{overview.name}</h1>
                  {overview.code_client && (
                    <span className="font-mono text-xs bg-white/15 border border-white/20 px-2 py-0.5 rounded text-slate-300">
                      {overview.code_client}
                    </span>
                  )}
                </div>
                {overview.town && (
                  <p className="text-slate-400 text-sm flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[overview.town, overview.country_code].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stat chips */}
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { label: 'Net Days', value: overview.active_payment_terms ? `${overview.active_payment_terms.net_days} days` : 'Not set' },
              { label: 'Credit Limit', value: overview.credit_limit ? fmt(overview.credit_limit) : 'Unlimited' },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2">
                <span className="text-xs text-slate-400">{c.label}</span>
                <span className="text-sm font-semibold">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview"><Users className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="payment-terms"><CreditCard className="h-4 w-4 mr-1.5" />Payment Terms</TabsTrigger>
            <TabsTrigger value="credit-limit"><Banknote className="h-4 w-4 mr-1.5" />Credit Limit</TabsTrigger>
            <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1.5" />Invoices</TabsTrigger>
            <TabsTrigger value="payments"><Banknote className="h-4 w-4 mr-1.5" />Payments</TabsTrigger>
            <TabsTrigger value="soa"><BarChart3 className="h-4 w-4 mr-1.5" />Statement</TabsTrigger>
            <TabsTrigger value="projects"><FolderOpen className="h-4 w-4 mr-1.5" />Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><CustOverviewTab overview={overview} /></TabsContent>
          <TabsContent value="payment-terms"><CustPaymentTermsTab customerId={customerId} /></TabsContent>
          <TabsContent value="credit-limit"><CustCreditLimitTab customerId={customerId} /></TabsContent>
          <TabsContent value="invoices"><CustInvoicesTab customerId={customerId} /></TabsContent>
          <TabsContent value="payments"><CustPaymentsTab customerId={customerId} /></TabsContent>
          <TabsContent value="soa">
            <SoaTabContent thirdpartyId={customerId} type="ar" apiBase={`/api/financial/customers/${customerId}/soa`} />
          </TabsContent>
          <TabsContent value="projects"><CustProjectsTab customerId={customerId} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CustOverviewTab({ overview }: { overview: CustomerOverview }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Contact Information</h3>
        <div className="space-y-2.5 text-sm">
          {overview.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${overview.email}`} className="text-blue-600 hover:underline">{overview.email}</a></div>}
          {overview.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{overview.phone}</div>}
          {(overview.address || overview.town) && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{[overview.address, overview.zip, overview.town, overview.country_code].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {overview.tva_intra && <div className="text-muted-foreground">VAT: <span className="font-mono">{overview.tva_intra}</span></div>}
        </div>
        {overview.contacts.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium">Contacts</h4>
            {overview.contacts.map((c, i) => (
              <div key={i} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium">{[c.firstname, c.lastname].filter(Boolean).join(' ')}{c.poste ? ` · ${c.poste}` : ''}</p>
                {c.email && <p className="text-muted-foreground text-xs">{c.email}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Financial Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Credit Limit</p>
            <p className="font-semibold mt-0.5">{overview.credit_limit ? fmt(overview.credit_limit) : 'Unlimited'}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Client Code</p>
            <p className="font-mono font-semibold mt-0.5 text-xs">{overview.code_client ?? '—'}</p>
          </div>
        </div>
        {overview.active_payment_terms && (
          <div className="flex items-center gap-2 text-sm pt-1">
            <span className="text-muted-foreground">Payment Terms:</span>
            <PaymentTermsBadge
              netDays={overview.active_payment_terms.net_days}
              discountDays={overview.active_payment_terms.discount_days}
              discountPercentage={overview.active_payment_terms.discount_percentage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CustPaymentTermsTab({ customerId }: { customerId: number }) {
  const [terms, setTerms] = useState<PaymentTermsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ net_days: '30', discount_days: '', discount_percentage: '', valid_from: new Date().toISOString().slice(0, 10), notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/financial/customers/${customerId}/payment-terms`);
    if (res.ok) setTerms(await res.json());
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/financial/customers/${customerId}/payment-terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        net_days: parseInt(form.net_days),
        discount_days: form.discount_days ? parseInt(form.discount_days) : null,
        discount_percentage: form.discount_percentage ? parseFloat(form.discount_percentage) : null,
        valid_from: form.valid_from,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) { setDialog(false); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Payment Terms History</h3>
        <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-1.5" />Add Terms</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : terms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-xl border">No payment terms on record.</div>
      ) : (
        <div className="space-y-3">
          {terms.map(t => (
            <div key={t.id} className={`rounded-xl border px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${!t.valid_to ? 'border-blue-200 bg-blue-50/50' : ''}`}>
              <div className="flex items-center gap-3">
                {!t.valid_to && <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Current</span>}
                <PaymentTermsBadge netDays={t.net_days} discountDays={t.discount_days} discountPercentage={t.discount_percentage} />
              </div>
              <span className="text-sm text-muted-foreground">{fmtDate(t.valid_from)} → {t.valid_to ? fmtDate(t.valid_to) : 'Present'}</span>
            </div>
          ))}
        </div>
      )}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Payment Terms</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Net Days *</Label><Input type="number" min="0" max="365" value={form.net_days} onChange={e=>setForm(f=>({...f,net_days:e.target.value}))}/></div>
              <div className="space-y-1.5"><Label>Effective From *</Label><Input type="date" value={form.valid_from} onChange={e=>setForm(f=>({...f,valid_from:e.target.value}))}/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Discount Days</Label><Input type="number" min="0" placeholder="e.g. 10" value={form.discount_days} onChange={e=>setForm(f=>({...f,discount_days:e.target.value}))}/></div>
              <div className="space-y-1.5"><Label>Discount %</Label><Input type="number" min="0" step="0.5" placeholder="e.g. 2" value={form.discount_percentage} onChange={e=>setForm(f=>({...f,discount_percentage:e.target.value}))}/></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional…"/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving||!form.net_days||!form.valid_from}>{saving?'Saving…':'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustCreditLimitTab({ customerId }: { customerId: number }) {
  const [history, setHistory] = useState<CreditLimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ credit_limit: '', valid_from: new Date().toISOString().slice(0, 10), notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/financial/customers/${customerId}/credit-limit`);
    if (res.ok) setHistory(await res.json());
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.credit_limit || !form.valid_from) return;
    setSaving(true);
    const res = await fetch(`/api/financial/customers/${customerId}/credit-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credit_limit: parseFloat(form.credit_limit),
        valid_from: form.valid_from,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) { setDialog(false); setForm({ credit_limit: '', valid_from: new Date().toISOString().slice(0, 10), notes: '' }); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Credit Limit History</h3>
        <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-1.5" />Set Credit Limit</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-xl border">No credit limit history on record.</div>
      ) : (
        <div className="space-y-3">
          {history.map(r => (
            <div key={r.id} className={`rounded-xl border px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${!r.valid_to ? 'border-emerald-200 bg-emerald-50/50' : ''}`}>
              <div className="flex items-center gap-3">
                {!r.valid_to && <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Current</span>}
                <span className="font-bold text-base">{fmt(r.credit_limit)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{fmtDate(r.valid_from)} → {r.valid_to ? fmtDate(r.valid_to) : 'Present'}</span>
                {r.notes && <span className="text-xs bg-muted px-2 py-0.5 rounded max-w-xs truncate">{r.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Set Credit Limit</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Credit Limit (SAR) *</Label>
                <Input type="number" min="0" step="1000" placeholder="e.g. 500000" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Effective From *</Label>
                <Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for change…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.credit_limit || !form.valid_from}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustInvoicesTab({ customerId }: { customerId: number }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/financial/customers/${customerId}/invoices?page=${page}&limit=20`)
      .then(r=>r.json()).then(j=>{setInvoices(j.invoices??[]);setTotal(j.total??0);}).finally(()=>setLoading(false));
  }, [customerId, page]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Customer Invoices <span className="text-muted-foreground font-normal text-sm">({total})</span></h3>
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium">OTS Ref</th>
            <th className="px-4 py-2.5 text-left font-medium">Client Ref</th>
            <th className="px-4 py-2.5 text-left font-medium">Invoice Date</th>
            <th className="px-4 py-2.5 text-left font-medium">Due Date</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount HT</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount TTC</th>
            <th className="px-4 py-2.5 text-center font-medium">Status</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center"><div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto"/></td></tr>
            : invoices.length===0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No invoices found.</td></tr>
            : invoices.map(inv=>(
              <tr key={inv.dolibarr_id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2 font-mono text-xs">{inv.ref}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{inv.ref_client??'—'}</td>
                <td className="px-4 py-2">{fmtDate(inv.date_invoice)}</td>
                <td className="px-4 py-2">{fmtDate(inv.date_due)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(inv.total_ht)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(inv.total_ttc)}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.is_paid?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                    {inv.is_paid?'Paid':'Outstanding'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total>20&&(<div className="flex justify-between text-sm text-muted-foreground"><span>{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</Button><Button variant="outline" size="sm" disabled={page*20>=total} onClick={()=>setPage(p=>p+1)}>Next</Button></div></div>)}
    </div>
  );
}

function CustPaymentsTab({ customerId }: { customerId: number }) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/financial/customers/${customerId}/payments?page=${page}&limit=20`)
      .then(r=>r.json()).then(j=>{setPayments(j.payments??[]);setTotal(j.total??0);}).finally(()=>setLoading(false));
  }, [customerId, page]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Payments <span className="text-muted-foreground font-normal text-sm">({total})</span></h3>
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium">Date</th>
            <th className="px-4 py-2.5 text-left font-medium">Reference</th>
            <th className="px-4 py-2.5 text-left font-medium">For Invoice</th>
            <th className="px-4 py-2.5 text-left font-medium">Method</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={5} className="px-4 py-8 text-center"><div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto"/></td></tr>
            :payments.length===0?<tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No payments found.</td></tr>
            :payments.map((p,i)=>(
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2">{fmtDate(p.payment_date)}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.dolibarr_ref}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.invoice_ref}</td>
                <td className="px-4 py-2"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{p.payment_method??'—'}</span></td>
                <td className="px-4 py-2 text-right tabular-nums font-medium text-green-700">{fmt(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total>20&&(<div className="flex justify-between text-sm text-muted-foreground"><span>{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</Button><Button variant="outline" size="sm" disabled={page*20>=total} onClick={()=>setPage(p=>p+1)}>Next</Button></div></div>)}
    </div>
  );
}

function CustProjectsTab({ customerId }: { customerId: number }) {
  const [data, setData] = useState<{ projects: ProjectRow[]; matched: boolean; thirdpartyName?: string; clientName?: string; clientId?: string; linkType?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<{ id: string; name: string; dolibarrId: number | null }[]>([]);
  const [linking, setLinking] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [showLinkPanel, setShowLinkPanel] = useState(false);

  const loadProjects = useCallback(() => {
    setLoading(true);
    fetch(`/api/financial/customers/${customerId}/projects`)
      .then(r=>r.json()).then(setData).finally(()=>setLoading(false));
  }, [customerId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!showLinkPanel) return;
    fetch(`/api/financial/customers/${customerId}/link-client?search=${encodeURIComponent(linkSearch)}`)
      .then(r=>r.json()).then(setClients);
  }, [customerId, linkSearch, showLinkPanel]);

  async function linkClient(clientId: string) {
    setLinking(true);
    await fetch(`/api/financial/customers/${customerId}/link-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    });
    setLinking(false);
    setShowLinkPanel(false);
    loadProjects();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Linked Projects</h3>
        <Button size="sm" variant="outline" onClick={() => setShowLinkPanel(v => !v)}>
          {showLinkPanel ? 'Cancel' : 'Link OTS Client'}
        </Button>
      </div>

      {showLinkPanel && (
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Search for an OTS client to permanently link to this Dolibarr customer.</p>
          <Input placeholder="Search clients…" value={linkSearch} onChange={e => setLinkSearch(e.target.value)} />
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {clients.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/60">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.dolibarrId && <p className="text-xs text-muted-foreground">Already linked to Dolibarr #{c.dolibarrId}</p>}
                </div>
                <Button size="sm" disabled={linking} onClick={() => linkClient(c.id)}>Link</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.linkType === 'name' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Matched by company name: "{data.thirdpartyName}" → "{data.clientName}". Use "Link OTS Client" above for a permanent link.
        </div>
      )}
      {data?.linkType === 'direct' && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          Directly linked to OTS client "{data.clientName}".
        </div>
      )}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-12 bg-muted animate-pulse rounded-lg"/>)}</div>
      ) : !data?.matched || data.projects.length===0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-xl border">No linked projects found.</div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium">Project No.</th>
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Contract Value</th>
              <th className="px-4 py-2.5 text-left font-medium">End Date</th>
              <th className="px-4 py-2.5"/>
            </tr></thead>
            <tbody>
              {data.projects.map(p=>(
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{p.projectNumber}</td>
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_STATUS_STYLE[p.status]??'bg-slate-100 text-slate-600'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.contractValue?fmt(Number(p.contractValue)):'—'}</td>
                  <td className="px-4 py-2">{fmtDate(p.plannedEndDate)}</td>
                  <td className="px-4 py-2">
                    <Link href={`/projects/${p.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
