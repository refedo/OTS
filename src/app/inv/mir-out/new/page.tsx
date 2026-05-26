'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { ItemCombobox } from '@/components/inv/item-combobox';
import { EmployeeSelect } from '@/components/inv/employee-select';

interface InvItem {
  id: string; code: string; name: string; unit: string; category: string; defaultWhType: string;
}
interface InvWarehouse {
  id: string; code: string; name: string; type: string; siteId: string;
}
interface InvLocation {
  id: string; code: string; name: string; siteId: string;
}
interface Project {
  id: string; projectNumber: string; name: string; status: string;
}
interface LineItem {
  id: string;
  itemId: string;
  warehouseId: string;
  qtyRequested: number;
  item?: InvItem;
  warehouse?: InvWarehouse;
  availableQty?: number | null;
  error?: string;
}

const SITES = [
  { id: 'F001', label: 'Factory 001' },
  { id: 'F003', label: 'Factory 003' },
];

export default function NewMirOutPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 1 state
  const [materialType, setMaterialType] = useState<'RAW_MATERIAL' | 'CONSUMABLE'>('RAW_MATERIAL');
  const [siteId, setSiteId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [handedToId, setHandedToId] = useState('');

  // Step 2 state
  const [lines, setLines] = useState<LineItem[]>([{ id: crypto.randomUUID(), itemId: '', warehouseId: '', qtyRequested: 0 }]);

  // Lookup data
  const [items, setItems] = useState<InvItem[]>([]);
  const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
  const [locations, setLocations] = useState<InvLocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Fetch lookup data when siteId or materialType changes
  useEffect(() => {
    if (!siteId) return;
    Promise.all([
      fetch(`/api/inv/items?activeOnly=true${materialType === 'RAW_MATERIAL' ? '&whType=RAW_MATERIAL' : '&whType=CONSUMABLE'}`).then(r => r.json()),
      fetch(`/api/inv/warehouses?siteId=${siteId}&activeOnly=true`).then(r => r.json()),
      fetch(`/api/inv/locations?siteId=${siteId}&activeOnly=true`).then(r => r.json()),
    ]).then(([itemData, whData, locData]) => {
      setItems(Array.isArray(itemData) ? itemData : []);
      setWarehouses(Array.isArray(whData) ? whData : []);
      setLocations(Array.isArray(locData) ? locData : []);
    });
  }, [siteId, materialType]);

  // Fetch active projects
  useEffect(() => {
    if (materialType !== 'RAW_MATERIAL') return;
    fetch('/api/projects?status=Active').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : (data?.projects ?? []));
    });
  }, [materialType]);

  const fetchBalance = useCallback(async (warehouseId: string, itemId: string) => {
    if (!warehouseId || !itemId) return null;
    try {
      const res = await fetch(`/api/inv/balance?warehouseId=${warehouseId}&itemId=${itemId}`);
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data[0].quantity : 0;
    } catch {
      return null;
    }
  }, []);

  const updateLine = async (id: string, updates: Partial<LineItem>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));

    // If item or warehouse changed, re-fetch balance and auto-suggest warehouse
    if (updates.itemId !== undefined || updates.warehouseId !== undefined) {
      setLines(prev => {
        return prev.map(l => {
          if (l.id !== id) return l;
          const updated = { ...l, ...updates };

          // Auto-suggest warehouse from item's defaultWhType
          if (updates.itemId) {
            const item = items.find(i => i.id === updates.itemId);
            updated.item = item;
            if (item && !updated.warehouseId) {
              const suggestedWh = warehouses.find(w => w.type === item.defaultWhType);
              if (suggestedWh) updated.warehouseId = suggestedWh.id;
            }
          }
          if (updates.warehouseId) {
            updated.warehouse = warehouses.find(w => w.id === updates.warehouseId);
          }
          return updated;
        });
      });

      // Fetch balance after state update
      setTimeout(async () => {
        setLines(prev => {
          const line = prev.find(l => l.id === id);
          if (!line) return prev;
          const wId = updates.warehouseId ?? line.warehouseId;
          const iId = updates.itemId ?? line.itemId;
          if (wId && iId) {
            fetchBalance(wId, iId).then(qty => {
              setLines(p => p.map(l => l.id === id ? { ...l, availableQty: qty } : l));
            });
          }
          return prev;
        });
      }, 0);
    }
  };

  const addLine = () => {
    setLines(prev => [...prev, { id: crypto.randomUUID(), itemId: '', warehouseId: '', qtyRequested: 0 }]);
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const step1Valid = siteId && locationId && (materialType === 'CONSUMABLE' || projectId);
  const linesValid = lines.length > 0 && lines.every(l => l.itemId && l.warehouseId && l.qtyRequested > 0 &&
    (l.availableQty === null || l.availableQty === undefined || l.qtyRequested <= l.availableQty)
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/inv/mir-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialType,
          siteId,
          projectId: materialType === 'RAW_MATERIAL' ? projectId : null,
          locationId,
          notes: notes || null,
          handedToId: handedToId || null,
          lines: lines.map(l => ({ itemId: l.itemId, warehouseId: l.warehouseId, qtyRequested: l.qtyRequested })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to create request');
        return;
      }
      router.push(`/inv/mir-out/${data.id}`);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Material Disburse</h1>
        <p className="text-muted-foreground text-sm mt-1">HEXA-FRM-029</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 text-sm ${step === 1 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>1</span>
          Header
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 text-sm ${step === 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>2</span>
          Line Items
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Request Header</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Material Type toggle */}
            <div className="space-y-2">
              <Label>Material Type *</Label>
              <div className="flex gap-3">
                {(['RAW_MATERIAL', 'CONSUMABLE'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMaterialType(type)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                      materialType === type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {type === 'RAW_MATERIAL' ? '🔩 Raw Material' : '🧰 Consumable'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {materialType === 'RAW_MATERIAL'
                  ? 'Raw material requires a linked active project. Storekeeper issues directly.'
                  : 'Consumables go through Production Engineer approval before issuing.'}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Factory *</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger><SelectValue placeholder="Select factory" /></SelectTrigger>
                  <SelectContent>
                    {SITES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {materialType === 'RAW_MATERIAL' && (
                <div className="space-y-2">
                  <Label>Project *</Label>
                  <Select value={projectId} onValueChange={setProjectId} disabled={!siteId}>
                    <SelectTrigger><SelectValue placeholder="Select active project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.projectNumber} — {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Production Location *</Label>
                <Select value={locationId} onValueChange={setLocationId} disabled={!siteId}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Handed To / Received By <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <EmployeeSelect value={handedToId} onValueChange={setHandedToId} placeholder="Select employee..." />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                Continue to Items <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Qty Requested</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(line => {
                  const overQty = line.availableQty !== null && line.availableQty !== undefined && line.qtyRequested > line.availableQty;
                  const nearLimit = line.availableQty !== null && line.availableQty !== undefined && line.qtyRequested > line.availableQty * 0.8;
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="min-w-[220px]">
                        <ItemCombobox
                          value={line.itemId}
                          onSelect={(item) => updateLine(line.id, { itemId: item?.id ?? '', item: item ?? undefined })}
                          disabled={!siteId}
                          placeholder="Search items..."
                          items={items}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <Select value={line.warehouseId} onValueChange={v => updateLine(line.id, { warehouseId: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                          <SelectContent>
                            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.code}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.item?.unit || '—'}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <Input
                          type="number"
                          min={0}
                          className={`h-8 text-sm ${overQty ? 'border-red-500' : nearLimit ? 'border-yellow-500' : ''}`}
                          value={line.qtyRequested || ''}
                          onChange={e => updateLine(line.id, { qtyRequested: parseFloat(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        {line.availableQty !== null && line.availableQty !== undefined ? (
                          <span className={`text-sm font-medium ${overQty ? 'text-red-600' : nearLimit ? 'text-yellow-600' : 'text-green-600'}`}>
                            {line.availableQty.toLocaleString()} {line.item?.unit}
                          </span>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                        {overQty && <div className="text-xs text-red-600 mt-0.5">Exceeds available</div>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeLine(line.id)} disabled={lines.length === 1}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={!linesValid || submitting}>
                {submitting ? 'Submitting...' : materialType === 'CONSUMABLE' ? 'Submit for Approval' : 'Create Draft'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
