'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Loader2, ArrowLeft, Plus, Pencil, Trash2, Package,
  Link2, AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

const COST_CLASSIFICATIONS = [
  'Raw Materials',
  'Subcontractors',
  'Transportation',
  'Labor',
  'Equipment',
  'Rent & Facilities',
  'Operating Expenses',
  'Administrative',
  'Financial Expenses',
  'Other / Unclassified',
];

const CLASSIFICATION_COLORS: Record<string, string> = {
  'Raw Materials': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Subcontractors': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Transportation': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Labor': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Equipment': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Rent & Facilities': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Operating Expenses': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Administrative': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Financial Expenses': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  'Other / Unclassified': 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

interface ProductCategory {
  id: number;
  name: string;
  name_ar: string | null;
  cost_classification: string;
  coa_account_code: string | null;
  coa_account_name: string | null;
  description: string | null;
  color: string | null;
  is_active: number;
  mapped_products: number;
}

interface ProductMapping {
  id: number;
  product_ref: string;
  product_label_hint: string | null;
  category_id: number;
  category_name: string;
  cost_classification: string;
  coa_account_code: string | null;
  category_color: string | null;
  line_count: number;
  total_ht: number | null;
  notes: string | null;
}

interface UnmappedProduct {
  product_ref: string;
  product_label: string | null;
  line_count: number;
  total_ht: number | null;
}

export default function ProductCategoriesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('categories');

  // Categories state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    name_ar: '',
    cost_classification: '',
    coa_account_code: '',
    description: '',
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // Mappings state
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [unmapped, setUnmapped] = useState<UnmappedProduct[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [mappingSearch, setMappingSearch] = useState('');
  const [editingMapping, setEditingMapping] = useState<ProductMapping | null>(null);
  const [editMappingCategoryId, setEditMappingCategoryId] = useState<string>('');
  const [savingMapping, setSavingMapping] = useState<number | string | null>(null);
  const [assigningRef, setAssigningRef] = useState<string | null>(null);
  const [assignCategoryId, setAssignCategoryId] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'mapping') loadMappings();
  }, [activeTab]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/financial/product-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load categories', variant: 'destructive' });
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadMappings = async () => {
    setLoadingMappings(true);
    try {
      const res = await fetch('/api/financial/product-category-mapping');
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings || []);
        setUnmapped(data.unmapped || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load product mappings', variant: 'destructive' });
    } finally {
      setLoadingMappings(false);
    }
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', name_ar: '', cost_classification: '', coa_account_code: '', description: '' });
    setShowCategoryDialog(true);
  };

  const openEditCategory = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      name_ar: cat.name_ar || '',
      cost_classification: cat.cost_classification,
      coa_account_code: cat.coa_account_code || '',
      description: cat.description || '',
    });
    setShowCategoryDialog(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name || !categoryForm.cost_classification) {
      toast({ title: 'Validation', description: 'Name and classification are required', variant: 'destructive' });
      return;
    }
    setSavingCategory(true);
    try {
      const method = editingCategory ? 'PUT' : 'POST';
      const url = editingCategory
        ? `/api/financial/product-categories/${editingCategory.id}`
        : '/api/financial/product-categories';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name,
          name_ar: categoryForm.name_ar || null,
          cost_classification: categoryForm.cost_classification,
          coa_account_code: categoryForm.coa_account_code || null,
          description: categoryForm.description || null,
        }),
      });

      if (res.ok) {
        toast({ title: 'Success', description: editingCategory ? 'Category updated' : 'Category created' });
        setShowCategoryDialog(false);
        loadCategories();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to save', variant: 'destructive' });
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const deleteCategory = async (cat: ProductCategory) => {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/financial/product-categories/${cat.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Deleted', description: `Category "${cat.name}" removed` });
        loadCategories();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const assignProduct = async (product_ref: string, product_label: string | null) => {
    if (!assignCategoryId || assigningRef !== product_ref) return;
    setSavingMapping(product_ref);
    try {
      const res = await fetch('/api/financial/product-category-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ref,
          product_label_hint: product_label,
          category_id: parseInt(assignCategoryId, 10),
        }),
      });
      if (res.ok) {
        toast({ title: 'Mapped', description: `"${product_ref}" mapped successfully` });
        setAssigningRef(null);
        setAssignCategoryId('');
        loadMappings();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to map', variant: 'destructive' });
      }
    } finally {
      setSavingMapping(null);
    }
  };

  const updateMapping = async (mapping: ProductMapping) => {
    if (!editMappingCategoryId) return;
    setSavingMapping(mapping.id);
    try {
      const res = await fetch(`/api/financial/product-category-mapping/${mapping.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: parseInt(editMappingCategoryId, 10) }),
      });
      if (res.ok) {
        toast({ title: 'Updated', description: 'Mapping updated' });
        setEditingMapping(null);
        setEditMappingCategoryId('');
        loadMappings();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to update', variant: 'destructive' });
      }
    } finally {
      setSavingMapping(null);
    }
  };

  const deleteMapping = async (mapping: ProductMapping) => {
    if (!confirm(`Remove mapping for "${mapping.product_ref}"?`)) return;
    try {
      const res = await fetch(`/api/financial/product-category-mapping/${mapping.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Removed', description: 'Mapping removed' });
        loadMappings();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to remove', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove', variant: 'destructive' });
    }
  };

  const filteredMappings = mappings.filter(m =>
    !mappingSearch ||
    m.product_ref.toLowerCase().includes(mappingSearch.toLowerCase()) ||
    (m.product_label_hint || '').toLowerCase().includes(mappingSearch.toLowerCase()) ||
    m.category_name.toLowerCase().includes(mappingSearch.toLowerCase()),
  );

  const filteredUnmapped = unmapped.filter(u =>
    !mappingSearch ||
    u.product_ref.toLowerCase().includes(mappingSearch.toLowerCase()) ||
    (u.product_label || '').toLowerCase().includes(mappingSearch.toLowerCase()),
  );

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Deprecation notice */}
      <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          <strong>Legacy page.</strong> Product-to-category mappings are superseded by{' '}
          <Link href="/financial/product-coa-mapping" className="underline font-medium">Cost Classification Mapping</Link>{' '}
          which maps products directly to COA expense accounts. New reports use the new system.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/financial">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Product Categories & Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Define cost categories and map invoice products to them for accurate classification
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="categories">
            <Package className="h-4 w-4 mr-2" />
            Categories
            {categories.length > 0 && (
              <Badge variant="secondary" className="ml-2">{categories.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mapping">
            <Link2 className="h-4 w-4 mr-2" />
            Product Mapping
            {unmapped.length > 0 && (
              <Badge variant="destructive" className="ml-2">{unmapped.length} unmapped</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── CATEGORIES TAB ── */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Categories group products by type. Each category maps to a cost classification and optionally a Chart of Accounts code.
            </p>
            <Button onClick={openCreateCategory} size="sm">
              <Plus className="h-4 w-4 mr-2" />New Category
            </Button>
          </div>

          {loadingCategories ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No categories defined yet</p>
                <p className="text-sm mt-1">Create categories to classify your invoice products</p>
                <Button className="mt-4" onClick={openCreateCategory}>
                  <Plus className="h-4 w-4 mr-2" />Create First Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map(cat => (
                <Card key={cat.id} className={cat.is_active ? '' : 'opacity-50'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{cat.name}</CardTitle>
                        {cat.name_ar && (
                          <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{cat.name_ar}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCategory(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => deleteCategory(cat)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge className={CLASSIFICATION_COLORS[cat.cost_classification] || CLASSIFICATION_COLORS['Other / Unclassified']}>
                      {cat.cost_classification}
                    </Badge>
                    {cat.coa_account_code && (
                      <div className="text-xs text-muted-foreground">
                        Account: <span className="font-mono font-medium">{cat.coa_account_code}</span>
                        {cat.coa_account_name && ` — ${cat.coa_account_name}`}
                      </div>
                    )}
                    {cat.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {Number(cat.mapped_products)} product{Number(cat.mapped_products) !== 1 ? 's' : ''} mapped
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── PRODUCT MAPPING TAB ── */}
        <TabsContent value="mapping" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search product ref or label..."
                value={mappingSearch}
                onChange={e => setMappingSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadMappings} disabled={loadingMappings}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingMappings ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {loadingMappings ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unmapped products */}
              {filteredUnmapped.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Unmapped Products ({filteredUnmapped.length})
                      <span className="text-sm font-normal text-muted-foreground">
                        — assign a category to classify these costs
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Ref</TableHead>
                          <TableHead>Label</TableHead>
                          <TableHead className="text-right">Lines</TableHead>
                          <TableHead className="text-right">Total (HT)</TableHead>
                          <TableHead>Assign Category</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUnmapped.map(u => (
                          <TableRow key={u.product_ref}>
                            <TableCell className="font-mono text-sm">{u.product_ref}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {u.product_label || '—'}
                            </TableCell>
                            <TableCell className="text-right text-sm">{Number(u.line_count).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {u.total_ht ? formatSAR(Number(u.total_ht)) : '—'}
                            </TableCell>
                            <TableCell>
                              {assigningRef === u.product_ref ? (
                                <Select value={assignCategoryId} onValueChange={setAssignCategoryId}>
                                  <SelectTrigger className="w-52 h-8">
                                    <SelectValue placeholder="Select category..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.filter(c => c.is_active).map(c => (
                                      <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name} — {c.cost_classification}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => { setAssigningRef(u.product_ref); setAssignCategoryId(''); }}
                                >
                                  <Link2 className="h-3.5 w-3.5 mr-1.5" />Assign
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              {assigningRef === u.product_ref && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    disabled={!assignCategoryId || savingMapping === u.product_ref}
                                    onClick={() => assignProduct(u.product_ref, u.product_label)}
                                  >
                                    {savingMapping === u.product_ref
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : <CheckCircle2 className="h-3.5 w-3.5" />
                                    }
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost"
                                    onClick={() => { setAssigningRef(null); setAssignCategoryId(''); }}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Mapped products */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Mapped Products ({filteredMappings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredMappings.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      No mappings yet. Assign categories to unmapped products above.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Ref</TableHead>
                          <TableHead>Label</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Classification</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Lines</TableHead>
                          <TableHead className="text-right">Total (HT)</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMappings.map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="font-mono text-sm">{m.product_ref}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                              {m.product_label_hint || '—'}
                            </TableCell>
                            <TableCell>
                              {editingMapping?.id === m.id ? (
                                <Select value={editMappingCategoryId} onValueChange={setEditMappingCategoryId}>
                                  <SelectTrigger className="w-48 h-8">
                                    <SelectValue placeholder="Category..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.filter(c => c.is_active).map(c => (
                                      <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm font-medium">{m.category_name}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${CLASSIFICATION_COLORS[m.cost_classification] || ''}`}>
                                {m.cost_classification}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{m.coa_account_code || '—'}</TableCell>
                            <TableCell className="text-right text-sm">{Number(m.line_count).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {m.total_ht ? formatSAR(Number(m.total_ht)) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {editingMapping?.id === m.id ? (
                                  <>
                                    <Button
                                      size="icon" className="h-7 w-7"
                                      disabled={!editMappingCategoryId || savingMapping === m.id}
                                      onClick={() => updateMapping(m)}
                                    >
                                      {savingMapping === m.id
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <CheckCircle2 className="h-3.5 w-3.5" />
                                      }
                                    </Button>
                                    <Button
                                      size="icon" variant="ghost" className="h-7 w-7"
                                      onClick={() => { setEditingMapping(null); setEditMappingCategoryId(''); }}
                                    >✕</Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="icon" variant="ghost" className="h-7 w-7"
                                      onClick={() => {
                                        setEditingMapping(m);
                                        setEditMappingCategoryId(String(m.category_id));
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                      onClick={() => deleteMapping(m)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Category dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'New Product Category'}</DialogTitle>
            <DialogDescription>
              Define a category with its cost classification and optional Chart of Accounts link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name (English) *</Label>
                <Input
                  placeholder="e.g. Steel Profiles"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Name (Arabic)</Label>
                <Input
                  placeholder="اختياري"
                  dir="rtl"
                  value={categoryForm.name_ar}
                  onChange={e => setCategoryForm(f => ({ ...f, name_ar: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cost Classification *</Label>
              <Select
                value={categoryForm.cost_classification}
                onValueChange={v => setCategoryForm(f => ({ ...f, cost_classification: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select classification..." />
                </SelectTrigger>
                <SelectContent>
                  {COST_CLASSIFICATIONS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chart of Accounts Code</Label>
              <Input
                placeholder="e.g. 6010"
                value={categoryForm.coa_account_code}
                onChange={e => setCategoryForm(f => ({ ...f, coa_account_code: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Links this category to a specific account in your Chart of Accounts
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                rows={2}
                value={categoryForm.description}
                onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
              <Button onClick={saveCategory} disabled={savingCategory}>
                {savingCategory && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
