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
  Loader2, ArrowLeft, Save, AlertCircle, CheckCircle2, Search,
  DollarSign, FileText, TrendingUp, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

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

export default function AccountMappingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [unmappedCodes, setUnmappedCodes] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [loadingUnmapped, setLoadingUnmapped] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/financial/account-mapping');
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings || []);
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to load account mappings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUnmappedCodes = async () => {
    setLoadingUnmapped(true);
    try {
      const res = await fetch('/api/financial/account-mapping/unmapped');
      if (res.ok) {
        const data = await res.json();
        setUnmappedCodes(data.unmappedCodes || []);
        setShowUnmapped(true);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to load unmapped codes',
        variant: 'destructive',
      });
    } finally {
      setLoadingUnmapped(false);
    }
  };

  const startEdit = (mapping: any) => {
    setEditingId(mapping.id);
    setEditValues({
      ots_cost_category: mapping.ots_cost_category,
      dolibarr_account_label: mapping.dolibarr_account_label || '',
      notes: mapping.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveMapping = async (id: number) => {
    setSaving(id);
    try {
      const res = await fetch('/api/financial/account-mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editValues }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Mapping updated successfully',
        });
        setEditingId(null);
        setEditValues({});
        loadMappings();
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update mapping',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to update mapping',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const createMapping = async (accountingCode: string, suggestedCategory: string) => {
    setSaving(parseInt(accountingCode));
    try {
      const res = await fetch('/api/financial/account-mapping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dolibarr_account_id: accountingCode,
          ots_cost_category: suggestedCategory,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Mapping created successfully',
        });
        loadMappings();
        loadUnmappedCodes();
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create mapping',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to create mapping',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const filteredMappings = mappings.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.dolibarr_account_id?.toLowerCase().includes(term) ||
      m.dolibarr_account_label?.toLowerCase().includes(term) ||
      m.ots_cost_category?.toLowerCase().includes(term)
    );
  });

  const totalMapped = mappings.reduce((s, m) => s + Number(m.total_ht || 0), 0);
  const totalUnmapped = unmappedCodes.reduce((s, c) => s + Number(c.total_ht || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Dolibarr Account Mapping
            </h1>
            <p className="text-muted-foreground mt-1">
              Map Dolibarr accounting codes to OTS cost categories for accurate expense reporting
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadMappings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={loadUnmappedCodes} disabled={loadingUnmapped}>
            {loadingUnmapped ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Find Unmapped Codes
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Mapped Accounts</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">{mappings.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatSAR(totalMapped)}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Unmapped Codes</span>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{unmappedCodes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatSAR(totalUnmapped)}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Categories</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Cost categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Unmapped Codes Section */}
      {showUnmapped && unmappedCodes.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Unmapped Accounting Codes
              <Badge variant="outline" className="ml-2">{unmappedCodes.length} codes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              These Dolibarr accounting codes don't have OTS cost category mappings. Assign them to improve expense categorization.
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Accounting Code</TableHead>
                  <TableHead>Line Count</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Suggested Category</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmappedCodes.slice(0, 20).map((code: any) => (
                  <TableRow key={code.accounting_code}>
                    <TableCell className="font-mono">{code.accounting_code}</TableCell>
                    <TableCell>{code.line_count}</TableCell>
                    <TableCell className="text-right font-semibold">{formatSAR(code.total_ht)}</TableCell>
                    <TableCell>
                      <Badge className={CATEGORY_COLORS[code.suggested_category] || CATEGORY_COLORS['Other / Unclassified']}>
                        {code.suggested_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => createMapping(code.accounting_code, code.suggested_category)}
                        disabled={saving === parseInt(code.accounting_code)}
                      >
                        {saving === parseInt(code.accounting_code) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Map'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {unmappedCodes.length > 20 && (
              <div className="text-sm text-muted-foreground mt-4 text-center">
                Showing top 20 of {unmappedCodes.length} unmapped codes
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mapped Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Mapped Accounts
              <Badge variant="outline">{filteredMappings.length} mappings</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by code, label, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px]"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dolibarr Account ID</TableHead>
                  <TableHead>Account Label</TableHead>
                  <TableHead>OTS Cost Category</TableHead>
                  <TableHead>Line Count</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.map((mapping: any) => {
                  const isEditing = editingId === mapping.id;
                  return (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-mono">{mapping.dolibarr_account_id}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editValues.dolibarr_account_label}
                            onChange={(e) => setEditValues({ ...editValues, dolibarr_account_label: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          mapping.dolibarr_account_label || '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editValues.ots_cost_category}
                            onValueChange={(value) => setEditValues({ ...editValues, ots_cost_category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                              <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                              <SelectItem value="Subcontractors">Subcontractors</SelectItem>
                              <SelectItem value="Transportation">Transportation</SelectItem>
                              <SelectItem value="Labor">Labor</SelectItem>
                              <SelectItem value="Equipment">Equipment</SelectItem>
                              <SelectItem value="Rent & Facilities">Rent & Facilities</SelectItem>
                              <SelectItem value="Operating Expenses">Operating Expenses</SelectItem>
                              <SelectItem value="Administrative">Administrative</SelectItem>
                              <SelectItem value="Financial Expenses">Financial Expenses</SelectItem>
                              <SelectItem value="Other / Unclassified">Other / Unclassified</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={CATEGORY_COLORS[mapping.ots_cost_category] || CATEGORY_COLORS['Other / Unclassified']}>
                            {mapping.ots_cost_category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{mapping.line_count || 0}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatSAR(mapping.total_ht || 0)}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editValues.notes}
                            onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                            className="w-full"
                            placeholder="Optional notes..."
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{mapping.notes || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => saveMapping(mapping.id)}
                              disabled={saving === mapping.id}
                            >
                              {saving === mapping.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><Save className="h-3 w-3 mr-1" /> Save</>
                              )}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEdit(mapping)}>
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
