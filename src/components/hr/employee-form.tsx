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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Shared create/edit form for Employees. In create mode, `initial` is null;
 * in edit mode, `initial` seeds the defaults and submits via PUT.
 *
 * Compensation & banking inputs are only rendered if `canViewCompensation`
 * is true. Arabic name & job title inputs set `dir="rtl"` so native RTL
 * caret + punctuation work correctly.
 */

const schema = z.object({
  employmentId: z.string().min(1).max(64),
  fullNameEn: z.string().min(1).max(255),
  fullNameAr: z.string().max(255).optional().or(z.literal('')),
  nationalId: z.string().max(32).optional().or(z.literal('')),
  nationality: z.string().max(80).optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  dateOfJoining: z.string().min(1, 'Required'),
  dateOfLeaving: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']),
  trade: z.string().max(120).optional().or(z.literal('')),
  department: z.string().max(120).optional().or(z.literal('')),
  jobTitleEn: z.string().max(200).optional().or(z.literal('')),
  jobTitleAr: z.string().max(200).optional().or(z.literal('')),
  basicSalary: z.string().optional().or(z.literal('')),
  housingAllowance: z.string().optional().or(z.literal('')),
  transportAllowance: z.string().optional().or(z.literal('')),
  mobileAllowance: z.string().optional().or(z.literal('')),
  foodAllowance: z.string().optional().or(z.literal('')),
  otherAllowances: z.string().optional().or(z.literal('')),
  standardDailyHours: z.coerce.number().int().min(0).max(24),
  workWeekDaysCount: z.coerce.number().int().min(0).max(7),
  bankName: z.string().max(200).optional().or(z.literal('')),
  bankIban: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^SA\d{22}$/.test(v), 'IBAN must be SA + 22 digits'),
});

type FormValues = z.infer<typeof schema>;

export type EmployeeFormInitial = Partial<FormValues> & {
  id?: string;
  manuallyEditedFields?: string[];
};

type Props = {
  initial?: EmployeeFormInitial | null;
  canViewCompensation: boolean;
  canResetToDolibarr: boolean;
};

