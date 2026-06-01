'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Handshake, ChevronLeft, ChevronRight, Plus, Trash2, Loader2,
  FileText, CheckCircle2, AlertCircle, ChevronsUpDown, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDefaultTerms, SCOPE_LABELS, TEMPLATE_LABELS } from '@/lib/services/subcontractor-contract.constants';

type Project = { id: string; projectNumber: string; name: string };
type Building = { id: string; designation: string; name: string };
type Supplier = {
  dolibarr_id: number;
  name: string;
  code_supplier: string | null;
  approval_status: string | null;
  approval_rating: string | null;
  approved_supplier_id: string | null;
};
type PurchaseOrder = {
  id: number;
  ref: string;
  supplier_name?: string;
  project_ref?: string;
  total_ttc: number;
};
type ScopeItem = { scopeType: string; scopeLabel: string; buildingId?: string | null; buildingDesignation?: string | null; originalQuantity?: number | null; originalUnit?: string | null; contractQuantity?: number | null; contractUnit?: string | null; unitRate?: number | null; subtotal?: number | null };
type PaymentMilestone = { milestone: string; percentage: number; amount: number; dueDate?: string; description?: string };

const SCOPE_TYPES = ['steel', 'roof_sheeting', 'wall_sheeting', 'deck_panel', 'metal_work', 'other'];
const UNITS = ['ton', 'm2', 'Lm', 'LS', 'No.', 'kg'];
const STEPS = ['Project & SC', 'Scope & Quantities', 'Payment Terms', 'Terms & Conditions', 'Review'];

