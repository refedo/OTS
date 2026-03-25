'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Loader2, ArrowLeft, Save, Trash2, Search, Package, Building2,
  CheckCircle2, AlertCircle, TrendingUp, RefreshCw, ChevronLeft,
  ChevronRight, CheckSquare, Square, Layers, ArrowUpDown, SaveAll,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) {
  return n.toFixed(1) + '%';
}

// ─── COA Combobox ────────────────────────────────────────────────────────────

interface CoaAccount {
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  account_category: string | null;
}

interface CoaComboboxProps {
  accounts: CoaAccount[];
  grouped: Record<string, CoaAccount[]>;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function CoaCombobox({ accounts, grouped, value, onChange, placeholder = 'Select account…', disabled }: CoaComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = accounts.find(a => a.account_code === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query
    ? accounts.filter(a =>
        a.account_code.includes(query) ||
        a.account_name.toLowerCase().includes(query.toLowerCase()) ||
        (a.account_name_ar || '').includes(query)
      )
    : accounts;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        {selected ? (
          <span className="truncate">
            <span className="font-mono text-xs text-muted-foreground mr-1">{selected.account_code}</span>
            {selected.account_name}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[400px] rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <Input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search code or name…"
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {query ? (
              filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
              ) : filtered.map(a => (
                <button
                  key={a.account_code}
                  type="button"
                  onClick={() => { onChange(a.account_code); setOpen(false); setQuery(''); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                >
                  <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{a.account_code}</span>
                  <span className="flex-1">{a.account_name}</span>
                  {a.account_category && <span className="text-xs text-muted-foreground shrink-0">{a.account_category}</span>}
                </button>
              ))
            ) : (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/40">{cat}</div>
                  {items.map(a => (
                    <button
                      key={a.account_code}
                      type="button"
                      onClick={() => { onChange(a.account_code); setOpen(false); setQuery(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{a.account_code}</span>
                      <span className="flex-1">{a.account_name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
          {value && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
                className="w-full text-sm text-destructive hover:underline text-left px-1"
              >
                Clear mapping
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoverageStats {
  lines: { total: number; productMapped: number; supplierMapped: number; unmapped: number };
  spend: { totalHT: number; productMappedHT: number; supplierMappedHT: number; classifiedHT: number; unmappedHT: number; coveragePercent: number };
  products: { total: number; mapped: number };
  suppliers: { total: number; mapped: number };
}

interface ProductRow {
  dolibarr_id: number;
  ref: string;
  label: string;
  product_type: number;
  pmp: number | null;
  mapping_id: number | null;
  coa_account_code: string | null;
  mapping_notes: string | null;
  coa_account_name: string | null;
  coa_account_name_ar: string | null;
  coa_account_category: string | null;
  is_mapped: number;
  invoice_line_count: number;
  total_spend_ht: number;
}

interface SupplierRow {
  dolibarr_id: number;
  name: string;
  mapping_id: number | null;
  coa_account_code: string | null;
  mapping_notes: string | null;
  coa_account_name: string | null;
  coa_account_name_ar: string | null;
  coa_account_category: string | null;
  is_mapped: number;
  invoice_count: number;
  total_spend_ht: number;
  unmapped_product_count: number;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ProductCoaMappingPage() {
  const { toast } = useToast();

  // COA accounts
  const [coaAccounts, setCoaAccounts] = useState<CoaAccount[]>([]);
  const [coaGrouped, setCoaGrouped] = useState<Record<string, CoaAccount[]>>({});

  // Coverage stats
  const [coverage, setCoverage] = useState<CoverageStats | null>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(true);

  // Products tab
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productStats, setProductStats] = useState<any>(null);
  const [productPagination, setProductPagination] = useState({ page: 0, limit: 50, total: 0 });
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [savingProduct, setSavingProduct] = useState<number | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<number | null>(null);

  // Product inline edits
  const [productEdits, setProductEdits] = useState<Record<number, string>>({});

  // Bulk selection for products
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkCode, setBulkCode] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [savingBulk, setSavingBulk] = useState(false);

  // Sorting for products
  const [productSort, setProductSort] = useState<{ field: 'ref' | 'label' | 'spend' | 'lines'; dir: 'asc' | 'desc' }>({ field: 'spend', dir: 'desc' });

  // Suppliers tab
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [supplierStats, setSupplierStats] = useState<any>(null);
  const [supplierPagination, setSupplierPagination] = useState({ page: 0, limit: 50, total: 0 });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [savingSupplier, setSavingSupplier] = useState<number | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<number | null>(null);
  const [supplierEdits, setSupplierEdits] = useState<Record<number, string>>({});

  // Bulk selection for suppliers
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
  const [supplierBulkDialogOpen, setSupplierBulkDialogOpen] = useState(false);
  const [supplierBulkCode, setSupplierBulkCode] = useState('');
  const [supplierBulkNotes, setSupplierBulkNotes] = useState('');
  const [savingSupplierBulk, setSavingSupplierBulk] = useState(false);

  // Sorting for suppliers
  const [supplierSort, setSupplierSort] = useState<{ field: 'name' | 'spend' | 'invoices' | 'unmapped'; dir: 'asc' | 'desc' }>({ field: 'spend', dir: 'desc' });

  // Save all state
  const [savingAll, setSavingAll] = useState(false);

  // Notes dialog
  const [notesDialog, setNotesDialog] = useState<{ type: 'product' | 'supplier'; id: number; code: string; notes: string } | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const fetchCoa = useCallback(async () => {
    const res = await fetch('/api/financial/coa-expense-accounts');
    if (!res.ok) return;
    const data = await res.json();
    setCoaAccounts(data.accounts || []);
    setCoaGrouped(data.grouped || {});
  }, []);

  const fetchCoverage = useCallback(async () => {
    setLoadingCoverage(true);
    const res = await fetch('/api/financial/classification-coverage');
    if (res.ok) setCoverage(await res.json());
    setLoadingCoverage(false);
  }, []);

  const fetchProducts = useCallback(async (page = 0) => {
    setLoadingProducts(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      search: productSearch,
      mapped: productFilter,
    });
    const res = await fetch(`/api/financial/product-coa-mapping?${params}`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products || []);
      setProductStats(data.stats);
      setProductPagination(data.pagination);
    }
    setLoadingProducts(false);
  }, [productSearch, productFilter]);

  const fetchSuppliers = useCallback(async (page = 0) => {
    setLoadingSuppliers(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      search: supplierSearch,
      mapped: supplierFilter,
    });
    const res = await fetch(`/api/financial/supplier-coa-default?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setSupplierStats(data.stats);
      setSupplierPagination(data.pagination);
    }
    setLoadingSuppliers(false);
  }, [supplierSearch, supplierFilter]);

  useEffect(() => { fetchCoa(); fetchCoverage(); }, [fetchCoa, fetchCoverage]);
  useEffect(() => { fetchProducts(0); }, [fetchProducts]);
  useEffect(() => { fetchSuppliers(0); }, [fetchSuppliers]);

  // ── Product save ────────────────────────────────────────────────────────────

  async function saveProduct(productId: number, code: string, notes?: string | null) {
    if (!code) return;
    setSavingProduct(productId);
    const res = await fetch('/api/financial/product-coa-mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dolibarr_product_id: productId, coa_account_code: code, notes: notes ?? null }),
    });
    setSavingProduct(null);
    if (res.ok) {
      toast({ title: 'Saved', description: 'Product mapping updated.' });
      await Promise.all([fetchProducts(productPagination.page), fetchCoverage()]);
    } else {
      toast({ title: 'Error', description: 'Failed to save mapping.', variant: 'destructive' });
    }
  }

  async function deleteProduct(productId: number) {
    setDeletingProduct(productId);
    const res = await fetch(`/api/financial/product-coa-mapping?product_id=${productId}`, { method: 'DELETE' });
    setDeletingProduct(null);
    if (res.ok) {
      toast({ title: 'Removed', description: 'Product mapping removed.' });
      await Promise.all([fetchProducts(productPagination.page), fetchCoverage()]);
    } else {
      toast({ title: 'Error', description: 'Failed to remove mapping.', variant: 'destructive' });
    }
  }

  // ── Supplier save ──────────────────────────────────────────────────────────

  async function saveSupplier(supplierId: number, code: string, notes?: string | null) {
    if (!code) return;
    setSavingSupplier(supplierId);
    const res = await fetch('/api/financial/supplier-coa-default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier_dolibarr_id: supplierId, coa_account_code: code, notes: notes ?? null }),
    });
    setSavingSupplier(null);
    if (res.ok) {
      toast({ title: 'Saved', description: 'Supplier default updated.' });
      await Promise.all([fetchSuppliers(supplierPagination.page), fetchCoverage()]);
    } else {
      toast({ title: 'Error', description: 'Failed to save mapping.', variant: 'destructive' });
    }
  }

  async function deleteSupplier(supplierId: number) {
    setDeletingSupplier(supplierId);
    const res = await fetch(`/api/financial/supplier-coa-default?supplier_id=${supplierId}`, { method: 'DELETE' });
    setDeletingSupplier(null);
    if (res.ok) {
      toast({ title: 'Removed', description: 'Supplier default removed.' });
      await Promise.all([fetchSuppliers(supplierPagination.page), fetchCoverage()]);
    } else {
      toast({ title: 'Error', description: 'Failed to remove mapping.', variant: 'destructive' });
    }
  }

  // ── Bulk save for products ──────────────────────────────────────────────────

  async function saveBulk() {
    if (!bulkCode || selectedProducts.size === 0) return;
    setSavingBulk(true);
    const res = await fetch('/api/financial/product-coa-mapping/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dolibarr_product_ids: Array.from(selectedProducts),
        coa_account_code: bulkCode,
        notes: bulkNotes || null,
      }),
    });
    setSavingBulk(false);
    if (res.ok) {
      const d = await res.json();
      toast({ title: 'Bulk saved', description: `${d.upserted} products mapped.` });
      setSelectedProducts(new Set());
      setBulkDialogOpen(false);
      setBulkCode('');
      setBulkNotes('');
      await Promise.all([fetchProducts(productPagination.page), fetchCoverage()]);
    } else {
      toast({ title: 'Error', description: 'Bulk save failed.', variant: 'destructive' });
    }
  }

  // ── Bulk save for suppliers ────────────────────────────────────────────────

  async function saveSupplierBulk() {
    if (!supplierBulkCode || selectedSuppliers.size === 0) return;
    setSavingSupplierBulk(true);
    let successCount = 0;
    for (const supplierId of selectedSuppliers) {
      const res = await fetch('/api/financial/supplier-coa-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_dolibarr_id: supplierId, coa_account_code: supplierBulkCode, notes: supplierBulkNotes || null }),
      });
      if (res.ok) successCount++;
    }
    setSavingSupplierBulk(false);
    if (successCount > 0) {
      toast({ title: 'Bulk saved', description: `${successCount} suppliers mapped.` });
      setSelectedSuppliers(new Set());
      setSupplierBulkDialogOpen(false);
      setSupplierBulkCode('');
      setSupplierBulkNotes('');
      await Promise.all([fetchSuppliers(supplierPagination.page), fetchCoverage()]);
    } else {
      toast({ title: 'Error', description: 'Bulk save failed.', variant: 'destructive' });
    }
  }

  // ── Save all dirty edits ───────────────────────────────────────────────────

  async function saveAllProductEdits() {
    const dirtyProducts = Object.entries(productEdits).filter(([id, code]) => {
      const p = products.find(pr => pr.dolibarr_id === Number(id));
      return code && code !== (p?.coa_account_code || '');
    });
    if (dirtyProducts.length === 0) return;
    setSavingAll(true);
    let successCount = 0;
    for (const [id, code] of dirtyProducts) {
      const res = await fetch('/api/financial/product-coa-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dolibarr_product_id: Number(id), coa_account_code: code, notes: null }),
      });
      if (res.ok) successCount++;
    }
    setSavingAll(false);
    if (successCount > 0) {
      toast({ title: 'Saved', description: `${successCount} product mappings saved.` });
      setProductEdits({});
      await Promise.all([fetchProducts(productPagination.page), fetchCoverage()]);
    }
  }

  async function saveAllSupplierEdits() {
    const dirtySuppliers = Object.entries(supplierEdits).filter(([id, code]) => {
      const s = suppliers.find(su => su.dolibarr_id === Number(id));
      return code && code !== (s?.coa_account_code || '');
    });
    if (dirtySuppliers.length === 0) return;
    setSavingAll(true);
    let successCount = 0;
    for (const [id, code] of dirtySuppliers) {
      const res = await fetch('/api/financial/supplier-coa-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_dolibarr_id: Number(id), coa_account_code: code, notes: null }),
      });
      if (res.ok) successCount++;
    }
    setSavingAll(false);
    if (successCount > 0) {
      toast({ title: 'Saved', description: `${successCount} supplier mappings saved.` });
      setSupplierEdits({});
      await Promise.all([fetchSuppliers(supplierPagination.page), fetchCoverage()]);
    }
  }

  // ── Notes dialog save ────────────────────────────────────────────────────────

  async function saveNotes() {
    if (!notesDialog) return;
    if (notesDialog.type === 'product') {
      await saveProduct(notesDialog.id, notesDialog.code, editNotes);
    } else {
      await saveSupplier(notesDialog.id, notesDialog.code, editNotes);
    }
    setNotesDialog(null);
  }

  const allProductIds = products.map(p => p.dolibarr_id);
  const allProductsSelected = allProductIds.length > 0 && allProductIds.every(id => selectedProducts.has(id));

  function toggleAllProducts() {
    if (allProductsSelected) {
      setSelectedProducts(prev => { const n = new Set(prev); allProductIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedProducts(prev => { const n = new Set(prev); allProductIds.forEach(id => n.add(id)); return n; });
    }
  }

  const allSupplierIds = suppliers.map(s => s.dolibarr_id);
  const allSuppliersSelected = allSupplierIds.length > 0 && allSupplierIds.every(id => selectedSuppliers.has(id));

  function toggleAllSuppliers() {
    if (allSuppliersSelected) {
      setSelectedSuppliers(prev => { const n = new Set(prev); allSupplierIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedSuppliers(prev => { const n = new Set(prev); allSupplierIds.forEach(id => n.add(id)); return n; });
    }
  }

  // Sorting helpers
  function toggleProductSort(field: typeof productSort.field) {
    setProductSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' });
  }

  function toggleSupplierSort(field: typeof supplierSort.field) {
    setSupplierSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' });
  }

  // Sorted products
  const sortedProducts = [...products].sort((a, b) => {
    const dir = productSort.dir === 'asc' ? 1 : -1;
    switch (productSort.field) {
      case 'ref': return dir * a.ref.localeCompare(b.ref);
      case 'label': return dir * a.label.localeCompare(b.label);
      case 'spend': return dir * (a.total_spend_ht - b.total_spend_ht);
      case 'lines': return dir * (a.invoice_line_count - b.invoice_line_count);
      default: return 0;
    }
  });

  // Sorted suppliers
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const dir = supplierSort.dir === 'asc' ? 1 : -1;
    switch (supplierSort.field) {
      case 'name': return dir * a.name.localeCompare(b.name);
      case 'spend': return dir * (a.total_spend_ht - b.total_spend_ht);
      case 'invoices': return dir * (a.invoice_count - b.invoice_count);
      case 'unmapped': return dir * (a.unmapped_product_count - b.unmapped_product_count);
      default: return 0;
    }
  });

  // Count dirty edits
  const dirtyProductCount = Object.entries(productEdits).filter(([id, code]) => {
    const p = products.find(pr => pr.dolibarr_id === Number(id));
    return code && code !== (p?.coa_account_code || '');
  }).length;

  const dirtySupplierCount = Object.entries(supplierEdits).filter(([id, code]) => {
    const s = suppliers.find(su => su.dolibarr_id === Number(id));
    return code && code !== (s?.coa_account_code || '');
  }).length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/financial"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Cost Classification Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Map products and suppliers to Chart of Accounts expense categories for accurate cost reporting
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchCoverage(); fetchProducts(productPagination.page); fetchSuppliers(supplierPagination.page); }} className="ml-auto gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Coverage Stats */}
      {loadingCoverage ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading stats…</div>
      ) : coverage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">Classification Coverage</div>
              <div className="text-2xl font-bold text-green-600">{pct(coverage.spend.coveragePercent)}</div>
              <div className="text-xs text-muted-foreground mt-1">{formatSAR(coverage.spend.classifiedHT)} of {formatSAR(coverage.spend.totalHT)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">Unclassified Spend</div>
              <div className="text-2xl font-bold text-destructive">{formatSAR(coverage.spend.unmappedHT)}</div>
              <div className="text-xs text-muted-foreground mt-1">{coverage.lines.unmapped} invoice lines</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">Products Mapped</div>
              <div className="text-2xl font-bold">{coverage.products.mapped}<span className="text-sm font-normal text-muted-foreground">/{coverage.products.total}</span></div>
              <div className="text-xs text-muted-foreground mt-1">{pct(coverage.products.total > 0 ? (coverage.products.mapped / coverage.products.total) * 100 : 0)} of active products</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">Suppliers Mapped</div>
              <div className="text-2xl font-bold">{coverage.suppliers.mapped}<span className="text-sm font-normal text-muted-foreground">/{coverage.suppliers.total}</span></div>
              <div className="text-xs text-muted-foreground mt-1">{pct(coverage.suppliers.total > 0 ? (coverage.suppliers.mapped / coverage.suppliers.total) * 100 : 0)} of active suppliers</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Priority note */}
      <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 text-sm text-blue-700 dark:text-blue-300">
        <Layers className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          <strong>Mapping priority:</strong> Product mapping (highest) → Supplier default (fallback) → Other / Unclassified.
          Mapping a product directly overrides its supplier&apos;s default for that line.
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" /> Products
            {productStats && <Badge variant="secondary" className="ml-1">{productStats.mappedProducts}/{productStats.totalProducts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Building2 className="h-4 w-4" /> Suppliers
            {supplierStats && <Badge variant="secondary" className="ml-1">{supplierStats.mappedSuppliers}/{supplierStats.totalSuppliers}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Products Tab ── */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ref or label…"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchProducts(0)}
                className="pl-8"
              />
            </div>
            <Select value={productFilter} onValueChange={v => setProductFilter(v as 'all' | 'yes' | 'no')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                <SelectItem value="yes">Mapped only</SelectItem>
                <SelectItem value="no">Unmapped only</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchProducts(0)}>
              <Search className="h-3.5 w-3.5 mr-1" /> Search
            </Button>
            {selectedProducts.size > 0 && (
              <Button size="sm" onClick={() => setBulkDialogOpen(true)} className="gap-2">
                <Layers className="h-3.5 w-3.5" />
                Bulk assign ({selectedProducts.size})
              </Button>
            )}
            {dirtyProductCount > 0 && (
              <Button size="sm" variant="default" onClick={saveAllProductEdits} disabled={savingAll} className="gap-2">
                {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SaveAll className="h-3.5 w-3.5" />}
                Save All ({dirtyProductCount})
              </Button>
            )}
          </div>

          {productStats && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{productStats.totalProducts}</strong> total</span>
              <span><strong className="text-green-600">{productStats.mappedProducts}</strong> mapped</span>
              <span><strong className="text-destructive">{productStats.unmappedProducts}</strong> unmapped</span>
              <span>Coverage: <strong>{pct(productStats.coveragePercent)}</strong></span>
            </div>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <button onClick={toggleAllProducts} className="flex items-center">
                      {allProductsSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => toggleProductSort('ref')} className="flex items-center gap-1 hover:text-foreground">
                      Product <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button onClick={() => toggleProductSort('spend')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                      Spend (HT) <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button onClick={() => toggleProductSort('lines')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                      Lines <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>COA Account</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProducts ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found</TableCell>
                  </TableRow>
                ) : sortedProducts.map(p => {
                  const currentCode = productEdits[p.dolibarr_id] !== undefined
                    ? productEdits[p.dolibarr_id]
                    : (p.coa_account_code || '');
                  const isDirty = productEdits[p.dolibarr_id] !== undefined &&
                    productEdits[p.dolibarr_id] !== (p.coa_account_code || '');
                  const isSaving = savingProduct === p.dolibarr_id;
                  const isDeleting = deletingProduct === p.dolibarr_id;

                  return (
                    <TableRow key={p.dolibarr_id} className={selectedProducts.has(p.dolibarr_id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}>
                      <TableCell>
                        <button onClick={() => setSelectedProducts(prev => {
                          const n = new Set(prev);
                          if (n.has(p.dolibarr_id)) n.delete(p.dolibarr_id); else n.add(p.dolibarr_id);
                          return n;
                        })}>
                          {selectedProducts.has(p.dolibarr_id)
                            ? <CheckSquare className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs text-muted-foreground">{p.ref}</div>
                        <div className="text-sm">{p.label}</div>
                        {p.coa_account_category && (
                          <Badge variant="outline" className="mt-1 text-xs">{p.coa_account_category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {p.total_spend_ht > 0 ? formatSAR(Number(p.total_spend_ht)) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {p.invoice_line_count > 0 ? p.invoice_line_count : '—'}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <CoaCombobox
                          accounts={coaAccounts}
                          grouped={coaGrouped}
                          value={currentCode}
                          onChange={code => setProductEdits(prev => ({ ...prev, [p.dolibarr_id]: code }))}
                          disabled={isSaving || isDeleting}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isDirty && (
                            <Button size="icon" variant="default" className="h-7 w-7"
                              onClick={() => saveProduct(p.dolibarr_id, currentCode).then(() =>
                                setProductEdits(prev => { const n = { ...prev }; delete n[p.dolibarr_id]; return n; })
                              )}
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {!isDirty && p.is_mapped === 1 && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteProduct(p.dolibarr_id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {p.is_mapped === 1 && !isDirty && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {p.is_mapped === 0 && !isDirty && (
                            <AlertCircle className="h-4 w-4 text-muted-foreground opacity-40" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Product Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {productPagination.total === 0 ? 'No results' : `${productPagination.page * productPagination.limit + 1}–${Math.min((productPagination.page + 1) * productPagination.limit, productPagination.total)} of ${productPagination.total}`}
            </span>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="h-7 w-7"
                disabled={productPagination.page === 0}
                onClick={() => fetchProducts(productPagination.page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="outline" className="h-7 w-7"
                disabled={(productPagination.page + 1) * productPagination.limit >= productPagination.total}
                onClick={() => fetchProducts(productPagination.page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Suppliers Tab ── */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by supplier name…"
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchSuppliers(0)}
                className="pl-8"
              />
            </div>
            <Select value={supplierFilter} onValueChange={v => setSupplierFilter(v as 'all' | 'yes' | 'no')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                <SelectItem value="yes">Mapped only</SelectItem>
                <SelectItem value="no">Unmapped only</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchSuppliers(0)}>
              <Search className="h-3.5 w-3.5 mr-1" /> Search
            </Button>
            {selectedSuppliers.size > 0 && (
              <Button size="sm" onClick={() => setSupplierBulkDialogOpen(true)} className="gap-2">
                <Layers className="h-3.5 w-3.5" />
                Bulk assign ({selectedSuppliers.size})
              </Button>
            )}
            {dirtySupplierCount > 0 && (
              <Button size="sm" variant="default" onClick={saveAllSupplierEdits} disabled={savingAll} className="gap-2">
                {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SaveAll className="h-3.5 w-3.5" />}
                Save All ({dirtySupplierCount})
              </Button>
            )}
          </div>

          {supplierStats && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{supplierStats.totalSuppliers}</strong> total</span>
              <span><strong className="text-green-600">{supplierStats.mappedSuppliers}</strong> mapped</span>
              <span><strong className="text-destructive">{supplierStats.unmappedSuppliers}</strong> unmapped</span>
              <span>Coverage: <strong>{pct(supplierStats.coveragePercent)}</strong></span>
            </div>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <button onClick={toggleAllSuppliers} className="flex items-center">
                      {allSuppliersSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => toggleSupplierSort('name')} className="flex items-center gap-1 hover:text-foreground">
                      Supplier <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button onClick={() => toggleSupplierSort('spend')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                      Total Spend (HT) <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button onClick={() => toggleSupplierSort('invoices')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                      Invoices <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button onClick={() => toggleSupplierSort('unmapped')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                      Unmapped <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Default COA Account</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSuppliers ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : sortedSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No suppliers found</TableCell>
                  </TableRow>
                ) : sortedSuppliers.map(s => {
                  const currentCode = supplierEdits[s.dolibarr_id] !== undefined
                    ? supplierEdits[s.dolibarr_id]
                    : (s.coa_account_code || '');
                  const isDirty = supplierEdits[s.dolibarr_id] !== undefined &&
                    supplierEdits[s.dolibarr_id] !== (s.coa_account_code || '');
                  const isSaving = savingSupplier === s.dolibarr_id;
                  const isDeleting = deletingSupplier === s.dolibarr_id;

                  return (
                    <TableRow key={s.dolibarr_id} className={selectedSuppliers.has(s.dolibarr_id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}>
                      <TableCell>
                        <button onClick={() => setSelectedSuppliers(prev => {
                          const n = new Set(prev);
                          if (n.has(s.dolibarr_id)) n.delete(s.dolibarr_id); else n.add(s.dolibarr_id);
                          return n;
                        })}>
                          {selectedSuppliers.has(s.dolibarr_id)
                            ? <CheckSquare className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{s.name}</div>
                        {s.coa_account_category && (
                          <Badge variant="outline" className="mt-1 text-xs">{s.coa_account_category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {s.total_spend_ht > 0 ? formatSAR(Number(s.total_spend_ht)) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {s.invoice_count > 0 ? s.invoice_count : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {Number(s.unmapped_product_count) > 0 ? (
                          <Badge variant="destructive" className="text-xs">{s.unmapped_product_count} products</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <CoaCombobox
                          accounts={coaAccounts}
                          grouped={coaGrouped}
                          value={currentCode}
                          onChange={code => setSupplierEdits(prev => ({ ...prev, [s.dolibarr_id]: code }))}
                          disabled={isSaving || isDeleting}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isDirty && (
                            <Button size="icon" variant="default" className="h-7 w-7"
                              onClick={() => saveSupplier(s.dolibarr_id, currentCode).then(() =>
                                setSupplierEdits(prev => { const n = { ...prev }; delete n[s.dolibarr_id]; return n; })
                              )}
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {!isDirty && s.is_mapped === 1 && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteSupplier(s.dolibarr_id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {s.is_mapped === 1 && !isDirty && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {s.is_mapped === 0 && !isDirty && (
                            <AlertCircle className="h-4 w-4 text-muted-foreground opacity-40" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Supplier Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {supplierPagination.total === 0 ? 'No results' : `${supplierPagination.page * supplierPagination.limit + 1}–${Math.min((supplierPagination.page + 1) * supplierPagination.limit, supplierPagination.total)} of ${supplierPagination.total}`}
            </span>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="h-7 w-7"
                disabled={supplierPagination.page === 0}
                onClick={() => fetchSuppliers(supplierPagination.page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="outline" className="h-7 w-7"
                disabled={(supplierPagination.page + 1) * supplierPagination.limit >= supplierPagination.total}
                onClick={() => fetchSuppliers(supplierPagination.page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign COA Account</DialogTitle>
            <DialogDescription>
              Assign one COA account to {selectedProducts.size} selected product{selectedProducts.size > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>COA Account</Label>
              <div className="mt-1.5">
                <CoaCombobox
                  accounts={coaAccounts}
                  grouped={coaGrouped}
                  value={bulkCode}
                  onChange={setBulkCode}
                  placeholder="Select account to assign…"
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                placeholder="e.g. Bulk assigned — steel raw material"
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveBulk} disabled={!bulkCode || savingBulk}>
                {savingBulk ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Assign {selectedProducts.size} products
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Bulk Assign Dialog */}
      <Dialog open={supplierBulkDialogOpen} onOpenChange={setSupplierBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign COA Account to Suppliers</DialogTitle>
            <DialogDescription>
              Assign one COA account to {selectedSuppliers.size} selected supplier{selectedSuppliers.size > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>COA Account</Label>
              <div className="mt-1.5">
                <CoaCombobox
                  accounts={coaAccounts}
                  grouped={coaGrouped}
                  value={supplierBulkCode}
                  onChange={setSupplierBulkCode}
                  placeholder="Select account to assign…"
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={supplierBulkNotes}
                onChange={e => setSupplierBulkNotes(e.target.value)}
                placeholder="e.g. Bulk assigned — service provider"
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSupplierBulkDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveSupplierBulk} disabled={!supplierBulkCode || savingSupplierBulk}>
                {savingSupplierBulk ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Assign {selectedSuppliers.size} suppliers
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesDialog} onOpenChange={open => !open && setNotesDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={4}
              placeholder="Optional notes about this mapping…"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancel</Button>
              <Button onClick={saveNotes}><Save className="h-4 w-4 mr-2" /> Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
