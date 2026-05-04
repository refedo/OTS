'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
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
import { Loader2, RefreshCw, Pencil, X } from 'lucide-react';

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
  department: z.string().max(120).optional().or(z.literal('')),
  departmentId: z.string().optional().or(z.literal('')),
  occupation: z.string().max(120).optional().or(z.literal('')),
  section: z.string().max(60).optional().or(z.literal('')),
  division: z.string().max(80).optional().or(z.literal('')),
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
  isGosiSubject: z.boolean().optional(),
  gosiSalary: z.string().optional().or(z.literal('')),
  // Extended Dolibarr extrafields (19.5.0)
  employeeNo: z.string().max(20).optional().or(z.literal('')),
  boarderNumber: z.string().max(255).optional().or(z.literal('')),
  gender: z.enum(['MALE','FEMALE']).optional().or(z.literal('')),
  maritalStatus: z.string().max(50).optional().or(z.literal('')),
  occupationAr: z.string().max(100).optional().or(z.literal('')),
  gosiSubscriptionNo: z.string().max(100).optional().or(z.literal('')),
  contractEndDate: z.string().optional().or(z.literal('')),
  contractDuration: z.string().max(100).optional().or(z.literal('')),
  passportNumber: z.string().max(100).optional().or(z.literal('')),
  iqamaUrl: z.string().max(255).optional().or(z.literal('')),
  passportUrl: z.string().max(255).optional().or(z.literal('')),
  sponsorNumber: z.string().max(30).optional().or(z.literal('')),
  contractType: z.string().max(100).optional().or(z.literal('')),
  workingLocation: z.string().max(100).optional().or(z.literal('')),
  transferType: z.string().max(100).optional().or(z.literal('')),
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
  departments?: { id: string; name: string }[];
};

const SECTION_FALLBACK = ['Preparation', 'Fabrication', 'Other'];
const DIVISION_FALLBACK: string[] = [];
const OCCUPATION_FALLBACK: string[] = [];

