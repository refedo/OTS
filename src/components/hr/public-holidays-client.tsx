'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

type Holiday = {
  id: string;
  date: string;
  nameEn: string;
  nameAr: string | null;
  isRecurring: boolean;
};

type Props = { holidays: Holiday[]; canManage: boolean };

export function PublicHolidaysClient({ holidays, canManage }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDate('');
    setNameEn('');
    setNameAr('');
    setIsRecurring(false);
    setAdding(false);
    setError(null);
  };

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/public-holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, nameEn, nameAr: nameAr || null, isRecurring }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this public holiday?')) return;
    try {
      const res = await fetch(`/api/hr/public-holidays/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Public Holidays</h1>
          <p className="text-sm text-muted-foreground">
            {holidays.length} holiday{holidays.length === 1 ? '' : 's'} configured
          </p>
        </div>
        {canManage && !adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add holiday
          </Button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 flex items-center gap-1">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {adding && canManage && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. National Day"
                />
              </div>
              <div>
                <Label htmlFor="nameAr">Name (Arabic)</Label>
                <Input
                  id="nameAr"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  dir="rtl"
                  placeholder="اليوم الوطني"
                />
              </div>
              <div className="flex items-end gap-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(v) => setIsRecurring(v === true)}
                />
                <Label htmlFor="recurring" className="cursor-pointer">
                  Recurs yearly
                </Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onCreate} disabled={busy || !date || !nameEn}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button variant="outline" onClick={reset} disabled={busy}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Name (EN)</th>
                <th className="p-3 font-medium">Name (AR)</th>
                <th className="p-3 font-medium">Recurring</th>
                {canManage && <th className="p-3 font-medium w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {holidays.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 5 : 4}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No public holidays configured yet.
                  </td>
                </tr>
              )}
              {holidays.map((h) => (
                <tr key={h.id} className="border-b hover:bg-muted/40">
                  <td className="p-3 font-mono text-xs">{h.date}</td>
                  <td className="p-3">{h.nameEn}</td>
                  <td className="p-3" dir="rtl">
                    {h.nameAr ?? '—'}
                  </td>
                  <td className="p-3">
                    {h.isRecurring ? (
                      <span className="text-xs text-green-700">Yearly</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">One-off</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(h.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
