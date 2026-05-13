import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  reason: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'APPLIED', 'REJECTED']).optional(),
});

export const PATCH = withApiContext(async (req: NextRequest, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.edit'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const dedId = ctx?.params?.dedId;
  if (!dedId) return NextResponse.json({ error: 'Missing deduction ID' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  try {
    const { status, ...rest } = parsed.data;
    const updated = await prisma.subcontractorDeduction.update({
      where: { id: dedId },
      data: {
        ...rest,
        ...(status ? {
          status,
          approvedById: ['APPLIED', 'REJECTED'].includes(status) ? session.userId : undefined,
          approvedAt: ['APPLIED', 'REJECTED'].includes(status) ? new Date() : undefined,
        } : {}),
      },
    });
    return NextResponse.json({ ...updated, amount: Number(updated.amount) });
  } catch (error) {
    logger.error({ error }, '[SC Deductions] Failed to update');
    return NextResponse.json({ error: 'Failed to update deduction' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (_req: NextRequest, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.edit'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const dedId = ctx?.params?.dedId;
  if (!dedId) return NextResponse.json({ error: 'Missing deduction ID' }, { status: 400 });

  try {
    await prisma.subcontractorDeduction.update({
      where: { id: dedId },
      data: { deletedAt: new Date() },
    });
    logger.info({ dedId }, '[SC Deductions] Deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, '[SC Deductions] Failed to delete');
    return NextResponse.json({ error: 'Failed to delete deduction' }, { status: 500 });
  }
});
