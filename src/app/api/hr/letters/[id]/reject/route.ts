/**
 * POST /api/hr/letters/[id]/reject  — CEO rejects a pending letter
 *
 * 19.1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

const rejectSchema = z.object({
  reason: z.string().min(1).max(500),
});

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withApiContext(async (req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;

  const permissions: string[] = (session as unknown as { permissions?: string[] }).permissions ?? [];
  if (!permissions.includes('hr.letters.approveCeo') && !permissions.includes('ALL')) {
    return NextResponse.json({ error: 'Forbidden — CEO approval permission required' }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Rejection reason is required', details: parsed.error.flatten() }, { status: 400 });
  }

  const letter = await prisma.hrLetter.findFirst({
    where: { id, deletedAt: null },
    include: {
      employee: { select: { fullNameEn: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (letter.status !== 'PENDING_CEO') {
    return NextResponse.json({ error: `Letter is ${letter.status} — only PENDING_CEO letters can be rejected` }, { status: 422 });
  }

  try {
    const updated = await prisma.hrLetter.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById: session!.userId,
        rejectedAt: new Date(),
        rejectionReason: parsed.data.reason,
        updatedById: session!.userId,
      },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
    });

    // Notify the HR creator
    const rejectorName = updated.rejectedBy?.name ?? 'CEO';
    NotificationService.createNotification({
      userId: letter.createdBy.id,
      type: 'REJECTED',
      title: 'Letter Rejected',
      message: `${rejectorName} rejected letter ${letter.letterNumber} for ${letter.employee.fullNameEn}: ${parsed.data.reason}`,
      relatedEntityType: 'hr_letter',
      relatedEntityId: id,
    }).catch((err) => logger.warn({ err }, 'Failed to send letter rejection notification'));

    logger.info({ letterId: id, letterNumber: letter.letterNumber, rejectedBy: session!.userId }, '[Letters] Rejected');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to reject HR letter');
    return NextResponse.json({ error: 'Failed to reject letter' }, { status: 500 });
  }
});
