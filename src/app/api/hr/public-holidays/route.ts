/**
 * GET  /api/hr/public-holidays — list (non-deleted)
 * POST /api/hr/public-holidays — create
 *
 * Phase 2 of OTS-MSS-HR-PAYROLL-v1.
 * GET gated by `hr.holiday.view`, POST gated by `hr.holiday.manage`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional().nullable(),
  nameEn: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional().nullable(),
  isRecurring: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.holiday.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const holidays = await prisma.publicHoliday.findMany({
    where: { deletedAt: null },
    orderBy: { date: 'asc' },
  });
  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.holiday.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const holiday = await prisma.publicHoliday.create({
      data: {
        date: new Date(parsed.data.date + 'T00:00:00.000Z'),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate + 'T00:00:00.000Z') : null,
        nameEn: parsed.data.nameEn,
        nameAr: parsed.data.nameAr ?? null,
        isRecurring: parsed.data.isRecurring ?? false,
        createdById: session.sub,
      },
    });
    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[Public Holidays] Create failed');
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
  }
}
