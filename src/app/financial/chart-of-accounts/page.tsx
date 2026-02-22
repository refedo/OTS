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
  Plus, Search, Loader2, Pencil, Trash2, FileText, ChevronRight, ChevronDown, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

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

type HierarchicalAccount = Account & { level: number; children: HierarchicalAccount[] };

function buildTree(accounts: Account[], allAccounts: Account[]): HierarchicalAccount[] {
  // Sort by account_code to ensure parents come before children
  const sorted = [...accounts].sort((a, b) => a.account_code.localeCompare(b.account_code));
  
  // Build a map of ALL accounts (not just filtered) so parent lookups work
  const allMap = new Map<string, HierarchicalAccount>();
  for (const a of [...allAccounts].sort((x, y) => x.account_code.localeCompare(y.account_code))) {
    allMap.set(a.account_code, { ...a, level: 0, children: [] });
  }
  
  // Build map of filtered accounts
  const filteredSet = new Set(sorted.map(a => a.account_code));
  const map = new Map<string, HierarchicalAccount>();
  const roots: HierarchicalAccount[] = [];

  for (const a of sorted) {
    map.set(a.account_code, { ...a, level: 0, children: [] });
  }

  // Also include ancestor accounts that are needed for hierarchy
  for (const a of sorted) {
    let parentCode = a.parent_code;
    while (parentCode && !map.has(parentCode) && allMap.has(parentCode)) {
      const parent = allMap.get(parentCode)!;
      map.set(parent.account_code, { ...parent, level: 0, children: [] });
      parentCode = parent.parent_code;
    }
  }

  // Build parent-child relationships
  for (const [code, node] of map) {
    if (node.parent_code && map.has(node.parent_code)) {
      map.get(node.parent_code)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children within each parent
  const sortChildren = (nodes: HierarchicalAccount[]) => {
    nodes.sort((a, b) => a.account_code.localeCompare(b.account_code));
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

function flattenVisible(
  nodes: HierarchicalAccount[],
  level: number,
  collapsed: Set<string>,
): HierarchicalAccount[] {
  const result: HierarchicalAccount[] = [];
  for (const node of nodes) {
    node.level = level;
    result.push(node);
    if (node.children.length > 0 && !collapsed.has(node.account_code)) {
      result.push(...flattenVisible(node.children, level + 1, collapsed));
    }
  }
  return result;
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  const tree = buildTree(filtered, accounts);
  const visible = search ? flattenVisible(tree, 0, new Set()) : flattenVisible(tree, 0, collapsed);

  const toggleCollapse = (code: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const collapseAll = () => {
    const parents = new Set(accounts.filter(a => accounts.some(c => c.parent_code === a.account_code)).map(a => a.account_code));
    setCollapsed(parents);
  };

  const expandAll = () => setCollapsed(new Set());

  const parentOptions = accounts.filter(a => a.is_active && a.account_code !== form.account_code);

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
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Chart of Accounts</h1>
            <p className="text-muted-foreground mt-1">Manage your accounting chart of accounts ({accounts.length} accounts)</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Account
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
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
        <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
        <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
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
                    <th className="text-left p-3 font-medium w-[200px]">Code</th>
                    <th className="text-left p-3 font-medium">Name (English)</th>
                    <th className="text-right p-3 font-medium">Name (Arabic)</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-right p-3 font-medium w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(acct => {
                    const hasChildren = acct.children.length > 0;
                    const isCollapsed = collapsed.has(acct.account_code);
                    return (
                      <tr key={acct.id} className={`border-b hover:bg-muted/30 ${hasChildren ? 'bg-muted/20' : ''}`}>
                        <td className="p-2 font-mono text-xs" style={{ paddingLeft: `${acct.level * 20 + 8}px` }}>
                          {hasChildren ? (
                            <button onClick={() => toggleCollapse(acct.account_code)} className="inline-flex items-center gap-1 hover:text-primary">
                              {isCollapsed
                                ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className="font-bold">{acct.account_code}</span>
                            </button>
                          ) : (
                            <span className="ml-5">{acct.account_code}</span>
                          )}
                        </td>
                        <td className={`p-2 ${hasChildren ? 'font-semibold' : ''}`}>
                          {acct.account_name}
                          {acct.parent_code && (
                            <span className="text-[10px] text-muted-foreground ml-1.5">({acct.parent_code})</span>
                          )}
                        </td>
                        <td className="p-2 text-right" dir="rtl">
                          <span className={hasChildren ? 'font-semibold' : ''}>{acct.account_name_ar || '—'}</span>
                        </td>
                        <td className="p-2">
                          <Badge className={`${TYPE_COLORS[acct.account_type] || ''} text-[10px]`}>
                            {acct.account_type}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{acct.account_category || '—'}</td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(acct)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(acct.id)}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No accounts found</td></tr>
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
              <Label>Parent Account</Label>
              <Select value={form.parent_code || '__none__'} onValueChange={v => setForm({ ...form, parent_code: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="No parent (root account)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No parent (root account)</SelectItem>
                  {parentOptions.map(a => (
                    <SelectItem key={a.account_code} value={a.account_code}>
                      {a.account_code} — {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
