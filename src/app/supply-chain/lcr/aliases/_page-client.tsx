'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  GitBranch,
  ChevronLeft,
  CheckCircle,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  Building2,
  Truck,
  ChevronsUpDown,
  Check,
  Wand2,
} from 'lucide-react';

interface PendingAlias {
  aliasText: string;
  entityType: 'supplier' | 'building';
  affectedRowCount: number;
}

interface ExistingAlias {
  id: string;
  aliasText: string;
  entityType: string;
  entityId: string;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

interface BuildingOption {
  id: string;
  name: string;
  designation: string;
  project?: { projectNumber: string; name: string } | null;
}

interface SupplierOption {
  dolibarr_id: number;
  name: string;
  code_supplier?: string | null;
}

export default function AliasManagementPage() {
  const { toast } = useToast();

  const [pending, setPending] = useState<PendingAlias[]>([]);
  const [aliases, setAliases] = useState<{ supplier: ExistingAlias[]; building: ExistingAlias[] }>({ supplier: [], building: [] });
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  // Track mapping selections per pending alias
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  const [autoMapping, setAutoMapping] = useState(false);

  // Helper function for fuzzy matching (any word in any order)
  const fuzzyMatch = useCallback((text: string, search: string): boolean => {
    if (!search) return true;
    const searchWords = search.toLowerCase().split(/\s+/).filter(Boolean);
    const textLower = text.toLowerCase();
    return searchWords.every(word => textLower.includes(word));
  }, []);

  const fetchAliases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supply-chain/lcr/aliases');
      if (res.ok) {
        const data = await res.json();
        setPending(data.pending ?? []);
        setAliases(data.aliases ?? { supplier: [], building: [] });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load aliases', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLookups = useCallback(async () => {
    try {
      // Fetch buildings and first page of suppliers in parallel
      const [bRes, sRes] = await Promise.all([
        fetch('/api/buildings'),
        fetch('/api/dolibarr/thirdparties?type=supplier&limit=200&page=0'),
      ]);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBuildings(Array.isArray(bData) ? bData : bData.data ?? []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        const firstPage: SupplierOption[] = sData.thirdparties ?? [];
        const total: number = sData.pagination?.total ?? firstPage.length;

        if (total <= 200) {
          setSuppliers(firstPage);
        } else {
          // Fetch remaining pages
          const totalPages = Math.ceil(total / 200);
          const pageRequests = Array.from({ length: totalPages - 1 }, (_, i) =>
            fetch(`/api/dolibarr/thirdparties?type=supplier&limit=200&page=${i + 1}`).then(r => r.ok ? r.json() : { thirdparties: [] })
          );
          const rest = await Promise.all(pageRequests);
          const allSuppliers = [
            ...firstPage,
            ...rest.flatMap((d: { thirdparties?: SupplierOption[] }) => d.thirdparties ?? []),
          ];
          setSuppliers(allSuppliers);
        }
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchAliases(); fetchLookups(); }, [fetchAliases, fetchLookups]);

  // Auto-map function: tries to find exact or close matches
  const handleAutoMap = async () => {
    setAutoMapping(true);
    let mapped = 0;
    const newSelections = { ...selections };

    for (const alias of pending) {
      const key = `${alias.entityType}:${alias.aliasText}`;
      if (newSelections[key]) continue; // Already selected

      const aliasLower = alias.aliasText.toLowerCase().trim();

      if (alias.entityType === 'building') {
        // Try exact match first, then partial
        const exactMatch = buildings.find(b => b.name.toLowerCase() === aliasLower);
        if (exactMatch) {
          newSelections[key] = exactMatch.id;
          mapped++;
          continue;
        }
        // Try if alias contains building name or vice versa
        const partialMatch = buildings.find(b => 
          b.name.toLowerCase().includes(aliasLower) || aliasLower.includes(b.name.toLowerCase())
        );
        if (partialMatch) {
          newSelections[key] = partialMatch.id;
          mapped++;
        }
      } else {
        // Supplier matching
        const exactMatch = suppliers.find(s => s.name.toLowerCase() === aliasLower);
        if (exactMatch) {
          newSelections[key] = String(exactMatch.dolibarr_id);
          mapped++;
          continue;
        }
        // Try partial match
        const partialMatch = suppliers.find(s => 
          s.name.toLowerCase().includes(aliasLower) || aliasLower.includes(s.name.toLowerCase())
        );
        if (partialMatch) {
          newSelections[key] = String(partialMatch.dolibarr_id);
          mapped++;
        }
      }
    }

    setSelections(newSelections);
    setAutoMapping(false);
    toast({
      title: 'Auto-map complete',
      description: `Found ${mapped} potential matches. Review and save each mapping.`,
    });
  };

  const handleSave = async (alias: PendingAlias) => {
    const key = `${alias.entityType}:${alias.aliasText}`;
    const entityId = selections[key];
    if (!entityId) {
      toast({ title: 'Select a mapping', description: 'Please select an entity to map this alias to', variant: 'destructive' });
      return;
    }

    setSaving(s => ({ ...s, [key]: true }));
    try {
      const res = await fetch('/api/supply-chain/lcr/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aliasText: alias.aliasText,
          entityType: alias.entityType,
          entityId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to save alias', variant: 'destructive' });
        return;
      }
      const result = await res.json();
      toast({
        title: 'Alias saved',
        description: `Mapped "${alias.aliasText}" — ${result.backfilledCount} rows back-filled`,
      });
      fetchAliases();
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      const res = await fetch(`/api/supply-chain/lcr/aliases?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast({ title: 'Error', description: 'Failed to delete alias', variant: 'destructive' });
        return;
      }
      toast({ title: 'Alias deleted' });
      fetchAliases();
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
  };

  const pendingCount = pending.length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="size-6" />
            Alias Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Map informal names from the sheet to OTS entities</p>
        </div>
        <Link href="/supply-chain/lcr">
          <Button variant="outline" size="sm"><ChevronLeft className="size-4 mr-1" /> Back to LCR</Button>
        </Link>
      </div>

      {/* Section 1: Pending Aliases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-amber-500" />
                Unresolved Aliases
                {pendingCount > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-1">{pendingCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>Map these names from Google Sheets to real OTS entities</CardDescription>
            </div>
            {pendingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMap}
                disabled={autoMapping}
              >
                {autoMapping ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Wand2 className="size-4 mr-1" />}
                Auto-Map
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-60" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : pendingCount === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="size-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-700 font-medium">All aliases resolved</p>
              <p className="text-sm text-muted-foreground">Every supplier and building name from the sheet is mapped</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium">Alias Text</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-right px-3 py-2 font-medium">Used In</th>
                    <th className="text-left px-3 py-2 font-medium">Map To</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Buildings group */}
                  {pending.filter(a => a.entityType === 'building').length > 0 && (
                    <tr className="bg-muted/30">
                      <td colSpan={5} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4" />
                          Buildings ({pending.filter(a => a.entityType === 'building').length})
                        </div>
                      </td>
                    </tr>
                  )}
                  {pending.filter(a => a.entityType === 'building').map((alias) => {
                    const key = `building:${alias.aliasText}`;
                    const isSaving = saving[key] ?? false;
                    return (
                      <tr key={key} className="border-b">
                        <td className="px-3 py-2.5 font-medium">{alias.aliasText}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="capitalize">
                            <Building2 className="size-3 mr-1" />building
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">{alias.affectedRowCount} rows</td>
                        <td className="px-3 py-2.5 min-w-[300px]">
                          <Popover open={openPopovers[key] ?? false} onOpenChange={(open) => setOpenPopovers(p => ({ ...p, [key]: open }))}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between h-8 font-normal">
                                {selections[key]
                                  ? (() => { const b = buildings.find(b => b.id === selections[key]); return b ? `${b.project?.projectNumber ?? '?'} — ${b.name}` : 'Select building...'; })()
                                  : 'Select building...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="start">
                              <Command filter={(value, search) => fuzzyMatch(value, search) ? 1 : 0}>
                                <CommandInput placeholder="Search buildings (any word)..." />
                                <CommandList>
                                  <CommandEmpty>No building found.</CommandEmpty>
                                  <CommandGroup>
                                    {buildings.map(b => {
                                      const label = `${b.project?.projectNumber ?? '?'} — ${b.name}`;
                                      return (
                                        <CommandItem key={b.id} value={label} onSelect={() => { setSelections(s => ({ ...s, [key]: b.id })); setOpenPopovers(p => ({ ...p, [key]: false })); }}>
                                          <Check className={cn('mr-2 h-4 w-4', selections[key] === b.id ? 'opacity-100' : 'opacity-0')} />
                                          {label}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-3 py-2.5">
                          <Button size="sm" disabled={!selections[key] || isSaving} onClick={() => handleSave(alias)}>
                            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4 mr-1" />}
                            Save
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Separator + Suppliers group */}
                  {pending.filter(a => a.entityType === 'building').length > 0 && pending.filter(a => a.entityType === 'supplier').length > 0 && (
                    <tr>
                      <td colSpan={5} className="py-0"><div className="border-t-2 border-muted-foreground/20" /></td>
                    </tr>
                  )}
                  {pending.filter(a => a.entityType === 'supplier').length > 0 && (
                    <tr className="bg-muted/30">
                      <td colSpan={5} className="px-3 py-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Truck className="size-4" />
                          Suppliers ({pending.filter(a => a.entityType === 'supplier').length})
                        </div>
                      </td>
                    </tr>
                  )}
                  {pending.filter(a => a.entityType === 'supplier').map((alias) => {
                    const key = `${alias.entityType}:${alias.aliasText}`;
                    const isSaving = saving[key] ?? false;
                    return (
                      <tr key={key} className="border-b">
                        <td className="px-3 py-2.5 font-medium">{alias.aliasText}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="capitalize">
                            <Truck className="size-3 mr-1" />
                            supplier
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">{alias.affectedRowCount} rows</td>
                        <td className="px-3 py-2.5 min-w-[300px]">
                          <Popover
                            open={openPopovers[key] ?? false}
                            onOpenChange={(open) => setOpenPopovers(p => ({ ...p, [key]: open }))}
                          >
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between h-8 font-normal">
                                {selections[key]
                                  ? (() => {
                                      const s = suppliers.find(s => String(s.dolibarr_id) === selections[key]);
                                      return s ? `${s.name}${s.code_supplier ? ` (${s.code_supplier})` : ''}` : 'Select supplier...';
                                    })()
                                  : 'Select supplier...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="start">
                              <Command filter={(value, search) => fuzzyMatch(value, search) ? 1 : 0}>
                                <CommandInput placeholder="Search suppliers (any word)..." />
                                <CommandList>
                                  <CommandEmpty>No supplier found.</CommandEmpty>
                                  <CommandGroup>
                                    {suppliers.map(s => {
                                      const label = `${s.name}${s.code_supplier ? ` (${s.code_supplier})` : ''}`;
                                      return (
                                        <CommandItem
                                          key={s.dolibarr_id}
                                          value={label}
                                          onSelect={() => {
                                            setSelections(sel => ({ ...sel, [key]: String(s.dolibarr_id) }));
                                            setOpenPopovers(p => ({ ...p, [key]: false }));
                                          }}
                                        >
                                          <Check className={cn('mr-2 h-4 w-4', selections[key] === String(s.dolibarr_id) ? 'opacity-100' : 'opacity-0')} />
                                          {label}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-3 py-2.5">
                          <Button size="sm" disabled={!selections[key] || isSaving} onClick={() => handleSave(alias)}>
                            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4 mr-1" />}
                            Save
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Supplier Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4 text-blue-500" />
            Supplier Mappings
            {aliases.supplier.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 ml-1">{aliases.supplier.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Supplier alias-to-entity mappings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : aliases.supplier.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No supplier mappings created yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium">Alias Text</th>
                    <th className="text-left px-3 py-2 font-medium">Maps To (Entity ID)</th>
                    <th className="text-left px-3 py-2 font-medium">Mapped By</th>
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {aliases.supplier.map((alias) => {
                    const isDeleting = deleting[alias.id] ?? false;
                    return (
                      <tr key={alias.id} className="border-b">
                        <td className="px-3 py-2.5 font-medium">{alias.aliasText}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{alias.entityId}</td>
                        <td className="px-3 py-2.5">{alias.createdBy?.name ?? '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {new Date(alias.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={isDeleting}
                            onClick={() => handleDelete(alias.id)}
                          >
                            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Building Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-purple-500" />
            Building Mappings
            {aliases.building.length > 0 && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 ml-1">{aliases.building.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Building alias-to-entity mappings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : aliases.building.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No building mappings created yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium">Alias Text</th>
                    <th className="text-left px-3 py-2 font-medium">Maps To (Entity ID)</th>
                    <th className="text-left px-3 py-2 font-medium">Mapped By</th>
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {aliases.building.map((alias) => {
                    const isDeleting = deleting[alias.id] ?? false;
                    return (
                      <tr key={alias.id} className="border-b">
                        <td className="px-3 py-2.5 font-medium">{alias.aliasText}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{alias.entityId}</td>
                        <td className="px-3 py-2.5">{alias.createdBy?.name ?? '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {new Date(alias.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={isDeleting}
                            onClick={() => handleDelete(alias.id)}
                          >
                            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
