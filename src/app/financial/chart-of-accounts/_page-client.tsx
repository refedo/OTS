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
  Upload, AlertTriangle, CheckSquare, Square, RefreshCw, RotateCcw, Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  
  // Mass selection and operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [forceReplace, setForceReplace] = useState(false);
  const [backup, setBackup] = useState<Account[] | null>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

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

  // Mass delete selected accounts
  const handleMassDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/financial/chart-of-accounts/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
      } catch { /* continue */ }
    }
    setDeleting(false);
    setDeleteConfirmOpen(false);
    setSelectedIds(new Set());
    toast({ title: 'Deleted', description: `${successCount} accounts deactivated.` });
    fetchAccounts();
  };

  // Parse file (CSV or XLSX)
  const parseFile = async (file: File): Promise<string[][]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      return data.filter(row => row.some(cell => cell !== undefined && cell !== ''));
    } else {
      const text = await file.text();
      return text.split('\n').filter(l => l.trim()).map(line => 
        line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      );
    }
  };

  // Upload CSV/XLSX file
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const rows = await parseFile(file);
      if (rows.length < 2) {
        toast({ title: 'Error', description: 'File must have header and at least one data row.', variant: 'destructive' });
        setUploading(false);
        return;
      }
      
      const header = rows[0].map(h => String(h || '').trim().toLowerCase());
      const codeIdx = header.findIndex(h => h.includes('code'));
      const nameIdx = header.findIndex(h => h.includes('name') && !h.includes('arabic') && !h.includes('ar'));
      const nameArIdx = header.findIndex(h => h.includes('arabic') || h.includes('name_ar'));
      const typeIdx = header.findIndex(h => h.includes('type'));
      const categoryIdx = header.findIndex(h => h.includes('category'));
      const parentIdx = header.findIndex(h => h.includes('parent'));
      
      if (codeIdx === -1 || nameIdx === -1) {
        toast({ title: 'Error', description: 'File must have "code" and "name" columns.', variant: 'destructive' });
        setUploading(false);
        return;
      }

      // Create backup before any changes
      setBackup([...accounts]);
      
      // If force replace, delete all existing accounts first
      if (forceReplace) {
        try {
          const res = await fetch('/api/financial/chart-of-accounts/clear-all', { method: 'DELETE' });
          if (!res.ok) {
            toast({ title: 'Error', description: 'Failed to clear existing accounts.', variant: 'destructive' });
            setUploading(false);
            return;
          }
        } catch {
          toast({ title: 'Error', description: 'Failed to clear existing accounts.', variant: 'destructive' });
          setUploading(false);
          return;
        }
      }
      
      let created = 0, updated = 0, errors = 0;
      // Refresh accounts list after potential clear
      const currentAccounts = forceReplace ? [] : accounts;
      
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].map(c => String(c || '').trim());
        const code = cols[codeIdx];
        const name = cols[nameIdx];
        if (!code || !name) continue;
        
        const payload = {
          account_code: code,
          account_name: name,
          account_name_ar: nameArIdx >= 0 ? cols[nameArIdx] || '' : '',
          account_type: typeIdx >= 0 ? (cols[typeIdx] || 'expense').toLowerCase() : 'expense',
          account_category: categoryIdx >= 0 ? cols[categoryIdx] || '' : '',
          parent_code: parentIdx >= 0 ? cols[parentIdx] || '' : '',
          display_order: 0,
          notes: '',
        };
        
        // Check if account exists
        const existing = currentAccounts.find(a => a.account_code === code);
        try {
          if (existing) {
            const res = await fetch(`/api/financial/chart-of-accounts/${existing.id}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (res.ok) updated++; else errors++;
          } else {
            const res = await fetch('/api/financial/chart-of-accounts', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (res.ok) created++; else errors++;
          }
        } catch { errors++; }
      }
      
      toast({ 
        title: 'Upload Complete', 
        description: `Created: ${created}, Updated: ${updated}, Errors: ${errors}. Rollback available.` 
      });
      setUploadDialogOpen(false);
      setForceReplace(false);
      fetchAccounts();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to parse file.', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Rollback to previous state
  const handleRollback = async () => {
    if (!backup) return;
    setRollingBack(true);
    try {
      // Clear all current accounts
      await fetch('/api/financial/chart-of-accounts/clear-all', { method: 'DELETE' });
      
      // Restore backup accounts
      let restored = 0;
      for (const acc of backup) {
        try {
          const res = await fetch('/api/financial/chart-of-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              account_code: acc.account_code,
              account_name: acc.account_name,
              account_name_ar: acc.account_name_ar || '',
              account_type: acc.account_type,
              account_category: acc.account_category || '',
              parent_code: acc.parent_code || '',
              display_order: acc.display_order,
              notes: acc.notes || '',
            }),
          });
          if (res.ok) restored++;
        } catch { /* continue */ }
      }
      
      toast({ title: 'Rollback Complete', description: `Restored ${restored} accounts.` });
      setBackup(null);
      setRollbackDialogOpen(false);
      fetchAccounts();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to rollback.', variant: 'destructive' });
    } finally {
      setRollingBack(false);
    }
  };

  // Export current accounts to CSV for backup
  const exportToCSV = () => {
    const headers = ['code', 'name', 'name_ar', 'type', 'category', 'parent'];
    const rows = accounts.map(a => [
      a.account_code,
      a.account_name,
      a.account_name_ar || '',
      a.account_type,
      a.account_category || '',
      a.parent_code || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart_of_accounts_backup_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Chart of accounts exported to CSV.' });
  };

  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map(a => a.id)));
    }
  };

  // Sync accounts from Dolibarr
  const syncFromDolibarr = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/financial/chart-of-accounts/sync-dolibarr', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast({ 
          title: 'Sync Complete', 
          description: `Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped}` 
        });
        fetchAccounts();
      } else {
        toast({ title: 'Sync Failed', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to sync from Dolibarr', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
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
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedIds.size})
            </Button>
          )}
          {backup && (
            <Button variant="outline" size="sm" onClick={() => setRollbackDialogOpen(true)} className="text-orange-600 border-orange-300">
              <RotateCcw className="h-4 w-4 mr-2" /> Rollback
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" onClick={syncFromDolibarr} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync from Dolibarr
          </Button>
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Account
          </Button>
        </div>
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
                    <th className="p-3 w-8">
                      <button onClick={toggleSelectAll} className="flex items-center">
                        {selectedIds.size === visible.length && visible.length > 0
                          ? <CheckSquare className="h-4 w-4" />
                          : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </th>
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
                        <td className="p-2">
                          <button onClick={() => toggleSelect(acct.id)}>
                            {selectedIds.has(acct.id)
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </td>
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

      {/* Upload CSV/XLSX Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Chart of Accounts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV or Excel file with your chart of accounts. The file should have columns for:
            </p>
            <ul className="text-sm text-muted-foreground list-disc ml-4 space-y-1">
              <li><strong>code</strong> (required) - Account code</li>
              <li><strong>name</strong> (required) - Account name in English</li>
              <li><strong>name_ar</strong> or <strong>arabic</strong> - Account name in Arabic</li>
              <li><strong>type</strong> - asset, liability, equity, revenue, expense</li>
              <li><strong>category</strong> - Account category</li>
              <li><strong>parent</strong> - Parent account code</li>
            </ul>
            
            <div className="flex items-center space-x-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
              <Checkbox 
                id="force-replace" 
                checked={forceReplace} 
                onCheckedChange={(checked) => setForceReplace(checked === true)}
              />
              <div className="flex-1">
                <label htmlFor="force-replace" className="text-sm font-medium cursor-pointer">
                  Force Replace (Delete All First)
                </label>
                <p className="text-xs text-muted-foreground">
                  Delete all existing accounts before importing. A backup will be created for rollback.
                </p>
              </div>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleUpload}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-primary hover:underline">Click to upload</span>
                <span className="text-muted-foreground"> or drag and drop</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">CSV or Excel (.xlsx) files</p>
            </div>
            {uploading && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setForceReplace(false); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <RotateCcw className="h-5 w-5" />
              Confirm Rollback
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Are you sure you want to rollback to the previous chart of accounts?
            </p>
            <p className="text-sm text-muted-foreground">
              This will restore <strong>{backup?.length || 0}</strong> accounts from before the last upload.
              Current accounts will be replaced.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>Cancel</Button>
            <Button variant="default" className="bg-orange-600 hover:bg-orange-700" onClick={handleRollback} disabled={rollingBack}>
              {rollingBack ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Mass Delete
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Are you sure you want to deactivate <strong>{selectedIds.size}</strong> selected accounts?
            </p>
            <p className="text-sm text-muted-foreground">
              This action will mark the accounts as inactive. They can be reactivated later if needed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleMassDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete {selectedIds.size} Accounts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
