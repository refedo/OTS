import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import NotificationService from '@/lib/services/notification.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.productBacklogItem.findUnique({
      where: { id: params.id },
      include: {
        createdBy:   { select: { id: true, name: true } },
        approvedBy:  { select: { id: true, name: true } },
        reviewedBy:  { select: { id: true, name: true } },
        plannedBy:   { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch backlog item');
    return NextResponse.json(
      { error: 'Failed to fetch backlog item' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { getCurrentUserPermissions } = await import('@/lib/permission-checker');
    const userPermissions = await getCurrentUserPermissions();
    const isCEOOrAdmin = userPermissions.includes('backlog.ceo_center');

    // Check permissions for status changes
    if (body.status) {
      if (body.status === 'APPROVED' && !isCEOOrAdmin) {
        return NextResponse.json(
          { error: 'Only CEO or Admin can approve backlog items' },
          { status: 403 }
        );
      }
    }

    // Fetch the current item to compare status later
    const existingItem = await prisma.productBacklogItem.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, status: true, createdById: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.businessReason !== undefined) updateData.businessReason = body.businessReason;
    if (body.expectedValue !== undefined) updateData.expectedValue = body.expectedValue;
    if (body.affectedModules !== undefined) updateData.affectedModules = body.affectedModules;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;
    if (body.riskLevel !== undefined) updateData.riskLevel = body.riskLevel;
    if (body.complianceFlag !== undefined) updateData.complianceFlag = body.complianceFlag;
    if (body.linkedObjectiveId !== undefined) updateData.linkedObjectiveId = body.linkedObjectiveId;
    if (body.linkedKpiId !== undefined) updateData.linkedKpiId = body.linkedKpiId;

    // Priority changes allowed for CEO/Admin only
    if (body.priority !== undefined && isCEOOrAdmin) {
      updateData.priority = body.priority;
    }

    // Status workflow enforcement
    if (body.status !== undefined) {
      updateData.status = body.status;

      if (body.status === 'UNDER_REVIEW') {
        updateData.reviewedById = session.sub;
        updateData.reviewedAt = new Date();
      }

      if (body.status === 'APPROVED') {
        updateData.approvedById = session.sub;
        updateData.approvedAt = new Date();
      }

      if (body.status === 'PLANNED') {
        updateData.plannedById = session.sub;
        updateData.plannedAt = new Date();
      }

      if (body.status === 'COMPLETED' || body.status === 'DROPPED') {
        updateData.completedById = session.sub;
        updateData.completedAt = new Date();
      }
    }

    const item = await prisma.productBacklogItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        createdBy:   { select: { id: true, name: true } },
        approvedBy:  { select: { id: true, name: true } },
        reviewedBy:  { select: { id: true, name: true } },
        plannedBy:   { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
        tasks: true,
      },
    });

    // Notify the creator when status changes (fire-and-forget)
    if (body.status && body.status !== existingItem.status && existingItem.createdById !== session.sub) {
      const STATUS_LABELS: Record<string, string> = {
        SUBMITTED: 'Submitted',
        UNDER_REVIEW: 'Under Review',
        APPROVED: 'Approved',
        PLANNED: 'Planned',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        DROPPED: 'Dropped',
        ON_HOLD: 'On Hold',
      };
      const newLabel = STATUS_LABELS[body.status] ?? body.status;
      NotificationService.createNotification({
        userId: existingItem.createdById,
        type: 'SYSTEM_ALERT',
        title: 'Backlog Item Status Updated',
        message: `Your backlog item "${existingItem.title}" has been moved to ${newLabel} by ${user.name}`,
        relatedEntityType: 'backlog',
        relatedEntityId: existingItem.id,
        metadata: { newStatus: body.status, oldStatus: existingItem.status, updatedBy: user.name },
      }).catch((err) => {
        logger.error({ err, itemId: existingItem.id }, 'Failed to send backlog status notification');
      });
    }

    return NextResponse.json(item);
  } catch (error) {
    logger.error({ error }, 'Failed to update backlog item');
    return NextResponse.json(
      { error: 'Failed to update backlog item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { getCurrentUserPermissions: getDelPerms } = await import('@/lib/permission-checker');
    const delPermissions = await getDelPerms();
    const isCEOOrAdmin = delPermissions.includes('backlog.ceo_center');

    if (!isCEOOrAdmin) {
      return NextResponse.json(
        { error: 'Only CEO or Admin can delete backlog items' },
        { status: 403 }
      );
    }

    await prisma.productBacklogItem.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Backlog item deleted successfully' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete backlog item');
    return NextResponse.json(
      { error: 'Failed to delete backlog item' },
      { status: 500 }
    );
  }
}
