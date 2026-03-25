'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2, ArrowLeft, Pencil, Trash2, Building2,
  AlertCircle, CheckCircle2, RefreshCw, Link2,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

const COST_CATEGORIES = [
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

const CATEGORY_COLORS: Record<string, string> = {
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

interface SupplierClassification {
  id: number;
  supplier_id: number;
  supplier_name: string | null;
  cost_category: string;
  coa_account_code: string | null;
  coa_account_name: string | null;
  invoice_count: number;
  total_ht: number | null;
  notes: string | null;
}

interface UnclassifiedSupplier {
  supplier_id: number;
  supplier_name: string | null;
  invoice_count: number;
  total_ht: number | null;
}

export default function SupplierClassificationPage() {
  const { toast } = useToast();
  const [classifications, setClassifications] = useState<SupplierClassification[]>([]);
  const [unclassified, setUnclassified] = useState<UnclassifiedSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // For classifying an unclassified supplier
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignCategory, setAssignCategory] = useState('');
  const [assignCoaCode, setAssignCoaCode] = useState('');
  const [saving, setSaving] = useState<number | null>(null);

  // For editing an existing classification
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editCoaCode, setEditCoaCode] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financial/supplier-classification');
      if (res.ok) {
        const data = await res.json();
        setClassifications(data.classifications || []);
        setUnclassified(data.unclassified || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load supplier classifications', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const assignSupplier = async (supplier: UnclassifiedSupplier) => {
    if (!assignCategory) return;
    setSaving(supplier.supplier_id);
    try {
      const res = await fetch('/api/financial/supplier-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplier.supplier_id,
          supplier_name: supplier.supplier_name,
          cost_category: assignCategory,
          coa_account_code: assignCoaCode || null,
        }),
      });
      if (res.ok) {
        toast({ title: 'Classified', description: `${supplier.supplier_name || `Supplier #${supplier.supplier_id}`} classified as ${assignCategory}` });
        setAssigningId(null);
        setAssignCategory('');
        setAssignCoaCode('');
        loadData();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to classify', variant: 'destructive' });
      }
    } finally {
      setSaving(null);
    }
  };

  const saveEdit = async (sc: SupplierClassification) => {
    if (!editCategory) return;
    setSaving(sc.id);
    try {
      const res = await fetch(`/api/financial/supplier-classification/${sc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cost_category: editCategory,
          coa_account_code: editCoaCode || null,
        }),
      });
      if (res.ok) {
        toast({ title: 'Updated', description: 'Supplier classification updated' });
        setEditingId(null);
        loadData();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to update', variant: 'destructive' });
      }
    } finally {
      setSaving(null);
    }
  };

  const deleteClassification = async (sc: SupplierClassification) => {
    if (!confirm(`Remove classification for "${sc.supplier_name || `Supplier #${sc.supplier_id}`}"?`)) return;
    try {
      const res = await fetch(`/api/financial/supplier-classification/${sc.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Removed', description: 'Supplier classification removed' });
        loadData();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to remove', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove', variant: 'destructive' });
    }
  };

  const filteredClassifications = classifications.filter(sc =>
    !search ||
    (sc.supplier_name || '').toLowerCase().includes(search.toLowerCase()) ||
    sc.cost_category.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredUnclassified = unclassified.filter(u =>
    !search || (u.supplier_name || '').toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Deprecation notice */}
      <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          <strong>Legacy page.</strong> Supplier cost-category assignments are superseded by{' '}
          <Link href="/financial/product-coa-mapping" className="underline font-medium">Cost Classification Mapping</Link>{' '}
          (Suppliers tab) which maps suppliers directly to COA expense accounts. New reports use the new system.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/financial">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Supplier Classification</h1>
          <p className="text-sm text-muted-foreground">
            Assign a default cost category to each supplier — used when no account or product mapping exists
          </p>
        </div>
      </div>

      {/* Classification priority note */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="py-3 px-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Classification Priority (highest → lowest)</p>
          <ol className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-0.5 list-decimal list-inside">
            <li>Account Mapping — per Dolibarr accounting account code</li>
            <li>Product Category Mapping — per product reference on the invoice line</li>
            <li>Supplier Classification — per supplier (this page)</li>
            <li>Other / Unclassified — default fallback</li>
          </ol>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search supplier or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* Unclassified suppliers */}
        {filteredUnclassified.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Unclassified Suppliers ({filteredUnclassified.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Total (HT)</TableHead>
                    <TableHead>Cost Category</TableHead>
                    <TableHead>COA Account</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnclassified.map(u => (
                    <TableRow key={u.supplier_id}>
                      <TableCell>
                        <div className="font-medium text-sm">{u.supplier_name || `Supplier #${u.supplier_id}`}</div>
                        <div className="text-xs text-muted-foreground">ID: {u.supplier_id}</div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{Number(u.invoice_count).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {u.total_ht ? formatSAR(Number(u.total_ht)) : '—'}
                      </TableCell>
                      <TableCell>
                        {assigningId === u.supplier_id ? (
                          <Select value={assignCategory} onValueChange={setAssignCategory}>
                            <SelectTrigger className="w-52 h-8">
                              <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                              {COST_CATEGORIES.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => {
                            setAssigningId(u.supplier_id);
                            setAssignCategory('');
                            setAssignCoaCode('');
                          }}>
                            <Link2 className="h-3.5 w-3.5 mr-1.5" />Classify
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {assigningId === u.supplier_id && (
                          <Input
                            placeholder="e.g. 6010"
                            className="w-28 h-8"
                            value={assignCoaCode}
                            onChange={e => setAssignCoaCode(e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {assigningId === u.supplier_id && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              disabled={!assignCategory || saving === u.supplier_id}
                              onClick={() => assignSupplier(u)}
                            >
                              {saving === u.supplier_id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <CheckCircle2 className="h-3.5 w-3.5" />
                              }
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAssigningId(null)}>✕</Button>
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

        {/* Classified suppliers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-500" />
              Classified Suppliers ({filteredClassifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredClassifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {search ? 'No results for your search.' : 'No classified suppliers yet. Use the table above to assign categories.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Cost Category</TableHead>
                    <TableHead>COA Account</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Total (HT)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClassifications.map(sc => (
                    <TableRow key={sc.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{sc.supplier_name || `Supplier #${sc.supplier_id}`}</div>
                        <div className="text-xs text-muted-foreground">ID: {sc.supplier_id}</div>
                      </TableCell>
                      <TableCell>
                        {editingId === sc.id ? (
                          <Select value={editCategory} onValueChange={setEditCategory}>
                            <SelectTrigger className="w-52 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COST_CATEGORIES.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={`text-xs ${CATEGORY_COLORS[sc.cost_category] || CATEGORY_COLORS['Other / Unclassified']}`}>
                            {sc.cost_category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === sc.id ? (
                          <Input
                            placeholder="e.g. 6010"
                            className="w-28 h-8"
                            value={editCoaCode}
                            onChange={e => setEditCoaCode(e.target.value)}
                          />
                        ) : (
                          <span className="font-mono text-sm">
                            {sc.coa_account_code || '—'}
                            {sc.coa_account_name && (
                              <span className="text-muted-foreground font-sans"> — {sc.coa_account_name}</span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{Number(sc.invoice_count).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {sc.total_ht ? formatSAR(Number(sc.total_ht)) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          {editingId === sc.id ? (
                            <>
                              <Button
                                size="icon" className="h-7 w-7"
                                disabled={!editCategory || saving === sc.id}
                                onClick={() => saveEdit(sc)}
                              >
                                {saving === sc.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <CheckCircle2 className="h-3.5 w-3.5" />
                                }
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>✕</Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => {
                                  setEditingId(sc.id);
                                  setEditCategory(sc.cost_category);
                                  setEditCoaCode(sc.coa_account_code || '');
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                onClick={() => deleteClassification(sc)}
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
    </div>
  );
}
