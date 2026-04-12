'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional().or(z.literal('')),
  contactPerson: z.string().max(200).optional().or(z.literal('')),
  contactPhone: z.string().max(40).optional().or(z.literal('')),
  contractRef: z.string().max(120).optional().or(z.literal('')),
  contractStart: z.string().optional().or(z.literal('')),
  contractEnd: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']),
});

type FormValues = z.infer<typeof schema>;

export type AgencyFormInitial = Partial<FormValues> & { id?: string };

export function AgencyForm({ initial }: { initial?: AgencyFormInitial | null }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameEn: initial?.nameEn ?? '',
      nameAr: initial?.nameAr ?? '',
      contactPerson: initial?.contactPerson ?? '',
      contactPhone: initial?.contactPhone ?? '',
      contractRef: initial?.contractRef ?? '',
      contractStart: initial?.contractStart ?? '',
      contractEnd: initial?.contractEnd ?? '',
      status: (initial?.status as FormValues['status']) ?? 'ACTIVE',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...values };
      for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null;
      const url = isEdit ? `/api/hr/agencies/${initial!.id}` : '/api/hr/agencies';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (HTTP ${res.status})`);
      }
      const saved = await res.json();
      router.push(`/hr/agencies/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-4">
          <div>
            <Label>Name (English)</Label>
            <Input {...form.register('nameEn')} />
          </div>
          <div>
            <Label>الاسم (عربي)</Label>
            <Input {...form.register('nameAr')} dir="rtl" />
          </div>
          <div>
            <Label>Contact person</Label>
            <Input {...form.register('contactPerson')} />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input {...form.register('contactPhone')} />
          </div>
          <div>
            <Label>Contract ref</Label>
            <Input {...form.register('contractRef')} />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as FormValues['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contract start</Label>
            <Input type="date" {...form.register('contractStart')} />
          </div>
          <div>
            <Label>Contract end</Label>
            <Input type="date" {...form.register('contractEnd')} />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
