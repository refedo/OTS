/**
 * POST /api/hr/circulations/[id]/approve
 * CEO approves a circulation; notifies all employees in scope.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

export const POST = withApiContext(async (_req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { checkPermission } = await import('@/lib/permission-checker');
  const canApprove = await checkPermission('hr.letters.approveCeo');
  if (!canApprove) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const circ = await prisma.hrCirculation.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true, subject: true, circulationNumber: true, targetType: true, createdById: true },
  });
  if (!circ) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (circ.status !== 'PENDING_CEO') return NextResponse.json({ error: 'Circulation is not pending approval' }, { status: 400 });

  const updated = await prisma.hrCirculation.update({
    where: { id },
    data: { status: 'APPROVED', approvedById: session!.userId, approvedAt: new Date() },
    include: {
      createdBy: { select: { id: true, name: true } },
      recipients: {
        include: {
          employee: { select: { id: true, fullNameEn: true } },
          department: { select: { id: true, name: true } },
        },
      },
    },
  });

  logger.info({ circId: id, approverId: session!.userId }, '[Circulations] Approved');

  // Notify HR creator
  NotificationService.createNotification({
    userId: circ.createdById,
    type: 'STATUS_CHANGE',
    title: 'Circulation Approved',
    message: `Circulation "${circ.subject}" (${circ.circulationNumber}) has been approved`,
    relatedEntityType: 'hr_circulation',
    relatedEntityId: id,
  }).catch((err) => logger.warn({ err }, 'Failed to notify creator of circulation approval'));

  // Notify recipients
  (async () => {
    try {
      const recipientUserIds = new Set<string>();

      if (circ.targetType === 'ALL') {
        // Notify all active users
        const users = await prisma.user.findMany({ where: { status: 'active' }, select: { id: true } });
        users.forEach((u) => recipientUserIds.add(u.id));
      } else if (circ.targetType === 'DEPARTMENTS') {
        // Notify all employees in the target departments
        const deptIds = updated.recipients.filter((r) => r.departmentId).map((r) => r.departmentId!);
        if (deptIds.length > 0) {
          const users = await prisma.user.findMany({
            where: { status: 'active', departmentId: { in: deptIds } },
            select: { id: true },
          });
          users.forEach((u) => recipientUserIds.add(u.id));
        }
      } else if (circ.targetType === 'EMPLOYEES') {
        // Notify linked user accounts for each recipient employee
        const empIds = updated.recipients.filter((r) => r.employeeId).map((r) => r.employeeId!);
        if (empIds.length > 0) {
          const users = await prisma.user.findMany({
            where: { status: 'active', employeeId: { in: empIds } },
            select: { id: true },
          });
          users.forEach((u) => recipientUserIds.add(u.id));
        }
      }

      // Don't notify the approver themselves
      recipientUserIds.delete(session!.userId);

      for (const userId of recipientUserIds) {
        await NotificationService.createNotification({
          userId,
          type: 'STATUS_CHANGE',
          title: 'New Circular',
          message: `Circulation: "${circ.subject}" (${circ.circulationNumber}) has been issued`,
          relatedEntityType: 'hr_circulation',
          relatedEntityId: id,
        }).catch(() => {});
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to notify circulation recipients');
    }
  })();

  return NextResponse.json(updated);
});
