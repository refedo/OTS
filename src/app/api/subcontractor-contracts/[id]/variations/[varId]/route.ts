import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const PATCH = withApiContext(async (req: NextRequest, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.edit'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const varId = ctx?.params?.varId;
  if (!varId) return NextResponse.json({ error: 'Missing variation ID' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  try {
    const { status, ...rest } = parsed.data;
    const updated = await prisma.subcontractorVariation.update({
      where: { id: varId },
      data: {
        ...rest,
        ...(status ? {
          status,
          approvedById: ['APPROVED', 'REJECTED'].includes(status) ? session.userId : undefined,
          approvedAt: ['APPROVED', 'REJECTED'].includes(status) ? new Date() : undefined,
        } : {}),
      },
    });
    return NextResponse.json({ ...updated, amount: Number(updated.amount) });
  } catch (error) {
    logger.error({ error }, '[SC Variations] Failed to update');
    return NextResponse.json({ error: 'Failed to update variation' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (_req: NextRequest, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.edit'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const varId = ctx?.params?.varId;
  if (!varId) return NextResponse.json({ error: 'Missing variation ID' }, { status: 400 });

  try {
    await prisma.subcontractorVariation.update({
      where: { id: varId },
      data: { deletedAt: new Date() },
    });
    logger.info({ varId }, '[SC Variations] Deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, '[SC Variations] Failed to delete');
    return NextResponse.json({ error: 'Failed to delete variation' }, { status: 500 });
  }
});
