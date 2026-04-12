/**
 * PUT    /api/hr/leave-types/[id] — update a leave type
 * DELETE /api/hr/leave-types/[id] — soft-archive a leave type
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  nameEn: z.string().trim().min(1).max(120).optional(),
  nameAr: z.string().trim().max(120).nullable().optional(),
  payType: z.enum(['FULLY_PAID', 'HALF_PAID', 'UNPAID']).optional(),
  monthlyAccrualDays: z.number().min(0).max(31).optional(),
  annualAccrualDays: z.number().min(0).max(366).optional(),
  maxCarryOverDays: z.number().min(0).max(366).optional(),
  requiresMedicalCertificate: z.boolean().optional(),
  allowNegativeBalance: z.boolean().optional(),
  countPublicHolidays: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(9999).optional(),
  archived: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.leaves.manageTypes');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const existing = await prisma.leaveType.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { archived, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (archived !== undefined) {
    data.archivedAt = archived ? new Date() : null;
  }

  try {
    const updated = await prisma.leaveType.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, '[LeaveTypes] Update failed');
    return NextResponse.json({ error: 'Failed to update leave type' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.leaves.manageTypes');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  try {
    await prisma.leaveType.update({ where: { id }, data: { archivedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, '[LeaveTypes] Delete failed');
    return NextResponse.json({ error: 'Failed to delete leave type' }, { status: 500 });
  }
}
