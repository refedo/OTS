/**
 * GET  /api/hr/leave-types — list leave types (active by default, ?includeArchived=true for all)
 * POST /api/hr/leave-types — create a new leave type (hr.leaves.manageTypes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const createSchema = z.object({
  code: z.string().trim().min(1).max(40),
  nameEn: z.string().trim().min(1).max(120),
  nameAr: z.string().trim().max(120).optional().nullable(),
  payType: z.enum(['FULLY_PAID', 'HALF_PAID', 'UNPAID']).default('FULLY_PAID'),
  monthlyAccrualDays: z.number().min(0).max(31).default(1.75),
  annualAccrualDays: z.number().min(0).max(366).default(21),
  maxCarryOverDays: z.number().min(0).max(366).default(30),
  requiresMedicalCertificate: z.boolean().default(false),
  allowNegativeBalance: z.boolean().default(true),
  countPublicHolidays: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(9999).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Any authenticated user can read the leave type catalogue so the
  // leave request form can populate its dropdown.
  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';

  const rows = await prisma.leaveType.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ displayOrder: 'asc' }, { nameEn: 'asc' }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.leaves.manageTypes');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const maxOrder = d.displayOrder ?? ((await prisma.leaveType.aggregate({ _max: { displayOrder: true } }))._max.displayOrder ?? 0);
    const created = await prisma.leaveType.create({
      data: {
        code: d.code.toUpperCase(),
        nameEn: d.nameEn,
        nameAr: d.nameAr ?? null,
        payType: d.payType,
        monthlyAccrualDays: d.monthlyAccrualDays,
        annualAccrualDays: d.annualAccrualDays,
        maxCarryOverDays: d.maxCarryOverDays,
        requiresMedicalCertificate: d.requiresMedicalCertificate,
        allowNegativeBalance: d.allowNegativeBalance,
        countPublicHolidays: d.countPublicHolidays,
        displayOrder: d.displayOrder ?? maxOrder + 10,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Leave type code already exists' }, { status: 409 });
    }
    logger.error({ error }, '[LeaveTypes] Create failed');
    return NextResponse.json({ error: 'Failed to create leave type' }, { status: 500 });
  }
}
