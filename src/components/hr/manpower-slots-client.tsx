'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';

type Slot = {
  id: string;
  slotCode: string;
  trade: string;
  hourlyRate: string;
  cardStatus: string;
  notes: string | null;
  agency: { id: string; nameEn: string; nameAr: string | null };
};

type Agency = { id: string; nameEn: string; nameAr: string | null };

type Props = { slots: Slot[]; agencies: Agency[]; canManage: boolean };

const CARD_COLOURS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
  RETURNED: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
};

export function ManpowerSlotsClient({ slots, agencies, canManage }: Props) {
  const router = useRouter();
  const [bulkOpen, setBulkOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, { agency: Agency; slots: Slot[] }>();
    for (const s of slots) {
      const key = s.agency.id;
      if (!map.has(key)) {
        map.set(key, { agency: s.agency, slots: [] });
      }
      map.get(key)!.slots.push(s);
    }
    return Array.from(map.values());
  }, [slots]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manpower Slots</h1>
          <p className="text-sm text-muted-foreground">
            {slots.length} slots across {grouped.length} agencies
          </p>
        </div>
        {canManage && (
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Bulk create
              </Button>
            </DialogTrigger>
            <BulkCreateDialog
              agencies={agencies}
              onDone={() => {
                setBulkOpen(false);
                router.refresh();
              }}
            />
          </Dialog>
        )}
      </div>

      {grouped.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No slots yet. Create an agency first, then bulk-create slots for it.
          </CardContent>
        </Card>
      )}

      {grouped.map((g) => (
        <Card key={g.agency.id}>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-medium">
              {g.agency.nameEn}{' '}
              <span className="text-muted-foreground text-sm">({g.slots.length} slots)</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2 font-medium">Code</th>
                    <th className="p-2 font-medium">Trade</th>
                    <th className="p-2 font-medium">Hourly rate</th>
                    <th className="p-2 font-medium">Card</th>
                    <th className="p-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {g.slots.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="p-2 font-mono">{s.slotCode}</td>
                      <td className="p-2">{s.trade}</td>
                      <td className="p-2">{Number(s.hourlyRate).toLocaleString()} SAR/hr</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${CARD_COLOURS[s.cardStatus] ?? ''}`}
                        >
                          {s.cardStatus}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{s.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BulkCreateDialog({
  agencies,
  onDone,
}: {
  agencies: Agency[];
  onDone: () => void;
}) {
  const [agencyId, setAgencyId] = useState(agencies[0]?.id ?? '');
  const [trade, setTrade] = useState('Welder');
  const [hourlyRate, setHourlyRate] = useState('30');
  const [count, setCount] = useState('5');
  const [prefix, setPrefix] = useState('SH-W');
  const [startNumber, setStartNumber] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/manpower-slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          trade,
          hourlyRate: Number(hourlyRate),
          count: Number(count),
          prefix,
          startNumber: Number(startNumber),
          padWidth: 2,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Bulk create manpower slots</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div>
          <Label>Agency</Label>
          <Select value={agencyId} onValueChange={setAgencyId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agencies.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Trade</Label>
            <Input value={trade} onChange={(e) => setTrade(e.target.value)} />
          </div>
          <div>
            <Label>Hourly rate (SAR)</Label>
            <Input value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
          </div>
          <div>
            <Label>Count</Label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div>
            <Label>Prefix</Label>
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <div>
            <Label>Start number</Label>
            <Input
              type="number"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Example: prefix <code>SH-W</code>, start 1, count 5 → SH-W01…SH-W05
        </p>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={submitting || !agencyId}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
