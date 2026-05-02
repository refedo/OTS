'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Plus, RefreshCw, Pencil, Trash2, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

type Supplier = {
  id: string;
  supplierCode: string;
  name: string;
  category: string | null;
  scopeOfApproval: string | null;
  approvalStatus: string;
  approvalDate: string | null;
  expiryDate: string | null;
  lastAuditDate: string | null;
  auditFrequencyDays: number | null;
  rating: string | null;
  notes: string | null;
  createdAt: string;
};

const STATUS_CFG: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  CONDITIONAL: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-slate-100 text-slate-500',
};

const RATING_CFG: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-red-100 text-red-700',
};

const EMPTY_FORM = {
  name: '',
  category: '',
  scopeOfApproval: '',
  approvalStatus: 'APPROVED',
  approvalDate: '',
  expiryDate: '',
  lastAuditDate: '',
  auditFrequencyDays: '',
  rating: 'A',
  notes: '',
};

export function ApprovedSuppliersClient() {
  const [records, setRecords] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = filterStatus ? `?approvalStatus=${filterStatus}` : '';
    const res = await fetch(`/api/supply-chain/approved-suppliers${params}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const kpi = {
    total: records.length,
    approved: records.filter(r => r.approvalStatus === 'APPROVED').length,
    conditional: records.filter(r => r.approvalStatus === 'CONDITIONAL').length,
    suspended: records.filter(r => r.approvalStatus === 'SUSPENDED').length,
    expired: records.filter(r => r.approvalStatus === 'EXPIRED').length,
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  }

  function openEdit(r: Supplier) {
    setEditing(r);
    setForm({
      name: r.name,
      category: r.category ?? '',
      scopeOfApproval: r.scopeOfApproval ?? '',
      approvalStatus: r.approvalStatus,
      approvalDate: r.approvalDate ? r.approvalDate.slice(0, 10) : '',
      expiryDate: r.expiryDate ? r.expiryDate.slice(0, 10) : '',
      lastAuditDate: r.lastAuditDate ? r.lastAuditDate.slice(0, 10) : '',
      auditFrequencyDays: r.auditFrequencyDays != null ? String(r.auditFrequencyDays) : '',
      rating: r.rating ?? 'A',
      notes: r.notes ?? '',
    });
    setDialog(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        approvalDate: form.approvalDate ? new Date(form.approvalDate).toISOString() : null,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        lastAuditDate: form.lastAuditDate ? new Date(form.lastAuditDate).toISOString() : null,
        auditFrequencyDays: form.auditFrequencyDays ? parseInt(form.auditFrequencyDays) : null,
      };
      const url = editing ? `/api/supply-chain/approved-suppliers/${editing.id}` : '/api/supply-chain/approved-suppliers';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchRecords(); }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Remove this supplier from the approved list?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/supply-chain/approved-suppliers/${id}`, { method: 'DELETE' });
      fetchRecords();
    } finally {
      setDeleting(null);
    }
  }

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold text-slate-900">Approved Supplier List</h1>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">HEXA-FRM-003</span>
          </div>
          <p className="text-sm text-slate-500">ISO 9001:2015 §8.4 — Control of externally provided processes, products and services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecords}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Supplier</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: kpi.total, color: 'text-slate-700', icon: <ShieldCheck className="h-4 w-4 text-slate-400" /> },
          { label: 'Approved', value: kpi.approved, color: 'text-green-700', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
          { label: 'Conditional', value: kpi.conditional, color: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> },
          { label: 'Suspended', value: kpi.suspended, color: 'text-red-700', icon: <XCircle className="h-4 w-4 text-red-400" /> },
          { label: 'Expired', value: kpi.expired, color: 'text-slate-500', icon: <Clock className="h-4 w-4 text-slate-400" /> },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">{k.icon}<span className="text-xs text-slate-500">{k.label}</span></div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        {['', 'APPROVED', 'CONDITIONAL', 'SUSPENDED', 'EXPIRED'].map(s => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)}>
            {s === '' ? 'All' : s}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No approved suppliers on record.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Code', 'Name', 'Category', 'Rating', 'Approval Date', 'Expiry Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.supplierCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.category ?? '—'}</td>
                      <td className="px-4 py-3">
                        {r.rating ? (
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${RATING_CFG[r.rating] ?? 'bg-gray-100 text-gray-600'}`}>
                            {r.rating}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.approvalDate ? new Date(r.approvalDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_CFG[r.approvalStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteRecord(r.id)} disabled={deleting === r.id}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Supplier' : 'Add Approved Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Supplier Name *</Label>
              <Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={e => f('category', e.target.value)} placeholder="e.g. Raw Material, Subcontractor" />
            </div>
            <div>
              <Label>Approval Status</Label>
              <Select value={form.approvalStatus} onValueChange={v => f('approvalStatus', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rating</Label>
              <Select value={form.rating} onValueChange={v => f('rating', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A — Excellent</SelectItem>
                  <SelectItem value="B">B — Satisfactory</SelectItem>
                  <SelectItem value="C">C — Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Approval Date</Label>
              <Input type="date" value={form.approvalDate} onChange={e => f('approvalDate', e.target.value)} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={e => f('expiryDate', e.target.value)} />
            </div>
            <div>
              <Label>Last Audit Date</Label>
              <Input type="date" value={form.lastAuditDate} onChange={e => f('lastAuditDate', e.target.value)} />
            </div>
            <div>
              <Label>Audit Frequency (days)</Label>
              <Input type="number" value={form.auditFrequencyDays} onChange={e => f('auditFrequencyDays', e.target.value)} placeholder="365" />
            </div>
            <div className="sm:col-span-2">
              <Label>Scope of Approval</Label>
              <Textarea value={form.scopeOfApproval} onChange={e => f('scopeOfApproval', e.target.value)} rows={2} placeholder="What this supplier is approved to provide…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
