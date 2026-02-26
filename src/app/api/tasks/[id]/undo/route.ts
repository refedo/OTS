import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId } = await params;

  // Check if user has permission to edit tasks
  const permissions = await getCurrentUserPermissions();
  const canEdit = permissions.includes('tasks.manage') || permissions.includes('tasks.edit_all') || permissions.includes('tasks.edit');

  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden: No permission to undo task changes' }, { status: 403 });
  }

  // Find the most recent audit log entry with a snapshot that hasn't been undone
  const latestAuditLog = await prisma.taskAuditLog.findFirst({
    where: {
      taskId,
      snapshot: { not: null },
      undone: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestAuditLog || !latestAuditLog.snapshot) {
    return NextResponse.json({ error: 'No undoable action found' }, { status: 404 });
  }

  // Parse the snapshot
  let snapshotData: any;
  try {
    snapshotData = JSON.parse(latestAuditLog.snapshot);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid snapshot data' }, { status: 500 });
  }

  // Verify task exists
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Additional permission check: if user doesn't have edit_all, they can only undo their own changes or changes to tasks assigned to them
  const canEditAll = permissions.includes('tasks.manage') || permissions.includes('tasks.edit_all');
  const isAssignedUser = task.assignedToId === session.sub;
  const isCreator = task.createdById === session.sub;
  const isChangeAuthor = latestAuditLog.userId === session.sub;

  if (!canEditAll && !isAssignedUser && !isCreator && !isChangeAuthor) {
    return NextResponse.json({ error: 'Forbidden: You can only undo your own changes or changes to tasks assigned to you' }, { status: 403 });
  }

  try {
    // Restore the task to the snapshot state
    const restoredTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: snapshotData.title,
        description: snapshotData.description,
        assignedToId: snapshotData.assignedToId,
        requesterId: snapshotData.requesterId,
        projectId: snapshotData.projectId,
        buildingId: snapshotData.buildingId,
        departmentId: snapshotData.departmentId,
        taskInputDate: snapshotData.taskInputDate ? new Date(snapshotData.taskInputDate) : null,
        dueDate: snapshotData.dueDate ? new Date(snapshotData.dueDate) : null,
        releaseDate: snapshotData.releaseDate ? new Date(snapshotData.releaseDate) : null,
        priority: snapshotData.priority,
        status: snapshotData.status,
        isPrivate: snapshotData.isPrivate,
        isCeoTask: snapshotData.isCeoTask,
        remark: snapshotData.remark,
        revision: snapshotData.revision,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, position: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        building: {
          select: { id: true, designation: true, name: true },
        },
        department: {
          select: { id: true, name: true },
        },
        completedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
        rejectedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
      },
    });

    // Mark all audit logs from this change batch as undone
    await prisma.taskAuditLog.updateMany({
      where: {
        taskId,
        createdAt: latestAuditLog.createdAt,
        undone: false,
      },
      data: {
        undone: true,
        undoneAt: new Date(),
        undoneBy: session.sub,
      },
    });

    // Create a new audit log entry for the undo action
    await prisma.taskAuditLog.create({
      data: {
        taskId,
        userId: session.sub,
        action: 'undone',
        field: null,
        oldValue: null,
        newValue: `Undid changes from ${latestAuditLog.createdAt.toISOString()}`,
        snapshot: null,
      },
    });

    return NextResponse.json({
      success: true,
      task: restoredTask,
      undoneAuditLogId: latestAuditLog.id,
    });
  } catch (error) {
    console.error('Failed to undo task changes:', error);
    return NextResponse.json({ error: 'Failed to undo changes' }, { status: 500 });
  }
}
