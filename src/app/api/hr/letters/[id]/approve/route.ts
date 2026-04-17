/**
 * POST /api/hr/letters/[id]/approve  — CEO approves a pending letter
 *
 * 19.1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withApiContext(async (_req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;

  const permissions: string[] = (session as unknown as { permissions?: string[] }).permissions ?? [];
  if (!permissions.includes('hr.letters.approveCeo') && !permissions.includes('ALL')) {
    return NextResponse.json({ error: 'Forbidden — CEO approval permission required' }, { status: 403 });
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
    return NextResponse.json({ error: `Letter is ${letter.status} — only PENDING_CEO letters can be approved` }, { status: 422 });
  }

  try {
    const updated = await prisma.hrLetter.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: session!.userId,
        approvedAt: new Date(),
        updatedById: session!.userId,
      },
      include: {
        employee: { select: { id: true, fullNameEn: true, employmentId: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    // Notify the HR user who created the letter
    const approverName = updated.approvedBy?.name ?? 'CEO';
    NotificationService.createNotification({
      userId: letter.createdBy.id,
      type: 'APPROVED',
      title: 'Letter Approved',
      message: `${approverName} approved letter ${letter.letterNumber} for ${letter.employee.fullNameEn}`,
      relatedEntityType: 'hr_letter',
      relatedEntityId: id,
    }).catch((err) => logger.warn({ err }, 'Failed to send letter approval notification'));

    logger.info({ letterId: id, letterNumber: letter.letterNumber, approvedBy: session!.userId }, '[Letters] Approved');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to approve HR letter');
    return NextResponse.json({ error: 'Failed to approve letter' }, { status: 500 });
  }
});
