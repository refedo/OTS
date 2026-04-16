/**
 * PUT    /api/hr/public-holidays/[id] — update
 * DELETE /api/hr/public-holidays/[id] — soft delete
 *
 * Phase 2 of OTS-MSS-HR-PAYROLL-v1. Gated by `hr.holiday.manage`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  nameEn: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional().nullable(),
  isRecurring: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.holiday.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const holiday = await prisma.publicHoliday.update({
      where: { id },
      data: {
        ...(parsed.data.date && { date: new Date(parsed.data.date + 'T00:00:00.000Z') }),
        ...(parsed.data.endDate !== undefined && { endDate: parsed.data.endDate ? new Date(parsed.data.endDate + 'T00:00:00.000Z') : null }),
        ...(parsed.data.nameEn !== undefined && { nameEn: parsed.data.nameEn }),
        ...(parsed.data.nameAr !== undefined && { nameAr: parsed.data.nameAr }),
        ...(parsed.data.isRecurring !== undefined && { isRecurring: parsed.data.isRecurring }),
        updatedById: session.sub,
      },
    });
    return NextResponse.json(holiday);
  } catch (error) {
    logger.error({ error, id }, '[Public Holidays] Update failed');
    return NextResponse.json({ error: 'Failed to update holiday' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.holiday.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await prisma.publicHoliday.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.sub },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, '[Public Holidays] Delete failed');
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
  }
}
