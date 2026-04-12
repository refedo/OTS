/**
 * GET  /api/hr/payroll-periods — list all periods
 * POST /api/hr/payroll-periods — create a new DRAFT period for a given year/month
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  cutoffDate: z.string().min(1),
  payDate: z.string().min(1),
  notes: z.string().max(1000).optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.payroll.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await prisma.payrollPeriod.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      _count: { select: { lines: true, adjustments: true, wpsExports: true } },
    },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canCalculate = await checkPermission('hr.payroll.calculate');
  if (!canCalculate) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const period = await prisma.payrollPeriod.create({
      data: {
        year: d.year,
        month: d.month,
        cutoffDate: new Date(d.cutoffDate),
        payDate: new Date(d.payDate),
        notes: d.notes ?? null,
        status: 'DRAFT',
        createdById: session.sub,
      },
    });
    logger.info({ id: period.id, year: d.year, month: d.month }, '[Payroll] Period created');
    return NextResponse.json(period, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A period for this year/month already exists' }, { status: 409 });
    }
    logger.error({ error }, '[Payroll] Create period failed');
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 });
  }
}
