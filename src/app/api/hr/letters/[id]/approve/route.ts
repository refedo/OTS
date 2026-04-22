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
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withApiContext(async (_req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;

  const permissions = await resolveUserPermissions(session!.userId);
  if (!permissions.includes('hr.letters.approveCeo') && !permissions.includes('ALL')) {
    return NextResponse.json({ error: 'Forbidden — CEO approval permission required' }, { status: 403 });
  }

  const letter = await prisma.hrLetter.findFirst({
    where: { id, deletedAt: null },
    include: {
      employee: { select: { id: true, fullNameEn: true } },
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

    // Notify the HR user who created the letter, and the employee's linked user account
    const approverName = updated.approvedBy?.name ?? 'CEO';
    const notifyPromises: Promise<unknown>[] = [
      NotificationService.createNotification({
        userId: letter.createdBy.id,
        type: 'APPROVED',
        title: 'Letter Approved',
        message: `${approverName} approved letter ${letter.letterNumber} for ${letter.employee.fullNameEn}`,
        relatedEntityType: 'hr_letter',
        relatedEntityId: id,
      }),
    ];

    // Also notify the employee's linked user if they have one
    const employeeUser = await prisma.user.findFirst({
      where: { employeeId: letter.employee.id, status: 'active' },
      select: { id: true },
    }).catch(() => null);
    if (employeeUser && employeeUser.id !== letter.createdBy.id) {
      notifyPromises.push(
        NotificationService.createNotification({
          userId: employeeUser.id,
          type: 'APPROVED',
          title: 'Official Letter Issued',
          message: `An official letter (${letter.letterNumber}) has been approved and issued to you`,
          relatedEntityType: 'hr_letter',
          relatedEntityId: id,
        }),
      );
    }

    Promise.all(notifyPromises).catch((err) => logger.warn({ err }, 'Failed to send letter approval notifications'));

    logger.info({ letterId: id, letterNumber: letter.letterNumber, approvedBy: session!.userId }, '[Letters] Approved');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to approve HR letter');
    return NextResponse.json({ error: 'Failed to approve letter' }, { status: 500 });
  }
});
