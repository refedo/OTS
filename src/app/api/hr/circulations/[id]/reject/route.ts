/**
 * POST /api/hr/circulations/[id]/reject
 * CEO rejects a circulation; notifies HR creator.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

const schema = z.object({ reason: z.string().min(1).max(500) });

export const POST = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { checkPermission } = await import('@/lib/permission-checker');
  if (!(await checkPermission('hr.letters.approveCeo'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });

  const circ = await prisma.hrCirculation.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true, subject: true, circulationNumber: true, createdById: true },
  });
  if (!circ) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (circ.status !== 'PENDING_CEO') return NextResponse.json({ error: 'Circulation is not pending approval' }, { status: 400 });

  const updated = await prisma.hrCirculation.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedById: session!.userId,
      rejectedAt: new Date(),
      rejectionReason: parsed.data.reason,
    },
  });

  logger.info({ circId: id, rejectorId: session!.userId }, '[Circulations] Rejected');

  NotificationService.createNotification({
    userId: circ.createdById,
    type: 'STATUS_CHANGE',
    title: 'Circulation Rejected',
    message: `Circulation "${circ.subject}" (${circ.circulationNumber}) was rejected: ${parsed.data.reason}`,
    relatedEntityType: 'hr_circulation',
    relatedEntityId: id,
  }).catch((err) => logger.warn({ err }, 'Failed to notify creator of circulation rejection'));

  return NextResponse.json(updated);
});
