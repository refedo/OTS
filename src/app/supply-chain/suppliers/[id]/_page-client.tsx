'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Factory, ArrowLeft, Mail, Phone, MapPin, Building2, ChevronRight,
  ShieldCheck, ShieldAlert, ShieldOff, Shield, ClipboardList, CreditCard,
  FileText, ShoppingCart, Banknote, BarChart3, Plus, Pencil, ClipboardCheck,
  AlertTriangle, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentTermsBadge } from '@/components/supply-chain/PaymentTermsBadge';
import { SoaTabContent } from '@/components/supply-chain/SoaTabContent';
import { EvaluationScoreForm, EMPTY_EVALUATION_FORM, EvaluationFormData } from '@/components/supply-chain/EvaluationScoreForm';
import { computeWeightedScore, scoreToRating, ratingToOutcome } from '@/lib/services/supply-chain/supplier-portal.service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SupplierOverview {
  dolibarr_id: number;
  name: string;
  name_alias: string | null;
  code_supplier: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  town: string | null;
  country_code: string | null;
  tva_intra: string | null;
  credit_limit: number | null;
  contacts: Contact[];
  approved_supplier: ApprovedSupplier | null;
  active_payment_terms: PaymentTermsRow | null;
  coa_ap_account: CoaAccount | null;
  coa_cogs_account: CoaAccount | null;
  cost_category: string | null;
  evaluation_count: number;
}

interface Contact {
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone_pro: string | null;
  phone_mobile: string | null;
  poste: string | null;
}

interface ApprovedSupplier {
  id: string;
  supplierCode: string;
  approvalStatus: string;
  rating: string | null;
  approvalDate: string | null;
  lastAuditDate: string | null;
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

interface CoaAccount {
  account_code: string;
  account_name: string | null;
  account_name_ar: string | null;
}

interface InvoiceRow {
  dolibarr_id: number;
  ref: string;
  ref_supplier: string | null;
  date_invoice: string;
  date_due: string | null;
  total_ht: number;
  total_ttc: number;
  status: number;
  is_paid: number;
}

interface PaymentRow {
  dolibarr_ref: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  invoice_ref: string;
  ref_supplier: string | null;
}

interface PoRow {
  id: number;
  ref: string;
  statut: number;
  total_ht: number;
  total_ttc: number;
  date_commande: string;
  date_livraison: string | null;
}

interface EvaluationRow {
  id: string;
  evaluation_date: string;
  evaluation_period: string | null;
  score_quality: number;
  score_delivery: number;
  score_price: number;
  score_service: number;
  score_documentation: number;
  score_hse: number;
  weighted_score: number;
  rating: string;
  outcome: string;
  general_notes: string | null;
  evaluator_name: string | null;
  created_by_name: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  APPROVED:    'bg-green-100 text-green-700 border-green-200',
  CONDITIONAL: 'bg-amber-100 text-amber-700 border-amber-200',
  SUSPENDED:   'bg-red-100 text-red-700 border-red-200',
  REJECTED:    'bg-slate-100 text-slate-600 border-slate-200',
};

const RATING_STYLE: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-orange-100 text-orange-700',
  D: 'bg-red-100 text-red-700',
};

