'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Search, Loader2, Pencil, Trash2, FileText,
} from 'lucide-react';

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const CATEGORIES_BY_TYPE: Record<string, string[]> = {
  asset: ['Current Assets', 'Bank & Cash', 'Accounts Receivable', 'Inventory', 'Fixed Assets', 'Other Assets'],
  liability: ['Current Liabilities', 'Accounts Payable', 'VAT Payable', 'Long-term Liabilities'],
  equity: ['Share Capital', 'Retained Earnings', 'Current Year Earnings'],
  revenue: ['Sales Revenue', 'Other Income'],
  expense: ['Cost of Sales', 'Operating Expenses', 'Administrative Expenses', 'Financial Expenses', 'Other Expenses'],
};

const TYPE_COLORS: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-purple-100 text-purple-800',
  revenue: 'bg-green-100 text-green-800',
  expense: 'bg-orange-100 text-orange-800',
};

interface Account {
  id: number;
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  account_type: string;
  account_category: string | null;
  parent_code: string | null;
  is_active: number;
  display_order: number;
  notes: string | null;
}

const emptyForm = {
  account_code: '', account_name: '', account_name_ar: '', account_type: 'asset',
  account_category: '', parent_code: '', display_order: 0, notes: '',
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financial/chart-of-accounts');
      if (res.ok) setAccounts(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const filtered = accounts.filter(a => {
    if (filterType !== 'all' && a.account_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return a.account_code.toLowerCase().includes(s) ||
        a.account_name.toLowerCase().includes(s) ||
        (a.account_name_ar || '').toLowerCase().includes(s);
    }
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (acct: Account) => {
    setEditingId(acct.id);
    setForm({
      account_code: acct.account_code,
      account_name: acct.account_name,
      account_name_ar: acct.account_name_ar || '',
      account_type: acct.account_type,
      account_category: acct.account_category || '',
      parent_code: acct.parent_code || '',
      display_order: acct.display_order,
      notes: acct.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/financial/chart-of-accounts/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/financial/chart-of-accounts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      fetchAccounts();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this account?')) return;
    await fetch(`/api/financial/chart-of-accounts/${id}`, { method: 'DELETE' });
    fetchAccounts();
  };

  const categories = CATEGORIES_BY_TYPE[form.account_type] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your accounting chart of accounts</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Account
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by code or name..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACCOUNT_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
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
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Arabic Name</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(acct => (
                    <tr key={acct.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono font-semibold">{acct.account_code}</td>
                      <td className="p-3">{acct.account_name}</td>
                      <td className="p-3 text-right" dir="rtl">{acct.account_name_ar || '—'}</td>
                      <td className="p-3">
                        <Badge className={`${TYPE_COLORS[acct.account_type] || ''} text-xs`}>
                          {acct.account_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{acct.account_category || '—'}</td>
                      <td className="p-3 text-center">
                        <Badge variant={acct.is_active ? 'default' : 'secondary'}>
                          {acct.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(acct)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(acct.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No accounts found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Code *</Label>
                <Input value={form.account_code} onChange={e => setForm({ ...form, account_code: e.target.value })}
                  placeholder="e.g. 411001" disabled={!!editingId} />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order}
                  onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>Account Name (English) *</Label>
              <Input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })}
                placeholder="e.g. Accounts Receivable - Trade" />
            </div>
            <div>
              <Label>Account Name (Arabic)</Label>
              <Input value={form.account_name_ar} onChange={e => setForm({ ...form, account_name_ar: e.target.value })}
                placeholder="e.g. ذمم مدينة تجارية" dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Type *</Label>
                <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v, account_category: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.account_category} onValueChange={v => setForm({ ...form, account_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Parent Account Code</Label>
              <Input value={form.parent_code} onChange={e => setForm({ ...form, parent_code: e.target.value })}
                placeholder="Optional parent code" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.account_code || !form.account_name}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