export function EmployeeForm({
  initial,
  canViewCompensation,
  canResetToDolibarr,
  departments = [],
}: Props) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  // In edit mode the form is locked (read-only) by default; user must click Edit to unlock.
  const [isEditing, setIsEditing] = useState(!isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionOptions, setSectionOptions] = useState<string[]>(SECTION_FALLBACK);
  const [divisionOptions, setDivisionOptions] = useState<string[]>(DIVISION_FALLBACK);
  const [occupationOptions, setOccupationOptions] = useState<string[]>(OCCUPATION_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/hr/sections');
        if (!res.ok) return;
        const data = (await res.json()) as { name: string; archivedAt: string | null }[];
        if (cancelled) return;
        const active = data.filter((s) => !s.archivedAt).map((s) => s.name);
        // Preserve the current employee's section even if it's been archived,
        // so the dropdown doesn't silently drop it on edit.
        const current = initial?.section;
        const merged = current && !active.includes(current) ? [...active, current] : active;
        if (merged.length > 0) setSectionOptions(merged);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial?.section]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/hr/divisions');
        if (!res.ok) return;
        const data = (await res.json()) as { name: string; archivedAt: string | null }[];
        if (cancelled) return;
        const active = data.filter((s) => !s.archivedAt).map((s) => s.name);
        const current = initial?.division;
        const merged = current && !active.includes(current) ? [...active, current] : active;
        setDivisionOptions(merged);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial?.division]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/hr/occupations');
        if (!res.ok) return;
        const data = (await res.json()) as { name: string; archivedAt: string | null }[];
        if (cancelled) return;
        const active = data.filter((s) => !s.archivedAt).map((s) => s.name);
        const current = initial?.occupation;
        const merged = current && !active.includes(current) ? [...active, current] : active;
        setOccupationOptions(merged);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial?.occupation]);

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
      department: initial?.department ?? '',
      departmentId: initial?.departmentId ?? '',
      occupation: initial?.occupation ?? '',
      section: initial?.section ?? '',
      division: initial?.division ?? '',
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
      isGosiSubject: initial?.isGosiSubject ?? false,
      gosiSalary: initial?.gosiSalary ?? '',
      employeeNo: (initial as Record<string, unknown>)?.employeeNo as string ?? '',
      boarderNumber: (initial as Record<string, unknown>)?.boarderNumber as string ?? '',
      gender: (initial as Record<string, unknown>)?.gender as string ?? '',
      maritalStatus: (initial as Record<string, unknown>)?.maritalStatus as string ?? '',
      occupationAr: (initial as Record<string, unknown>)?.occupationAr as string ?? '',
      gosiSubscriptionNo: (initial as Record<string, unknown>)?.gosiSubscriptionNo as string ?? '',
      contractEndDate: (initial as Record<string, unknown>)?.contractEndDate as string ?? '',
      contractDuration: (initial as Record<string, unknown>)?.contractDuration as string ?? '',
      passportNumber: (initial as Record<string, unknown>)?.passportNumber as string ?? '',
      iqamaUrl: (initial as Record<string, unknown>)?.iqamaUrl as string ?? '',
      passportUrl: (initial as Record<string, unknown>)?.passportUrl as string ?? '',
      sponsorNumber: (initial as Record<string, unknown>)?.sponsorNumber as string ?? '',
      contractType: (initial as Record<string, unknown>)?.contractType as string ?? '',
      workingLocation: (initial as Record<string, unknown>)?.workingLocation as string ?? '',
      transferType: (initial as Record<string, unknown>)?.transferType as string ?? '',
    },
  });

  const salaryFields = useWatch({
    control: form.control,
    name: ['basicSalary', 'housingAllowance', 'transportAllowance', 'mobileAllowance', 'foodAllowance', 'otherAllowances'],
  });
  const totalSalary = salaryFields.reduce((sum, v) => sum + (parseFloat(v as string) || 0), 0);

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

  // Shorthand: fields are disabled when the form is locked (edit mode only)
  const locked = isEdit && !isEditing;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Edit / lock banner (edit mode only) */}
      {isEdit && (
        <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-2.5">
          <p className="text-sm text-slate-600">
            {isEditing ? 'Editing record — save or cancel when done.' : 'Record is locked. Click Edit to make changes.'}
          </p>
          {isEditing ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => { setIsEditing(false); form.reset(); setError(null); }}
            >
              <X className="h-3.5 w-3.5" /> Cancel editing
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>
      )}

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
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="documents">Documents & Contract</TabsTrigger>
          {canViewCompensation && <TabsTrigger value="compensation">Compensation</TabsTrigger>}
          {canViewCompensation && <TabsTrigger value="banking">Banking</TabsTrigger>}
        </TabsList>
        <fieldset disabled={locked} className="border-0 p-0 m-0 disabled:opacity-60">

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
                  disabled={locked}
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
                <Label>Position Title</Label>
                <Select
                  value={form.watch('occupation') || '__none__'}
                  onValueChange={(v) =>
                    form.setValue('occupation', v === '__none__' ? '' : v)
                  }
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {occupationOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select
                  value={form.watch('section') || '__none__'}
                  onValueChange={(v) =>
                    form.setValue('section', v === '__none__' ? '' : v)
                  }
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {sectionOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Division</Label>
                <Select
                  value={form.watch('division') || '__none__'}
                  onValueChange={(v) =>
                    form.setValue('division', v === '__none__' ? '' : v)
                  }
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {divisionOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select
                  value={form.watch('departmentId') || '__none__'}
                  onValueChange={(v) =>
                    form.setValue('departmentId', v === '__none__' ? '' : v)
                  }
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-4 space-y-6">
              {/* Identity documents */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Identity Documents</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employee No.</Label>
                    <Input {...form.register('employeeNo')} placeholder="e.g. 1023" />
                  </div>
                  <div>
                    <Label>Boarder Number</Label>
                    <Input {...form.register('boarderNumber')} />
                  </div>
                  <div>
                    <Label>Passport Number</Label>
                    <Input {...form.register('passportNumber')} />
                  </div>
                  <div>
                    <Label>Sponsor Number</Label>
                    <Input {...form.register('sponsorNumber')} />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <select {...form.register('gender')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div>
                    <Label>Marital Status</Label>
                    <Input {...form.register('maritalStatus')} placeholder="Single / Married" />
                  </div>
                  <div>
                    <Label>المسمى الوظيفي في الإقامة</Label>
                    <Input {...form.register('occupationAr')} dir="rtl" placeholder="عامل / مهندس" />
                  </div>
                  <div className="col-span-2">
                    <Label>Iqama URL <span className="text-xs text-muted-foreground">(Google Drive or direct link)</span></Label>
                    <Input {...form.register('iqamaUrl')} placeholder="https://drive.google.com/…" />
                  </div>
                  <div className="col-span-2">
                    <Label>Passport URL <span className="text-xs text-muted-foreground">(Google Drive or direct link)</span></Label>
                    <Input {...form.register('passportUrl')} placeholder="https://drive.google.com/…" />
                  </div>
                </div>
              </div>

              {/* Contract details */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contract Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contract Type</Label>
                    <Input {...form.register('contractType')} placeholder="Full time / Part time" />
                  </div>
                  <div>
                    <Label>Contract Duration</Label>
                    <Input {...form.register('contractDuration')} placeholder="1 Year / 2 Years" />
                  </div>
                  <div>
                    <Label>Contract End Date</Label>
                    <Input type="date" {...form.register('contractEndDate')} />
                  </div>
                  <div>
                    <Label>Working Location</Label>
                    <Input {...form.register('workingLocation')} placeholder="Site / Office / Remote" />
                  </div>
                  <div>
                    <Label>Transfer Type</Label>
                    <Input {...form.register('transferType')} placeholder="Sponsor Transfer (Internal)" />
                  </div>
                  <div>
                    <Label>GOSI Subscription #</Label>
                    <Input {...form.register('gosiSubscriptionNo')} />
                  </div>
                </div>
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
                <div className="col-span-2">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Total Salary (SAR)</span>
                    <span className="text-lg font-bold text-slate-800">
                      {totalSalary.toLocaleString('en-SA-u-ca-gregory', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="isGosiSubject"
                      {...form.register('isGosiSubject')}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isGosiSubject" className="cursor-pointer">
                      Subject to GOSI (General Organization for Social Insurance)
                    </Label>
                  </div>
                  <div>
                    <Label>GOSI salary (SAR) — leave blank to use basic + housing</Label>
                    <Input {...form.register('gosiSalary')} placeholder="0.00" />
                    <p className="text-xs text-muted-foreground mt-1">
                      The wage GOSI contributions are calculated on. Many employees have a
                      GOSI salary different from their basic salary.
                    </p>
                  </div>
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
        </fieldset>
      </Tabs>

      {(!isEdit || isEditing) && (
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create employee'}
        </Button>
      </div>
      )}
    </form>
  );
}
