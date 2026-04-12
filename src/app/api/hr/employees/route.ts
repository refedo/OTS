/**
 * GET /api/hr/employees — list employees with filters
 * POST /api/hr/employees — manually create an employee (strips compensation
 *   fields if caller lacks `hr.employee.viewCompensation`)
 *
 * Compensation visibility: when the caller lacks `hr.employee.viewCompensation`
 * the serialiser strips basicSalary, all allowances, and bank fields from
 * both list and create responses. The POST handler also drops those fields
 * from the incoming body before persisting, so a non-compensation HR user
 * cannot sneak values in via a crafted request.
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
] as const;

function stripCompensation<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const f of COMPENSATION_FIELDS) delete out[f];
  return out as T;
}

const createSchema = z.object({
  employmentId: z.string().min(1).max(64),
  fullNameEn: z.string().min(1).max(255),
  fullNameAr: z.string().max(255).nullable().optional(),
  nationalId: z.string().max(32).nullable().optional(),
  nationality: z.string().max(80).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  dateOfJoining: z.string().min(1),
  dateOfLeaving: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED']).optional(),
  trade: z.string().max(120).nullable().optional(),
  department: z.string().max(120).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  occupation: z.string().max(120).nullable().optional(),
  section: z.string().max(60).nullable().optional(),
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
});

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.employee.view');
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await getCurrentUserPermissions();
  const canViewComp = permissions.includes('hr.employee.viewCompensation');

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const trade = searchParams.get('trade');
  const department = searchParams.get('department');
  const search = searchParams.get('search');

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (trade) where.trade = trade;
  if (department) where.department = department;
  if (search && search.trim() !== '') {
    where.OR = [
      { fullNameEn: { contains: search } },
      { fullNameAr: { contains: search } },
      { employmentId: { contains: search } },
      { nationalId: { contains: search } },
    ];
  }

  const rows = await prisma.employee.findMany({
    where,
    orderBy: { fullNameEn: 'asc' },
  });

  const payload = canViewComp ? rows : rows.map((r) => stripCompensation(r as unknown as Record<string, unknown>));
  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canCreate = await checkPermission('hr.employee.create');
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getCurrentUserPermissions();
  const canViewComp = permissions.includes('hr.employee.viewCompensation');

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // If caller cannot view compensation, strip those fields from the payload
  // so they can't sneak values in via a crafted request.
  if (!canViewComp) {
    for (const f of COMPENSATION_FIELDS) {
      delete (data as Record<string, unknown>)[f];
    }
  }

  try {
    const employee = await prisma.employee.create({
      data: {
        employmentId: data.employmentId,
        fullNameEn: data.fullNameEn,
        fullNameAr: data.fullNameAr ?? null,
        nationalId: data.nationalId ?? null,
        nationality: data.nationality ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        dateOfJoining: new Date(data.dateOfJoining),
        dateOfLeaving: data.dateOfLeaving ? new Date(data.dateOfLeaving) : null,
        status: data.status ?? 'ACTIVE',
        trade: data.trade ?? null,
        department: data.department ?? null,
        departmentId: data.departmentId ?? null,
        occupation: data.occupation ?? null,
        section: data.section ?? null,
        jobTitleEn: data.jobTitleEn ?? null,
        jobTitleAr: data.jobTitleAr ?? null,
        reportsToId: data.reportsToId ?? null,
        basicSalary: data.basicSalary !== undefined ? String(data.basicSalary) : '0.00',
        housingAllowance: data.housingAllowance !== undefined ? String(data.housingAllowance) : '0.00',
        transportAllowance: data.transportAllowance !== undefined ? String(data.transportAllowance) : '0.00',
        mobileAllowance: data.mobileAllowance !== undefined ? String(data.mobileAllowance) : '0.00',
        foodAllowance: data.foodAllowance !== undefined ? String(data.foodAllowance) : '0.00',
        otherAllowances: data.otherAllowances !== undefined ? String(data.otherAllowances) : '0.00',
        standardDailyHours: data.standardDailyHours ?? 8,
        workWeekDaysCount: data.workWeekDaysCount ?? 6,
        bankName: data.bankName ?? null,
        bankIban: data.bankIban ?? null,
        manuallyEditedFields: [],
        createdById: session.sub,
      },
    });

    logger.info(
      {
        employeeId: employee.id,
        employmentId: employee.employmentId,
        fullNameEn: employee.fullNameEn,
        createdById: session.sub,
      },
      '[HR] Employee created',
    );

    const payload = canViewComp
      ? employee
      : stripCompensation(employee as unknown as Record<string, unknown>);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[HR] Failed to create employee');
    const msg = error instanceof Error ? error.message : 'Failed to create employee';
    // Unique key collision (employmentId / nationalId)
    if (msg.includes('Unique')) {
      return NextResponse.json(
        { error: 'Employment ID or National ID already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