const PO_STATUS: Record<number, string> = {
  0: 'Draft', 1: 'Validated', 2: 'Approved', 3: 'Ordered',
  4: 'Partial', 5: 'Received', 6: 'Cancelled', 7: 'Refused',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('en-SA-u-ca-gregory', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function SupplierDetailClient({ supplierId }: { supplierId: number }) {
  const [overview, setOverview] = useState<SupplierOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}`);
    if (res.ok) setOverview(await res.json());
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  if (loading) return <PageSkeleton />;
  if (!overview) return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-4">
      <Factory className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">Supplier not found.</p>
      <Link href="/supply-chain/suppliers"><Button variant="outline">Back to Suppliers</Button></Link>
    </div>
  );

  const status = overview.approved_supplier?.approvalStatus;
  const rating = overview.approved_supplier?.rating;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <Link href="/supply-chain/suppliers"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white text-sm mb-5 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Suppliers
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <Factory className="h-8 w-8 text-indigo-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold">{overview.name}</h1>
                  {overview.code_supplier && (
                    <span className="font-mono text-xs bg-white/15 border border-white/20 px-2 py-0.5 rounded text-slate-300">
                      {overview.code_supplier}
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

            <div className="flex flex-wrap items-center gap-2">
              {status ? (
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-600'}`}>
                  <ShieldCheck className="h-3.5 w-3.5" /> {status}
                </span>
              ) : null}
              {rating ? (
                <span className={`inline-block font-bold text-sm px-3 py-1.5 rounded-full ${RATING_STYLE[rating] ?? 'bg-slate-100 text-slate-600'}`}>
                  Rating {rating}
                </span>
              ) : null}
              {overview.evaluation_count === 0 && (
                <EvaluateButton supplierId={supplierId} supplierName={overview.name} onComplete={fetchOverview} />
              )}
            </div>
          </div>

          {/* Stat chips */}
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { label: 'Net Days', value: overview.active_payment_terms ? `${overview.active_payment_terms.net_days} days` : 'Not set' },
              { label: 'Credit Limit', value: overview.credit_limit ? fmt(overview.credit_limit) : 'Unlimited' },
              { label: 'Last Evaluated', value: overview.approved_supplier?.lastAuditDate ? fmtDate(overview.approved_supplier.lastAuditDate) : 'Never' },
              { label: 'Evaluations', value: overview.evaluation_count.toString() },
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
            <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="payment-terms"><CreditCard className="h-4 w-4 mr-1.5" />Payment Terms</TabsTrigger>
            <TabsTrigger value="credit-limit"><Banknote className="h-4 w-4 mr-1.5" />Credit Limit</TabsTrigger>
            <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1.5" />Invoices</TabsTrigger>
            <TabsTrigger value="pos"><ShoppingCart className="h-4 w-4 mr-1.5" />Purchase Orders</TabsTrigger>
            <TabsTrigger value="payments"><Banknote className="h-4 w-4 mr-1.5" />Payments</TabsTrigger>
            <TabsTrigger value="soa"><BarChart3 className="h-4 w-4 mr-1.5" />Statement</TabsTrigger>
            <TabsTrigger value="evaluations"><ClipboardCheck className="h-4 w-4 mr-1.5" />Evaluations</TabsTrigger>
            <TabsTrigger value="coa"><ClipboardList className="h-4 w-4 mr-1.5" />CoA & COGS</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab overview={overview} />
          </TabsContent>
          <TabsContent value="payment-terms">
            <PaymentTermsTab supplierId={supplierId} />
          </TabsContent>
          <TabsContent value="credit-limit">
            <CreditLimitTab supplierId={supplierId} />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab supplierId={supplierId} />
          </TabsContent>
          <TabsContent value="pos">
            <PurchaseOrdersTab supplierId={supplierId} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab supplierId={supplierId} />
          </TabsContent>
          <TabsContent value="soa">
            <SoaTabContent
              thirdpartyId={supplierId}
              type="ap"
              apiBase={`/api/supply-chain/suppliers/${supplierId}/soa`}
            />
          </TabsContent>
          <TabsContent value="evaluations">
            <EvaluationsTab supplierId={supplierId} supplierName={overview.name} onEvaluated={fetchOverview} />
          </TabsContent>
          <TabsContent value="coa">
            <CoaTab supplierId={supplierId} initial={overview} onSaved={fetchOverview} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ overview }: { overview: SupplierOverview }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Contact Information</h3>
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
            <h4 className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4" /> Contacts</h4>
            {overview.contacts.map((c, i) => (
              <div key={i} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium">{[c.firstname, c.lastname].filter(Boolean).join(' ')}{c.poste ? ` · ${c.poste}` : ''}</p>
                {c.email && <p className="text-muted-foreground text-xs">{c.email}</p>}
                {(c.phone_pro || c.phone_mobile) && <p className="text-muted-foreground text-xs">{c.phone_pro ?? c.phone_mobile}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial + Accounts */}
      <div className="space-y-4">
        {/* Financial summary */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2"><Banknote className="h-4 w-4" /> Financial Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Credit Limit</p>
              <p className="font-semibold mt-0.5">{overview.credit_limit ? fmt(overview.credit_limit) : 'Unlimited'}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Approval Code</p>
              <p className="font-mono font-semibold mt-0.5 text-xs">{overview.approved_supplier?.supplierCode ?? '—'}</p>
            </div>
          </div>
          {overview.active_payment_terms && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Payment Terms:</span>
              <PaymentTermsBadge
                netDays={overview.active_payment_terms.net_days}
                discountDays={overview.active_payment_terms.discount_days}
                discountPercentage={overview.active_payment_terms.discount_percentage}
              />
            </div>
          )}
        </div>

        {/* Accounts card */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Accounting</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">AP Account (Accounts Payable)</p>
              {overview.coa_ap_account ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-slate-800">{overview.coa_ap_account.account_code}</span>
                  <span className="text-muted-foreground">— {overview.coa_ap_account.account_name ?? ''}</span>
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Not mapped</span>
              )}
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-1">COGS / Expense Account</p>
              {overview.coa_cogs_account ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-slate-800">{overview.coa_cogs_account.account_code}</span>
                  <span className="text-muted-foreground">— {overview.coa_cogs_account.account_name ?? ''}</span>
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Not mapped</span>
              )}
              {overview.cost_category && (
                <p className="mt-1.5"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{overview.cost_category}</span></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Terms Tab ───────────────────────────────────────────────────────

function PaymentTermsTab({ supplierId }: { supplierId: number }) {
  const [terms, setTerms] = useState<PaymentTermsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ net_days: '30', discount_days: '', discount_percentage: '', valid_from: new Date().toISOString().slice(0, 10), notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}/payment-terms`);
    if (res.ok) setTerms(await res.json());
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}/payment-terms`, {
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
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{fmtDate(t.valid_from)} → {t.valid_to ? fmtDate(t.valid_to) : 'Present'}</span>
                {t.notes && <span className="text-xs bg-muted px-2 py-0.5 rounded max-w-xs truncate">{t.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Payment Terms</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Net Days *</Label>
                <Input type="number" min="0" max="365" value={form.net_days} onChange={e => setForm(f => ({ ...f, net_days: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Effective From *</Label>
                <Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Discount Days</Label>
                <Input type="number" min="0" placeholder="e.g. 10" value={form.discount_days} onChange={e => setForm(f => ({ ...f, discount_days: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input type="number" min="0" step="0.5" placeholder="e.g. 2" value={form.discount_percentage} onChange={e => setForm(f => ({ ...f, discount_percentage: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional context…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.net_days || !form.valid_from}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Credit Limit Tab ────────────────────────────────────────────────────────

function CreditLimitTab({ supplierId }: { supplierId: number }) {
  const [history, setHistory] = useState<CreditLimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ credit_limit: '', valid_from: new Date().toISOString().slice(0, 10), notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}/credit-limit`);
    if (res.ok) setHistory(await res.json());
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.credit_limit || !form.valid_from) return;
    setSaving(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}/credit-limit`, {
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

// ─── Invoices Tab ─────────────────────────────────────────────────────────────

function InvoicesTab({ supplierId }: { supplierId: number }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/supply-chain/suppliers/${supplierId}/invoices?page=${page}&limit=20`)
      .then(r => r.json())
      .then(j => { setInvoices(j.invoices ?? []); setTotal(j.total ?? 0); })
      .finally(() => setLoading(false));
  }, [supplierId, page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Supplier Invoices <span className="text-muted-foreground font-normal text-sm">({total})</span></h3>
      </div>
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium">OTS Ref</th>
            <th className="px-4 py-2.5 text-left font-medium">Supplier Ref</th>
            <th className="px-4 py-2.5 text-left font-medium">Invoice Date</th>
            <th className="px-4 py-2.5 text-left font-medium">Due Date</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount HT</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount TTC</th>
            <th className="px-4 py-2.5 text-center font-medium">Status</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center"><div className="h-5 w-32 bg-muted animate-pulse rounded mx-auto" /></td></tr> :
             invoices.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No invoices found.</td></tr> :
             invoices.map(inv => (
              <tr key={inv.dolibarr_id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2 font-mono text-xs">{inv.ref}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{inv.ref_supplier ?? '—'}</td>
                <td className="px-4 py-2">{fmtDate(inv.date_invoice)}</td>
                <td className="px-4 py-2">{fmtDate(inv.date_due)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(inv.total_ht)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(inv.total_ttc)}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {inv.is_paid ? 'Paid' : 'Outstanding'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 20 && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page*20>=total} onClick={()=>setPage(p=>p+1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Purchase Orders Tab ──────────────────────────────────────────────────────

function PurchaseOrdersTab({ supplierId }: { supplierId: number }) {
  const [orders, setOrders] = useState<PoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/supply-chain/suppliers/${supplierId}/purchase-orders?limit=50`)
      .then(r => r.json())
      .then(j => { setOrders(j.orders ?? []); })
      .catch(() => setError('Failed to load purchase orders from Dolibarr.'))
      .finally(() => setLoading(false));
  }, [supplierId]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Purchase Orders</h3>
      {error && <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-4 py-3">{error}</p>}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium">PO Ref</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Order Date</th>
            <th className="px-4 py-2.5 text-left font-medium">Delivery Date</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount HT</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount TTC</th>
          </tr></thead>
          <tbody>
            {loading ? (
              Array.from({length:5}).map((_,i)=>(
                <tr key={i} className="border-b"><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded w-2/3"/></td></tr>
              ))
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No purchase orders found.</td></tr>
            ) : orders.map(po => (
              <tr key={po.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2 font-mono text-xs">{po.ref}</td>
                <td className="px-4 py-2"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{PO_STATUS[po.statut] ?? po.statut}</span></td>
                <td className="px-4 py-2">{fmtDate(po.date_commande)}</td>
                <td className="px-4 py-2">{fmtDate(po.date_livraison)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(po.total_ht)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{fmt(po.total_ttc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ supplierId }: { supplierId: number }) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/supply-chain/suppliers/${supplierId}/payments?page=${page}&limit=20`)
      .then(r => r.json())
      .then(j => { setPayments(j.payments ?? []); setTotal(j.total ?? 0); })
      .finally(() => setLoading(false));
  }, [supplierId, page]);

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
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center"><div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto"/></td></tr> :
             payments.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No payments found.</td></tr> :
             payments.map((p, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2">{fmtDate(p.payment_date)}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.dolibarr_ref}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.invoice_ref}{p.ref_supplier ? ` / ${p.ref_supplier}` : ''}</td>
                <td className="px-4 py-2"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{p.payment_method ?? '—'}</span></td>
                <td className="px-4 py-2 text-right tabular-nums font-medium text-green-700">{fmt(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 20 && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page*20>=total} onClick={()=>setPage(p=>p+1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Evaluations Tab ──────────────────────────────────────────────────────────

function EvaluateButton({ supplierId, supplierName, onComplete }: { supplierId: number; supplierName: string; onComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EvaluationFormData>({ ...EMPTY_EVALUATION_FORM });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        score_quality:       form.score_quality,
        score_delivery:      form.score_delivery,
        score_price:         form.score_price,
        score_service:       form.score_service,
        score_documentation: form.score_documentation,
        score_hse:           form.score_hse,
        notes_quality:       form.notes_quality || null,
        notes_delivery:      form.notes_delivery || null,
        notes_price:         form.notes_price || null,
        notes_service:       form.notes_service || null,
        notes_documentation: form.notes_documentation || null,
        notes_hse:           form.notes_hse || null,
        general_notes:       form.general_notes || null,
        evaluation_period:   form.evaluation_period || null,
      }),
    });
    setSaving(false);
    if (res.ok) { setOpen(false); onComplete(); }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        <ClipboardCheck className="h-4 w-4 mr-1.5" /> Evaluate This Supplier
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Supplier Evaluation — HEXA-FRM-002</DialogTitle>
            <p className="text-sm text-muted-foreground">ISO 9001:2015 §8.4 · {supplierName}</p>
          </DialogHeader>
          <EvaluationScoreForm value={form} onChange={setForm} />
          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Evaluation'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EvaluationsTab({ supplierId, supplierName, onEvaluated }: { supplierId: number; supplierName: string; onEvaluated: () => void }) {
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEvalOpen, setNewEvalOpen] = useState(false);
  const [form, setForm] = useState<EvaluationFormData>({ ...EMPTY_EVALUATION_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}/evaluations`);
    if (res.ok) setEvaluations(await res.json());
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    setSaving(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        notes_quality: form.notes_quality || null,
        notes_delivery: form.notes_delivery || null,
        notes_price: form.notes_price || null,
        notes_service: form.notes_service || null,
        notes_documentation: form.notes_documentation || null,
        notes_hse: form.notes_hse || null,
        general_notes: form.general_notes || null,
        evaluation_period: form.evaluation_period || null,
      }),
    });
    setSaving(false);
    if (res.ok) { setNewEvalOpen(false); load(); onEvaluated(); }
  }

  const OUTCOME_STYLE: Record<string, string> = {
    APPROVED:    'bg-green-100 text-green-700',
    CONDITIONAL: 'bg-amber-100 text-amber-700',
    SUSPENDED:   'bg-orange-100 text-orange-700',
    REJECTED:    'bg-red-100 text-red-700',
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading evaluations…</div>;

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5 rounded-xl border border-dashed">
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
          <ClipboardCheck className="h-10 w-10 text-indigo-500" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">No evaluations yet</p>
          <p className="text-muted-foreground text-sm mt-1">Complete a Form-002 evaluation to add this supplier to the approved list.</p>
        </div>
        <Button onClick={() => setNewEvalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <ClipboardCheck className="h-4 w-4 mr-1.5" /> Evaluate This Supplier
        </Button>
        <EvaluationDialog open={newEvalOpen} onOpenChange={setNewEvalOpen} supplierName={supplierName} form={form} setForm={setForm} onSubmit={submit} saving={saving} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Evaluation History <span className="text-muted-foreground font-normal text-sm">({evaluations.length})</span></h3>
        <Button size="sm" onClick={() => setNewEvalOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Evaluation</Button>
      </div>

      <div className="space-y-4">
        {evaluations.map(ev => (
          <div key={ev.id} className="rounded-xl border p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{fmtDate(ev.evaluation_date)}{ev.evaluation_period ? ` · ${ev.evaluation_period}` : ''}</p>
                <p className="text-xs text-muted-foreground">Evaluator: {ev.evaluator_name ?? ev.created_by_name ?? 'Unknown'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tabular-nums">{Number(ev.weighted_score).toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
                <span className={`font-bold text-lg px-2.5 py-1 rounded-lg ${RATING_STYLE[ev.rating] ?? 'bg-slate-100 text-slate-600'}`}>{ev.rating}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${OUTCOME_STYLE[ev.outcome] ?? 'bg-slate-100 text-slate-600'}`}>{ev.outcome}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: 'Quality', score: ev.score_quality, w: '25%' },
                { label: 'Delivery', score: ev.score_delivery, w: '20%' },
                { label: 'Price', score: ev.score_price, w: '20%' },
                { label: 'Service', score: ev.score_service, w: '15%' },
                { label: 'Docs', score: ev.score_documentation, w: '15%' },
                { label: 'HSE', score: ev.score_hse, w: '5%' },
              ].map(c => (
                <div key={c.label} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="font-bold text-lg">{c.score}</p>
                  <p className="text-xs text-muted-foreground">{c.w}</p>
                </div>
              ))}
            </div>
            {ev.general_notes && (
              <p className="text-sm text-muted-foreground border-t pt-3 italic">"{ev.general_notes}"</p>
            )}
          </div>
        ))}
      </div>

      <EvaluationDialog open={newEvalOpen} onOpenChange={setNewEvalOpen} supplierName={supplierName} form={form} setForm={setForm} onSubmit={submit} saving={saving} />
    </div>
  );
}

function EvaluationDialog({ open, onOpenChange, supplierName, form, setForm, onSubmit, saving }: {
  open: boolean; onOpenChange: (v: boolean) => void; supplierName: string;
  form: EvaluationFormData; setForm: (f: EvaluationFormData) => void;
  onSubmit: () => void; saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Evaluation — HEXA-FRM-002</DialogTitle>
          <p className="text-sm text-muted-foreground">ISO 9001:2015 §8.4 · {supplierName}</p>
        </DialogHeader>
        <EvaluationScoreForm value={form} onChange={setForm} />
        <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving ? 'Submitting…' : 'Submit Evaluation'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CoA & COGS Tab ───────────────────────────────────────────────────────────

function CoaTab({ supplierId, initial, onSaved }: { supplierId: number; initial: SupplierOverview; onSaved: () => void }) {
  const [accounts, setAccounts] = useState<{account_code: string; account_name: string}[]>([]);
  const [ap, setAp] = useState(initial.coa_ap_account?.account_code ?? '');
  const [cogs, setCogs] = useState(initial.coa_cogs_account?.account_code ?? '');
  const [category, setCategory] = useState(initial.cost_category ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/financial/chart-of-accounts')
      .then(r => r.json())
      .then(j => setAccounts((j.accounts ?? j) as {account_code: string; account_name: string}[]));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/supply-chain/suppliers/${supplierId}/coa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ap_account_code: ap || null, cogs_account_code: cogs || null, cost_category: category || null, ap_notes: notes || null }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved(); }
  }

  const AccountSelect = ({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || '__none__'} onValueChange={v => onChange(v === '__none__' ? '' : v)}>
        <SelectTrigger className="font-mono">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Not mapped —</SelectItem>
          {accounts.map(a => (
            <SelectItem key={a.account_code} value={a.account_code}>
              {a.account_code} — {a.account_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="max-w-xl space-y-5">
      <h3 className="font-semibold">Chart of Accounts Mapping</h3>
      <AccountSelect value={ap} onChange={setAp} label="AP Account (Accounts Payable)" placeholder="Select AP account…" />
      <AccountSelect value={cogs} onChange={setCogs} label="COGS / Expense Account" placeholder="Select COGS account…" />
      <div className="space-y-1.5">
        <Label>Cost Category</Label>
        <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Raw Materials, Services, Subcontracting" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional mapping notes…" />
      </div>
      <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Mapping'}</Button>
    </div>
  );
}

// ─── Page Skeleton ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-48 bg-gradient-to-br from-slate-900 to-indigo-900 animate-pulse" />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse w-2/3" />
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    </div>
  );
}