export function EmployeeForm({ initial, canViewCompensation, canResetToDolibarr }: Props) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employmentId: initial?.employmentId ?? '',
      fullNameEn: initial?.fullNameEn ?? '',
      fullNameAr: initial?.fullNameAr ?? '',
      nationalId: initial?.nationalId ?? '',
      nationality: initial?.nationality ?? '',
      dateOfBirth: initial?.dateOfBirth ?? '',
      dateOfJoining: initial?.dateOfJoining ?? '',
      dateOfLeaving: initial?.dateOfLeaving ?? '',
      status: (initial?.status as FormValues['status']) ?? 'ACTIVE',
      trade: initial?.trade ?? '',
      department: initial?.department ?? '',
      jobTitleEn: initial?.jobTitleEn ?? '',
      jobTitleAr: initial?.jobTitleAr ?? '',
      basicSalary: initial?.basicSalary ?? '',
      housingAllowance: initial?.housingAllowance ?? '',
      transportAllowance: initial?.transportAllowance ?? '',
      mobileAllowance: initial?.mobileAllowance ?? '',
      foodAllowance: initial?.foodAllowance ?? '',
      otherAllowances: initial?.otherAllowances ?? '',
      standardDailyHours: initial?.standardDailyHours ?? 8,
      workWeekDaysCount: initial?.workWeekDaysCount ?? 6,
      bankName: initial?.bankName ?? '',
      bankIban: initial?.bankIban ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...values };
      // Normalise empty strings to null on nullable fields
      for (const k of Object.keys(payload)) {
        if (payload[k] === '') payload[k] = null;
      }
      const url = isEdit ? `/api/hr/employees/${initial!.id}` : '/api/hr/employees';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (HTTP ${res.status})`);
      }
      const saved = await res.json();
      router.push(`/hr/employees/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const onReset = async () => {
    if (!initial?.id) return;
    if (
      !confirm(
        'Reset this employee to Dolibarr? The next sync will overwrite all locally-edited fields with upstream values. This cannot be undone.',
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch(`/api/hr/employees/${initial.id}/reset-to-dolibarr`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Reset failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {isEdit && initial?.manuallyEditedFields && initial.manuallyEditedFields.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-medium">Locally edited fields (preserved on sync):</div>
          <div className="mt-1">{initial.manuallyEditedFields.join(', ')}</div>
          {canResetToDolibarr && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onReset}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reset to Dolibarr
            </Button>
          )}
        </div>
      )}

      <Tabs defaultValue="personal" className="w-full">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          {canViewCompensation && <TabsTrigger value="compensation">Compensation</TabsTrigger>}
          {canViewCompensation && <TabsTrigger value="banking">Banking</TabsTrigger>}
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
              <div>
                <Label>Employment ID</Label>
                <Input {...form.register('employmentId')} disabled={isEdit} />
              </div>
              <div>
                <Label>National ID / Iqama</Label>
                <Input {...form.register('nationalId')} />
              </div>
              <div>
                <Label>Full name (English)</Label>
                <Input {...form.register('fullNameEn')} />
              </div>
              <div>
                <Label>الاسم الكامل (عربي)</Label>
                <Input {...form.register('fullNameAr')} dir="rtl" />
              </div>
              <div>
                <Label>Nationality</Label>
                <Input {...form.register('nationality')} />
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input type="date" {...form.register('dateOfBirth')} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
              <div>
                <Label>Date of joining</Label>
                <Input type="date" {...form.register('dateOfJoining')} />
              </div>
              <div>
                <Label>Date of leaving</Label>
                <Input type="date" {...form.register('dateOfLeaving')} />
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
                    <SelectItem value="ON_LEAVE">On leave</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                    <SelectItem value="RESIGNED">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trade</Label>
                <Input {...form.register('trade')} />
              </div>
              <div>
                <Label>Department</Label>
                <Input {...form.register('department')} />
              </div>
              <div>
                <Label>Job title (English)</Label>
                <Input {...form.register('jobTitleEn')} />
              </div>
              <div>
                <Label>المسمى الوظيفي (عربي)</Label>
                <Input {...form.register('jobTitleAr')} dir="rtl" />
              </div>
              <div>
                <Label>Standard daily hours</Label>
                <Input type="number" {...form.register('standardDailyHours')} />
              </div>
              <div>
                <Label>Work week (days)</Label>
                <Input type="number" {...form.register('workWeekDaysCount')} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewCompensation && (
          <TabsContent value="compensation">
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <Label>Basic salary (SAR)</Label>
                  <Input {...form.register('basicSalary')} />
                </div>
                <div>
                  <Label>Housing allowance</Label>
                  <Input {...form.register('housingAllowance')} />
                </div>
                <div>
                  <Label>Transport allowance</Label>
                  <Input {...form.register('transportAllowance')} />
                </div>
                <div>
                  <Label>Mobile allowance</Label>
                  <Input {...form.register('mobileAllowance')} />
                </div>
                <div>
                  <Label>Food allowance</Label>
                  <Input {...form.register('foodAllowance')} />
                </div>
                <div>
                  <Label>Other allowances</Label>
                  <Input {...form.register('otherAllowances')} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canViewCompensation && (
          <TabsContent value="banking">
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <Label>Bank name</Label>
                  <Input {...form.register('bankName')} />
                </div>
                <div>
                  <Label>IBAN</Label>
                  <Input
                    {...form.register('bankIban')}
                    placeholder="SA0000000000000000000000"
                  />
                  {form.formState.errors.bankIban && (
                    <p className="text-xs text-red-600 mt-1">
                      {form.formState.errors.bankIban.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create employee'}
        </Button>
      </div>
    </form>
  );
}