export default function NewSubcontractorContractPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedSupplierData, setSelectedSupplierData] = useState<Supplier | null>(null);
  const [scopeLevel, setScopeLevel] = useState<'project' | 'building' | 'scope'>('building');
  const [projectOpen, setProjectOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  // PO selection
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [poSearchResults, setPoSearchResults] = useState<PurchaseOrder[]>([]);
  const [poSearching, setPoSearching] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poOpen, setPoOpen] = useState(false);

  // Step 2
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedScopeTypes, setSelectedScopeTypes] = useState<string[]>(['steel']);
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [projectScopeTypes, setProjectScopeTypes] = useState<string[]>([]);

  // Step 3
  const [retentionPct, setRetentionPct] = useState(10);
  const [paymentTerms, setPaymentTerms] = useState<PaymentMilestone[]>([]);
  const [contractValue, setContractValue] = useState(0);
  const [currency, setCurrency] = useState('SAR');

  // Step 4
  const [templateType, setTemplateType] = useState('steel');
  const [termsAndConditions, setTermsAndConditions] = useState(getDefaultTerms('steel'));

  const [notes, setNotes] = useState('');
  const [submitAction, setSubmitAction] = useState<'draft' | 'submit'>('draft');

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/projects?status=Active');
    if (res.ok) {
      const data = await res.json() as Project[];
      setProjects(Array.isArray(data) ? data : []);
    }
  }, []);

  const fetchSuppliers = useCallback(async (search: string) => {
    const params = new URLSearchParams({ limit: '100' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/supply-chain/suppliers?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
    }
  }, []);

  const fetchBuildings = useCallback(async () => {
    if (!selectedProject) return;
    const res = await fetch(`/api/projects/${selectedProject}/buildings`);
    if (res.ok) setBuildings(await res.json());
  }, [selectedProject]);

  const searchPOs = useCallback(async (q: string) => {
    if (!q.trim()) { setPoSearchResults([]); return; }
    setPoSearching(true);
    try {
      const res = await fetch(`/api/qc/material-receipts/lookup-po?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setPoSearchResults(data.orders ?? []);
      }
    } finally {
      setPoSearching(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); fetchSuppliers(''); }, [fetchProjects, fetchSuppliers]);

  useEffect(() => {
    if (!poOpen) { setPoSearchResults([]); setPoSearchQuery(''); return; }
    const timer = setTimeout(() => searchPOs(poSearchQuery), 400);
    return () => clearTimeout(timer);
  }, [poSearchQuery, poOpen, searchPOs]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchSuppliers(supplierSearch); }, 300);
    return () => clearTimeout(timer);
  }, [supplierSearch, fetchSuppliers]);
  useEffect(() => { if (selectedProject) fetchBuildings(); }, [selectedProject, fetchBuildings]);

  useEffect(() => {
    if (!selectedProject) { setProjectScopeTypes([]); return; }
    fetch(`/api/scope-of-work?projectId=${selectedProject}`)
      .then(r => r.ok ? r.json() : [])
      .then((scopes: { scopeType: string }[]) => {
        const types = [...new Set(scopes.map(s => s.scopeType))];
        setProjectScopeTypes(types);
        // Reset selected scope types to only those valid for this project
        if (types.length > 0) {
          setSelectedScopeTypes(prev => {
            const valid = prev.filter(t => types.includes(t));
            return valid.length > 0 ? valid : types.slice(0, 1);
          });
        }
      })
      .catch(() => setProjectScopeTypes([]));
  }, [selectedProject]);

  useEffect(() => {
    setTermsAndConditions(getDefaultTerms(templateType));
  }, [templateType]);

  const toggleScopeType = (st: string) => {
    setSelectedScopeTypes(prev =>
      prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]
    );
  };

  const updateScopeItem = (idx: number, field: keyof ScopeItem, value: unknown) => {
    setScopeItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'contractQuantity' || field === 'unitRate') {
        const item = next[idx];
        const qty = field === 'contractQuantity' ? Number(value) : Number(item.contractQuantity ?? 0);
        const rate = field === 'unitRate' ? Number(value) : Number(item.unitRate ?? 0);
        next[idx].subtotal = qty * rate;
      }
      return next;
    });
  };

  useEffect(() => {
    const building = selectedBuilding ? buildings.find(b => b.id === selectedBuilding) : null;
    const items: ScopeItem[] = selectedScopeTypes.map(st => ({
      scopeType: st,
      scopeLabel: SCOPE_LABELS[st] ?? st,
      buildingId: selectedBuilding || null,
      buildingDesignation: building?.designation ?? null,
      originalQuantity: null,
      originalUnit: st === 'steel' ? 'ton' : 'm2',
      contractQuantity: null,
      contractUnit: st === 'steel' ? 'ton' : 'm2',
      unitRate: null,
      subtotal: null,
    }));
    setScopeItems(items);
  }, [selectedScopeTypes, selectedBuilding, buildings]);

  useEffect(() => {
    const total = scopeItems.reduce((s, item) => s + (item.subtotal ?? 0), 0);
    setContractValue(total);
  }, [scopeItems]);

  const addMilestone = () => {
    setPaymentTerms(prev => [...prev, {
      milestone: `Milestone ${prev.length + 1}`,
      percentage: 0,
      amount: 0,
      dueDate: '',
      description: '',
    }]);
  };

  const updateMilestone = (idx: number, field: keyof PaymentMilestone, value: unknown) => {
    setPaymentTerms(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'percentage') {
        next[idx].amount = (Number(value) / 100) * contractValue;
      }
      return next;
    });
  };

  const removeMilestone = (idx: number) => {
    setPaymentTerms(prev => prev.filter((_, i) => i !== idx));
  };

  const milestoneTotal = paymentTerms.reduce((s, m) => s + m.percentage, 0);

  const canProceed = (): boolean => {
    if (step === 0) return !!(selectedProject && selectedSupplier);
    if (step === 1) return selectedScopeTypes.length > 0;
    return true;
  };

  const handleSave = async (action: 'draft' | 'submit') => {
    setSaving(true);
    setError('');
    setSubmitAction(action);

    try {
      const res = await fetch('/api/subcontractor-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          buildingId: selectedBuilding || null,
          supplierId: selectedSupplierData?.approved_supplier_id ?? null,
          dolibarrId: selectedSupplierData?.dolibarr_id ?? null,
          dolibarrPoId: selectedPO?.id ?? null,
          dolibarrPoRef: selectedPO?.ref ?? null,
          scopeLevel,
          scopeTypes: selectedScopeTypes,
          scopeItems: scopeItems.map(item => ({
            ...item,
            contractQuantity: item.contractQuantity ?? null,
            unitRate: item.unitRate ?? null,
            subtotal: item.subtotal ?? null,
          })),
          contractValue,
          currency,
          retentionPercentage: retentionPct,
          paymentTerms,
          termsAndConditions,
          templateType,
          notes: notes || null,
        }),
      });

      if (res.redirected) {
        throw new Error('Your session has expired. Please refresh the page and log in again.');
      }
      if (!res.ok) {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          const errData = await res.json() as { error?: string };
          throw new Error(errData.error ?? 'Failed to create contract');
        }
        throw new Error(`Request failed (${res.status}). Please refresh the page and try again.`);
      }
      const data = await res.json() as { id?: string; contractNumber?: string };

      if (action === 'submit' && data.id) {
        await fetch(`/api/subcontractor-contracts/${data.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit' }),
        });
      }

      router.push(data.id ? `/supply-chain/subcontractors/${data.id}` : '/supply-chain/subcontractors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const proj = projects.find(p => p.id === selectedProject);
  const bldg = buildings.find(b => b.id === selectedBuilding);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 max-lg:pt-20 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/supply-chain/subcontractors')}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Handshake className="size-5 text-orange-600" />
            <h1 className="text-xl font-bold">New Subcontractor Contract</h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? 'bg-orange-600 text-white' :
                i < step ? 'bg-orange-100 text-orange-700' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <CheckCircle2 className="size-3" /> : <span>{i + 1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Step 0: Project & Subcontractor ── */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Project & Subcontractor</CardTitle>
              <CardDescription>Select the project and the subcontractor for this contract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Project <span className="text-destructive">*</span></Label>
                <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={projectOpen} className="w-full justify-between font-normal">
                      {selectedProject
                        ? (() => { const p = projects.find(x => x.id === selectedProject); return p ? `${p.projectNumber} — ${p.name}` : 'Select a project…'; })()
                        : 'Select a project…'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" style={{ minWidth: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                      <CommandInput placeholder="Search projects…" />
                      <CommandList>
                        <CommandEmpty>No projects found.</CommandEmpty>
                        <CommandGroup>
                          {projects.map(p => (
                            <CommandItem
                              key={p.id}
                              value={`${p.projectNumber} ${p.name}`}
                              onSelect={() => { setSelectedProject(p.id); setProjectOpen(false); }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', selectedProject === p.id ? 'opacity-100' : 'opacity-0')} />
                              <span className="font-mono text-primary mr-2 text-sm">{p.projectNumber}</span>
                              {p.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Subcontractor <span className="text-destructive">*</span></Label>
                <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={supplierOpen} className="w-full justify-between font-normal">
                      {selectedSupplierData ? selectedSupplierData.name : 'Select a subcontractor…'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" style={{ minWidth: 'var(--radix-popover-trigger-width)' }}>
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search subcontractors…"
                        value={supplierSearch}
                        onValueChange={setSupplierSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No subcontractors found.</CommandEmpty>
                        <CommandGroup>
                          {suppliers
                            .map(s => (
                              <CommandItem
                                key={s.dolibarr_id}
                                value={String(s.dolibarr_id)}
                                onSelect={() => { setSelectedSupplier(String(s.dolibarr_id)); setSelectedSupplierData(s); setSupplierOpen(false); setSupplierSearch(''); }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', String(s.dolibarr_id) === selectedSupplier ? 'opacity-100' : 'opacity-0')} />
                                <span className="font-mono text-muted-foreground text-xs mr-2">{s.code_supplier ?? '—'}</span>
                                {s.name}
                                {s.approval_rating && <Badge variant="outline" className="ml-2 text-xs">{s.approval_rating}</Badge>}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Scope Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['project', 'building', 'scope'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setScopeLevel(level)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                        scopeLevel === level
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      {level === 'project' ? 'Full Project' : level === 'building' ? 'Per Building' : 'Specific Scope'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Purchase Order (optional)</Label>
                <p className="text-xs text-muted-foreground -mt-1">Link this contract to an existing P.O. from Dolibarr</p>
                <Popover open={poOpen} onOpenChange={setPoOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={poOpen} className="w-full justify-between font-normal">
                      {selectedPO ? `${selectedPO.ref} — ${selectedPO.supplier_name ?? ''}` : 'Search & select a P.O…'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" style={{ minWidth: 'var(--radix-popover-trigger-width)' }}>
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Type PO number to search…"
                        value={poSearchQuery}
                        onValueChange={setPoSearchQuery}
                      />
                      <CommandList>
                        {poSearching && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {!poSearching && poSearchQuery && poSearchResults.length === 0 && (
                          <CommandEmpty>No purchase orders found.</CommandEmpty>
                        )}
                        {!poSearching && !poSearchQuery && (
                          <CommandEmpty>Type to search purchase orders…</CommandEmpty>
                        )}
                        <CommandGroup>
                          {poSearchResults.map(po => (
                            <CommandItem
                              key={po.id}
                              value={String(po.id)}
                              onSelect={() => { setSelectedPO(po); setPoOpen(false); setPoSearchQuery(''); }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', selectedPO?.id === po.id ? 'opacity-100' : 'opacity-0')} />
                              <span className="font-mono text-primary text-sm mr-2">{po.ref}</span>
                              <span className="text-muted-foreground text-sm">{po.supplier_name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedPO && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                    <div>
                      <span className="font-mono font-semibold text-blue-800">{selectedPO.ref}</span>
                      {selectedPO.supplier_name && <span className="text-blue-600 ml-2">{selectedPO.supplier_name}</span>}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-blue-600 h-6 px-2" onClick={() => setSelectedPO(null)}>
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Scope & Quantities ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Scope & Quantities</CardTitle>
              <CardDescription>Define the scope of work and contract quantities (may differ from project UOM)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {scopeLevel !== 'project' && (
                <div className="space-y-2">
                  <Label>Building</Label>
                  <Select value={selectedBuilding || '__none__'} onValueChange={v => setSelectedBuilding(v === '__none__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select building (optional)…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No specific building (full project)</SelectItem>
                      {buildings.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="font-mono font-semibold mr-2">{b.designation}</span>{b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Scope Types <span className="text-destructive">*</span></Label>
                {projectScopeTypes.length > 0 && (
                  <p className="text-xs text-muted-foreground">Showing scopes available in the selected project</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(projectScopeTypes.length > 0 ? SCOPE_TYPES.filter(st => projectScopeTypes.includes(st)) : SCOPE_TYPES).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleScopeType(st)}
                      className={`p-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                        selectedScopeTypes.includes(st)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      {SCOPE_LABELS[st] ?? st}
                    </button>
                  ))}
                </div>
              </div>

              {scopeItems.length > 0 && (
                <div className="space-y-4">
                  <Label>Quantities & Rates</Label>
                  <p className="text-xs text-muted-foreground -mt-2">Contract UOM can differ from project UOM (e.g. project in tons, SC contract in m²)</p>
                  {scopeItems.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                      <h4 className="font-semibold text-sm">{item.scopeLabel}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Contract Qty</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={item.contractQuantity ?? ''}
                            onChange={e => updateScopeItem(idx, 'contractQuantity', e.target.value ? Number(e.target.value) : null)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit</Label>
                          <Select
                            value={item.contractUnit ?? 'm2'}
                            onValueChange={v => updateScopeItem(idx, 'contractUnit', v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit Rate ({currency})</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={item.unitRate ?? ''}
                            onChange={e => updateScopeItem(idx, 'unitRate', e.target.value ? Number(e.target.value) : null)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Subtotal ({currency})</Label>
                          <Input
                            value={item.subtotal != null ? item.subtotal.toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: 2 }) : ''}
                            readOnly
                            className="h-8 text-sm bg-muted"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {contractValue > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-200">
                      <span className="font-semibold text-orange-800">Total Contract Value</span>
                      <span className="font-bold text-orange-700 text-lg">
                        {contractValue.toLocaleString('en-SA-u-ca-gregory', { style: 'currency', currency, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Payment Terms ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Terms</CardTitle>
              <CardDescription>Define retention and milestone payment schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contract Value ({currency})</Label>
                  <Input
                    type="number"
                    value={contractValue}
                    onChange={e => setContractValue(Number(e.target.value))}
                    className="font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Retention %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={retentionPct}
                    onChange={e => setRetentionPct(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Payment Milestones</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                    <Plus className="size-3 mr-1" /> Add Milestone
                  </Button>
                </div>

                {paymentTerms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-xl border-dashed">
                    No milestones defined — payment by progress certificates only
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentTerms.map((m, i) => (
                      <div key={i} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <Input
                            value={m.milestone}
                            onChange={e => updateMilestone(i, 'milestone', e.target.value)}
                            placeholder="Milestone name"
                            className="font-medium h-8"
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeMilestone(i)} className="text-destructive shrink-0">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Percentage (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={m.percentage}
                              onChange={e => updateMilestone(i, 'percentage', Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Amount ({currency})</Label>
                            <Input value={(m.amount).toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: 2 })} readOnly className="h-8 text-sm bg-muted" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Due Date</Label>
                            <Input type="date" value={m.dueDate ?? ''} onChange={e => updateMilestone(i, 'dueDate', e.target.value)} className="h-8 text-sm" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className={`flex items-center justify-between p-2 rounded-lg text-sm font-semibold ${milestoneTotal > 100 ? 'bg-rose-50 text-rose-700' : milestoneTotal === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      <span>Total milestone %</span>
                      <span>{milestoneTotal}%{milestoneTotal > 100 ? ' — exceeds 100%!' : milestoneTotal === 100 ? ' ✓' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Terms & Conditions ── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>Select a template or write custom T&Cs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(TEMPLATE_LABELS).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTemplateType(k)}
                      className={`p-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                        templateType === k
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <FileText className="size-3 mb-1" />
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setTemplateType('custom'); setTermsAndConditions(''); }}
                    className={`p-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                      templateType === 'custom'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <FileText className="size-3 mb-1" />
                    Custom
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={termsAndConditions}
                  onChange={e => setTermsAndConditions(e.target.value)}
                  rows={20}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="Enter terms and conditions…"
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any internal notes about this contract…"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Save</CardTitle>
              <CardDescription>Review the contract details before saving</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Project', value: proj ? `${proj.projectNumber} — ${proj.name}` : '—' },
                  { label: 'Subcontractor', value: selectedSupplierData ? `${selectedSupplierData.code_supplier ?? selectedSupplierData.dolibarr_id} — ${selectedSupplierData.name}` : '—' },
                  { label: 'Purchase Order', value: selectedPO ? selectedPO.ref : '—' },
                  { label: 'Building', value: bldg ? `${bldg.designation} — ${bldg.name}` : 'Full Project' },
                  { label: 'Scope Types', value: selectedScopeTypes.map(st => SCOPE_LABELS[st] ?? st).join(', ') },
                  { label: 'Contract Value', value: `${contractValue.toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: 2 })} ${currency}` },
                  { label: 'Retention', value: `${retentionPct}%` },
                  { label: 'Payment Milestones', value: `${paymentTerms.length} defined` },
                  { label: 'T&C Template', value: TEMPLATE_LABELS[templateType] ?? templateType },
                ].map(row => (
                  <div key={row.label} className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="font-medium text-sm">{row.value}</p>
                  </div>
                ))}
              </div>

              {scopeItems.length > 0 && (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 text-xs">Scope</th>
                        <th className="text-right p-2 text-xs">Qty</th>
                        <th className="text-left p-2 text-xs">Unit</th>
                        <th className="text-right p-2 text-xs">Rate</th>
                        <th className="text-right p-2 text-xs">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scopeItems.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{item.scopeLabel}</td>
                          <td className="p-2 text-right">{item.contractQuantity ?? '—'}</td>
                          <td className="p-2">{item.contractUnit}</td>
                          <td className="p-2 text-right">{item.unitRate ?? '—'}</td>
                          <td className="p-2 text-right font-semibold">{item.subtotal != null ? item.subtotal.toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: 2 }) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => handleSave('draft')}
                  variant="outline"
                  disabled={saving}
                  className="flex-1"
                >
                  {saving && submitAction === 'draft' ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSave('submit')}
                  disabled={saving}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {saving && submitAction === 'submit' ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Save & Submit for Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => step === 0 ? router.push('/supply-chain/subcontractors') : setStep(s => s - 1)}
          >
            <ChevronLeft className="size-4 mr-1" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 && (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Next
              <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
