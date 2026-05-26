'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { ItemCombobox } from '@/components/inv/item-combobox';
import type { InvItem } from '@/components/inv/item-combobox';

interface InvWarehouse { id: string; code: string; name: string; type: string; }
interface InvLocation { id: string; code: string; name: string; siteId: string; }

const SITES = [{ id: 'F001', label: 'Factory 001' }, { id: 'F003', label: 'Factory 003' }];

export default function NewReturnPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [returnType, setReturnType] = useState<'UNUSED_STOCK' | 'OFFCUT'>('UNUSED_STOCK');
  const [siteId, setSiteId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [mirOutRef, setMirOutRef] = useState('');

  const [items, setItems] = useState<InvItem[]>([]);
  const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
  const [locations, setLocations] = useState<InvLocation[]>([]);

  useEffect(() => {
    if (!siteId) return;
    Promise.all([
      fetch(`/api/inv/items?activeOnly=true`).then(r => r.json()),
      fetch(`/api/inv/warehouses?siteId=${siteId}&activeOnly=true`).then(r => r.json()),
      fetch(`/api/inv/locations?siteId=${siteId}&activeOnly=true`).then(r => r.json()),
    ]).then(([itemData, whData, locData]) => {
      setItems(Array.isArray(itemData) ? itemData : []);
      setWarehouses(Array.isArray(whData) ? whData : []);
      setLocations(Array.isArray(locData) ? locData : []);
    });
  }, [siteId]);

  // Auto-set warehouse based on return type
  useEffect(() => {
    if (!siteId || warehouses.length === 0) return;
    if (returnType === 'OFFCUT') {
      const offcutWh = warehouses.find(w => w.type === 'OFFCUT');
      if (offcutWh) setWarehouseId(offcutWh.id);
    } else {
      const rmWh = warehouses.find(w => w.type === 'RAW_MATERIAL');
      if (rmWh) setWarehouseId(rmWh.id);
    }
  }, [returnType, siteId, warehouses]);

  const isValid = siteId && locationId && warehouseId && itemId && parseFloat(quantity) > 0 &&
    (returnType !== 'OFFCUT' || description.trim().length > 5);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/inv/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnType,
          siteId,
          locationId,
          warehouseId,
          itemId,
          quantity: parseFloat(quantity),
          description: description || null,
          mirOutId: mirOutRef || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create return'); return; }
      router.push('/inv/returns');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = items.find(i => i.id === itemId);
  const offcutWarehouse = warehouses.find(w => w.type === 'OFFCUT');

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Material Return</h1>
        <p className="text-muted-foreground text-sm mt-1">HEXA-FRM-030</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Return Details</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {/* Return Type */}
          <div className="space-y-2">
            <Label>Return Type *</Label>
            <div className="flex gap-3">
              {(['UNUSED_STOCK', 'OFFCUT'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReturnType(type)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    returnType === type ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {type === 'UNUSED_STOCK' ? '📦 Unused Stock' : '✂️ Off-cut'}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {returnType === 'UNUSED_STOCK'
                ? 'Intact material returned to the Raw Material Warehouse.'
                : 'Cut remainder returned to the Off-cuts Warehouse. Description is mandatory.'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Factory *</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger><SelectValue placeholder="Select factory" /></SelectTrigger>
                <SelectContent>{SITES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Location *</Label>
              <Select value={locationId} onValueChange={setLocationId} disabled={!siteId}>
                <SelectTrigger><SelectValue placeholder="Production location" /></SelectTrigger>
                <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Item *</Label>
              <ItemCombobox
                value={itemId}
                onSelect={item => setItemId(item?.id ?? '')}
                disabled={!siteId}
                placeholder="Search items from master list..."
                items={items}
              />
            </div>

            <div className="space-y-2">
              <Label>Destination Warehouse *</Label>
              <Select
                value={warehouseId}
                onValueChange={setWarehouseId}
                disabled={!siteId || returnType === 'OFFCUT'}
              >
                <SelectTrigger><SelectValue placeholder="Warehouse" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.code} ({w.type.replace('_', ' ')})</SelectItem>)}</SelectContent>
              </Select>
              {returnType === 'OFFCUT' && (
                <p className="text-xs text-muted-foreground">Locked to Off-cuts Warehouse: {offcutWarehouse?.code || 'OC-WH'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
                {selectedItem && <span className="text-sm text-muted-foreground whitespace-nowrap">{selectedItem.unit}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Original MIR-OUT Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="e.g. MIR-OUT-2026-0001" value={mirOutRef} onChange={e => setMirOutRef(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Description {returnType === 'OFFCUT' ? <span className="text-red-500 text-xs ml-1">* Required for off-cuts</span> : <span className="text-muted-foreground text-xs">(optional)</span>}
            </Label>
            <Textarea
              placeholder={returnType === 'OFFCUT' ? 'Describe the off-cut piece: type, dimensions, condition (e.g. IPE 200 — 0.85m length, good condition)' : 'Optional description'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isValid || submitting}>
              {submitting ? 'Submitting...' : 'Submit Return'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
