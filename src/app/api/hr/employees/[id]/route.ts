/**
 * GET    /api/hr/employees/[id] — fetch a single employee
 * PUT    /api/hr/employees/[id] — update an employee and append the edited
 *                                 column names to `manuallyEditedFields`
 *                                 (preserve-on-edit marker for sync)
 * DELETE /api/hr/employees/[id] — soft-delete an employee
 *
 * Compensation gating: callers without `hr.employee.viewCompensation` cannot
 * read or write any of the compensation / banking columns. The PUT handler
 * strips them from the incoming body before diffing.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';

const COMPENSATION_FIELDS = [
  'basicSalary',
  'housingAllowance',
  'transportAllowance',
  'mobileAllowance',
  'foodAllowance',
  'otherAllowances',
  'bankName',
  'bankIban',
  'gosiSalary',
  'isGosiSubject',
] as const;

function stripCompensation<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const f of COMPENSATION_FIELDS) delete out[f];
  return out as T;
}

const updateSchema = z.object({
  fullNameEn: z.string().min(1).max(255).optional(),
  fullNameAr: z.string().max(255).nullable().optional(),
  nationalId: z.string().max(32).nullable().optional(),
  nationality: z.string().max(80).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  dateOfJoining: z.string().optional(),
  dateOfLeaving: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']).optional(),
  department: z.string().max(120).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  occupation: z.string().max(120).nullable().optional(),
  section: z.string().max(60).nullable().optional(),
  division: z.string().max(80).nullable().optional(),
  jobTitleEn: z.string().max(200).nullable().optional(),
  jobTitleAr: z.string().max(200).nullable().optional(),
  reportsToId: z.string().uuid().nullable().optional(),
  basicSalary: z.union([z.string(), z.number()]).optional(),
  housingAllowance: z.union([z.string(), z.number()]).optional(),
  transportAllowance: z.union([z.string(), z.number()]).optional(),
  mobileAllowance: z.union([z.string(), z.number()]).optional(),
  foodAllowance: z.union([z.string(), z.number()]).optional(),
  otherAllowances: z.union([z.string(), z.number()]).optional(),
  standardDailyHours: z.number().int().min(0).max(24).optional(),
  workWeekDaysCount: z.number().int().min(0).max(7).optional(),
  bankName: z.string().max(200).nullable().optional(),
  bankIban: z
    .string()
    .regex(/^SA\d{22}$/, 'IBAN must be SA + 22 digits')
    .nullable()
    .optional(),
  isGosiSubject: z.boolean().optional(),
  gosiSalary: z.union([z.string(), z.number()]).nullable().optional(),
  // Extended Dolibarr extrafields (19.5.0)
  employeeNo: z.string().max(20).nullable().optional(),
  boarderNumber: z.string().max(255).nullable().optional(),
  gender: z.enum(['MALE','FEMALE']).nullable().optional(),
  maritalStatus: z.string().max(50).nullable().optional(),
  occupationAr: z.string().max(100).nullable().optional(),
  gosiSubscriptionNo: z.string().max(100).nullable().optional(),
  contractEndDate: z.string().nullable().optional(),
  contractDuration: z.string().max(100).nullable().optional(),
  passportNumber: z.string().max(100).nullable().optional(),
  iqamaUrl: z.string().max(255).nullable().optional(),
  passportUrl: z.string().max(255).nullable().optional(),
  sponsorNumber: z.string().max(30).nullable().optional(),
  contractType: z.string().max(100).nullable().optional(),
  workingLocation: z.string().max(100).nullable().optional(),
  transferType: z.string().max(100).nullable().optional(),
  deleteReason: z.string().max(500).optional(),
});

// Columns that count as "manually edited" when the HR user touches them.
// Must match the fields the sync service projects from Dolibarr.
const TRACKED_SYNC_FIELDS = [
  'fullNameEn',
  'fullNameAr',
  'nationalId',
  'dateOfJoining',
  'dateOfLeaving',
  'status',
  'department',
  'departmentId',
  'occupation',
  'section',
  'division',
  'basicSalary',
  'bankName',
  'bankIban',
  'isGosiSubject',
  'gosiSalary',
  'nationality',
  'employeeNo',
  'boarderNumber',
  'maritalStatus',
  'occupationAr',
  'gosiSubscriptionNo',
  'contractEndDate',
  'contractDuration',
  'passportNumber',
  'iqamaUrl',
  'passportUrl',
  'sponsorNumber',
  'contractType',
  'workingLocation',
  'transferType',
] as const;

async function getSessionOrUnauthorized() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  return session;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrUnauthorized();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  const canView = await checkPermission('hr.employee.view');
  let isSelfAccess = false;

  if (!canView) {
    // Allow self-access if the caller has hr.employee.viewOwn and the record belongs to them
    const canViewOwn = await checkPermission('hr.employee.viewOwn');
    if (canViewOwn) {
      const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { employeeId: true } });
      if (me?.employeeId === id) {
        isSelfAccess = true;
      }
    }
    if (!isSelfAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await getCurrentUserPermissions();
  // Self-access never reveals compensation regardless of other permissions
  const canViewComp = !isSelfAccess && permissions.includes('hr.employee.viewCompensation');

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
  });
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const payload = canViewComp
    ? employee
    : stripCompensation(employee as unknown as Record<string, unknown>);
  return NextResponse.json(payload);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrUnauthorized();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canEdit = await checkPermission('hr.employee.edit');
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const permissions = await getCurrentUserPermissions();
  const canViewComp = permissions.includes('hr.employee.viewCompensation');

  const { id } = await context.params;
  const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Strip compensation fields if caller lacks permission
  if (!canViewComp) {
    for (const f of COMPENSATION_FIELDS) {
      delete (data as Record<string, unknown>)[f];
    }
  }

  // Build update payload + track which sync-relevant fields were touched
  const editedNow = new Set<string>(
    Array.isArray(existing.manuallyEditedFields)
      ? (existing.manuallyEditedFields as string[])
      : [],
  );
  const updateData: Record<string, unknown> = {
    updatedById: session.sub,
  };

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === 'dateOfBirth' || key === 'dateOfJoining' || key === 'dateOfLeaving' || key === 'contractEndDate') {
      updateData[key] = value ? new Date(value as string) : null;
    } else if (
      key === 'basicSalary' ||
      key === 'housingAllowance' ||
      key === 'transportAllowance' ||
      key === 'mobileAllowance' ||
      key === 'foodAllowance' ||
      key === 'otherAllowances'
    ) {
      updateData[key] = String(value);
    } else if (key === 'gosiSalary') {
      updateData[key] = value === null ? null : String(value);
    } else {
      updateData[key] = value;
    }
    if ((TRACKED_SYNC_FIELDS as readonly string[]).includes(key)) {
      editedNow.add(key);
    }
  }

  updateData.manuallyEditedFields = Array.from(editedNow);

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    logger.info(
      { employeeId: id, editedFields: Array.from(editedNow), updatedById: session.sub },
      '[HR] Employee updated',
    );

    const payload = canViewComp
      ? updated
      : stripCompensation(updated as unknown as Record<string, unknown>);
    return NextResponse.json(payload);
  } catch (error) {
    logger.error({ error, employeeId: id }, '[HR] Failed to update employee');
    const msg = error instanceof Error ? error.message : 'Failed to update';
    if (msg.includes('Unique')) {
      return NextResponse.json({ error: 'National ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrUnauthorized();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canDelete = await checkPermission('hr.employee.delete');
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let deleteReason: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.deleteReason === 'string') {
      deleteReason = body.deleteReason.slice(0, 500);
    }
  } catch {
    // no body — fine
  }

  await prisma.employee.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: session.sub,
      deleteReason,
    },
  });

  logger.info({ employeeId: id, deletedById: session.sub }, '[HR] Employee soft-deleted');
  return NextResponse.json({ success: true });
}
