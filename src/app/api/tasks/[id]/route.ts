import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { verifySession } from '@/lib/jwt';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';
import { SUB_ACTIVITY_DEPENDENCIES } from '@/lib/activity-constants';
import { pointsService } from '@/lib/services/points-service';
import { logger } from '@/lib/logger';

import NotificationService from '@/lib/services/notification.service';

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  requesterId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  buildingId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  mainActivity: z.string().optional().nullable(),
  subActivity: z.string().optional().nullable(),
  taskInputDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  releaseDate: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['Pending', 'In Progress', 'Waiting for Approval', 'Completed']).optional(),
  isPrivate: z.boolean().optional(),
  isCeoTask: z.boolean().optional(),
  approved: z.boolean().optional(),
  rejected: z.boolean().optional(),
  rejectionReason: z.string().optional().nullable(),
  remark: z.string().optional().nullable(),
  revision: z.string().optional().nullable(),
  consultantResponseCode: z.enum(['code_a', 'code_b', 'code_c']).optional().nullable(),
});

// Helper to create audit log entries
async function createTaskAuditLog(
  taskId: string,
  userId: string,
  action: string,
  field?: string,
  oldValue?: string | null,
  newValue?: string | null,
  snapshot?: string | null
) {
  try {
    await prisma.taskAuditLog.create({
      data: {
        taskId,
        userId,
        action,
        field,
        oldValue,
        newValue,
        snapshot,
      },
    });
  } catch (error) {
    console.error('Failed to create task audit log:', error);
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
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
    },
  });

  // Try to add attachments (requires task_attachments table)
  try {
    const taskWithAttachments = await prisma.task.findUnique({
      where: { id },
      select: {
        attachments: {
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { uploadedAt: 'asc' },
        },
      },
    });
    if (taskWithAttachments && task) {
      (task as any).attachments = taskWithAttachments.attachments;
    }
  } catch {
    // task_attachments table not yet migrated
    if (task) (task as any).attachments = [];
  }

  // Try to fetch completedBy and approvedBy if the fields exist in the database
  try {
    const taskExtras = await prisma.task.findUnique({
      where: { id },
      select: {
        approvedAt: true,
        completedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
      },
    });
    
    if (taskExtras) {
      (task as any).completedBy = taskExtras.completedBy || null;
      (task as any).approvedAt = taskExtras.approvedAt || null;
      (task as any).approvedBy = taskExtras.approvedBy || null;
    }
  } catch (error) {
    console.log('Extended fields not available in database yet');
  }

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Check permissions: users with tasks.view_all or tasks.view_others see more, others only their assigned/created tasks
  const permissions = await getCurrentUserPermissions();
  const canViewAll = permissions.includes('tasks.view_all');
  const canViewOthers = permissions.includes('tasks.view_others');
  
  if (!canViewAll && !canViewOthers) {
    // Without view_all or view_others, can only see own assigned/created tasks
    if (task.assignedToId !== session.sub && task.createdById !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (canViewOthers && !canViewAll) {
    // With view_others but not view_all, can see non-private tasks + own tasks
    if (task.isPrivate && task.assignedToId !== session.sub && task.createdById !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  
  // For private tasks, only creator or assignee can view
  if (task.isPrivate && task.createdById !== session.sub && task.assignedToId !== session.sub) {
    return NextResponse.json({ error: 'Forbidden - This is a private task' }, { status: 403 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
  }

  // Permission check:
  // 1. Users with tasks.manage or tasks.edit_all can update any task fully
  // 2. Assigned users with tasks.edit can update their own tasks
  // 3. Users without edit_all can only update status and approved fields on others' tasks
  const permissions = await getCurrentUserPermissions();
  const canEditAll = permissions.includes('tasks.manage') || permissions.includes('tasks.edit_all');
  const canEdit = permissions.includes('tasks.edit');
  const isAssignedUser = task.assignedToId === session.sub;
  const isCreator = task.createdById === session.sub;
  const isRequester = task.requesterId === session.sub;

  // Check if user is admin directly from database (for cases where session might be stale)
  const currentUser = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isAdmin: true }
  });
  const isAdmin = currentUser?.isAdmin === true;

  if (!canEditAll && !canEdit && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden: No permission to edit tasks' }, { status: 403 });
  }

  // Admins and users with edit_all can update everything
  // Assigned users, creators, and requesters can also update their tasks
  // Others are restricted to status updates only
  if (!canEditAll && !isAdmin && !isAssignedUser && !isCreator && !isRequester) {
    const allowedFields = ['status', 'approved', 'rejected', 'rejectionReason'];
    const hasRestrictedFields = Object.keys(parsed.data).some(key => !allowedFields.includes(key));
    if (hasRestrictedFields) {
      return NextResponse.json({ error: 'Forbidden: You can only update status and approval for tasks not assigned to you' }, { status: 403 });
    }
  }

  const updateData: any = { ...parsed.data };
  if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate);
  if (parsed.data.taskInputDate) updateData.taskInputDate = new Date(parsed.data.taskInputDate);
  if (parsed.data.releaseDate) updateData.releaseDate = new Date(parsed.data.releaseDate);
  if (parsed.data.releaseDate === null) updateData.releaseDate = null;
  if (parsed.data.requesterId !== undefined) updateData.requesterId = parsed.data.requesterId || null;
  
  // Handle completion tracking
  try {
    if (parsed.data.status === 'Completed' && task.status !== 'Completed') {
      updateData.completedAt = new Date();
      updateData.completedById = session.sub;
    } else if (parsed.data.status !== 'Completed' && task.status === 'Completed') {
      updateData.completedAt = null;
      updateData.completedById = null;
    }
  } catch (error) {
    console.log('Completion tracking fields not available in database yet');
  }

  // Handle approval tracking
  try {
    if (parsed.data.approved === true) {
      updateData.approvedAt = new Date();
      updateData.approvedById = session.sub;
      // Clear rejection if approving
      updateData.rejectedAt = null;
      updateData.rejectedById = null;
      updateData.rejectionReason = null;
    } else if (parsed.data.approved === false) {
      updateData.approvedAt = null;
      updateData.approvedById = null;
    }
    // Remove the 'approved' field from updateData since it's not a real DB field
    delete updateData.approved;
  } catch (error) {
    console.log('Approval tracking fields not available in database yet');
  }

  // Handle rejection tracking
  try {
    if (parsed.data.rejected === true) {
      updateData.rejectedAt = new Date();
      updateData.rejectedById = session.sub;
      if (parsed.data.rejectionReason) {
        updateData.rejectionReason = parsed.data.rejectionReason;
      }
      // Clear approval if rejecting
      updateData.approvedAt = null;
      updateData.approvedById = null;
    } else if (parsed.data.rejected === false) {
      updateData.rejectedAt = null;
      updateData.rejectedById = null;
      updateData.rejectionReason = null;
    }
    // Remove the 'rejected' field from updateData since it's not a real DB field
    delete updateData.rejected;
  } catch (error) {
    console.log('Rejection tracking fields not available in database yet');
  }

  // CEO task visibility - only users with manage_ceo_tasks can set/modify isCeoTask
  if (parsed.data.isCeoTask !== undefined) {
    if (permissions.includes('tasks.manage_ceo_tasks')) {
      updateData.isCeoTask = parsed.data.isCeoTask;
    } else {
      delete updateData.isCeoTask;
    }
  }

  // Check finish-to-start dependency warning when status is being advanced
  let dependencyWarning: string | undefined;
  const newStatus = parsed.data.status;
  const taskSubActivity = parsed.data.subActivity ?? task.subActivity;
  const taskProjectId = parsed.data.projectId ?? task.projectId;
  const taskBuildingId = parsed.data.buildingId ?? task.buildingId;

  if (
    newStatus &&
    ['In Progress', 'Waiting for Approval', 'Completed'].includes(newStatus) &&
    taskSubActivity
  ) {
    const predecessorSubActivity = SUB_ACTIVITY_DEPENDENCIES[taskSubActivity];
    if (predecessorSubActivity) {
      const predecessorTask = await prisma.task.findFirst({
        where: {
          subActivity: predecessorSubActivity,
          projectId: taskProjectId ?? undefined,
          buildingId: taskBuildingId ?? undefined,
          status: { not: 'Completed' },
        },
        select: { id: true, title: true, status: true, subActivity: true },
      });
      if (predecessorTask) {
        dependencyWarning = `Predecessor activity "${predecessorTask.title}" (${predecessorSubActivity.replace(/_/g, ' ')}) is not yet completed.`;
      }
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
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
    },
  });

  // Send approval request to requester when task is completed
  if (parsed.data.status === 'Completed' && task.status !== 'Completed') {
    try {
      const requesterId = (updatedTask as any).requesterId || task.createdById;
      // Don't notify if the person completing is also the requester
      if (requesterId && requesterId !== session.sub) {
        await NotificationService.createNotification({
          userId: requesterId,
          type: 'APPROVAL_REQUIRED',
          title: 'Task Awaiting Your Approval',
          message: `${session.name} completed the task: "${updatedTask.title}" — please approve or reject`,
          relatedEntityType: 'task',
          relatedEntityId: updatedTask.id,
          metadata: {
            taskTitle: updatedTask.title,
            completedBy: session.name,
            projectName: updatedTask.project?.name,
          },
        });
      }
    } catch (notifError) {
      logger.error({ error: notifError }, 'Failed to send task completion notification');
    }

    // Award points for task completion
    try {
      const pointsResult = await pointsService.awardPointsForTaskCompletion({
        id: updatedTask.id,
        title: updatedTask.title,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate,
        completedAt: updateData.completedAt,
        assignedToId: updatedTask.assignedToId,
      });
      if (pointsResult) {
        logger.info({ 
          taskId: updatedTask.id, 
          userId: updatedTask.assignedToId,
          points: pointsResult.totalPoints,
          breakdown: pointsResult.breakdown 
        }, 'Points awarded for task completion');
      }
    } catch (pointsError) {
      logger.error({ error: pointsError, taskId: updatedTask.id }, 'Failed to award points for task completion');
    }
  }

  // Send notification to requester when assignee changes
  if (parsed.data.assignedToId && parsed.data.assignedToId !== task.assignedToId) {
    try {
      // Notify the newly assigned user
      const assignedByName = (updatedTask as any).requester?.name || updatedTask.createdBy.name;
      if (parsed.data.assignedToId !== session.sub) {
        await NotificationService.notifyTaskAssigned({
          taskId: updatedTask.id,
          assignedToId: parsed.data.assignedToId,
          taskTitle: updatedTask.title,
          assignedByName,
          dueDate: updatedTask.dueDate || undefined,
          projectName: updatedTask.project?.name,
          buildingName: updatedTask.building?.name,
        });
      }
    } catch (notifError) {
      console.error('Failed to send reassignment notification:', notifError);
    }
  }

  // Notify department head on task completion or reassignment
  if (updatedTask.departmentId && (
    (parsed.data.status === 'Completed' && task.status !== 'Completed') ||
    (parsed.data.assignedToId && parsed.data.assignedToId !== task.assignedToId)
  )) {
    try {
      const department = await prisma.department.findUnique({
        where: { id: updatedTask.departmentId },
        select: { managerId: true, name: true },
      });
      if (department?.managerId && department.managerId !== session.sub && department.managerId !== updatedTask.assignedToId) {
        const isCompletion = parsed.data.status === 'Completed' && task.status !== 'Completed';
        await NotificationService.createNotification({
          userId: department.managerId,
          type: isCompletion ? 'TASK_COMPLETED' : 'TASK_ASSIGNED',
          title: isCompletion ? 'Task Completed in Your Department' : 'Task Reassigned in Your Department',
          message: isCompletion
            ? `${session.name} completed "${updatedTask.title}" in ${department.name}`
            : `"${updatedTask.title}" was reassigned in ${department.name}`,
          relatedEntityType: 'task',
          relatedEntityId: updatedTask.id,
          metadata: {
            taskTitle: updatedTask.title,
            departmentName: department.name,
            projectName: updatedTask.project?.name,
          },
        });
      }
    } catch (deptNotifError) {
      console.error('Failed to notify department head:', deptNotifError);
    }
  }

  // Notify assignee when their task is approved
  if (parsed.data.approved === true && !(task as any).approvedAt) {
    try {
      const assigneeId = updatedTask.assignedToId;
      if (assigneeId && assigneeId !== session.sub) {
        await NotificationService.notifyApproved({
          userId: assigneeId,
          entityType: 'task',
          entityId: updatedTask.id,
          entityName: updatedTask.title,
          approverName: session.name,
        });
      }
    } catch (notifError) {
      console.error('Failed to send approval notification to assignee:', notifError);
    }
  }

  // Notify assignee when their task is rejected
  if (parsed.data.rejected === true && !(task as any).rejectedAt) {
    try {
      const assigneeId = updatedTask.assignedToId;
      if (assigneeId && assigneeId !== session.sub) {
        await NotificationService.notifyRejected({
          userId: assigneeId,
          entityType: 'task',
          entityId: updatedTask.id,
          entityName: updatedTask.title,
          rejectorName: session.name,
          reason: parsed.data.rejectionReason || undefined,
        });
      }
    } catch (notifError) {
      console.error('Failed to send rejection notification to assignee:', notifError);
    }
  }

  // Try to fetch completedBy and approvedBy
  try {
    const taskExtras = await prisma.task.findUnique({
      where: { id },
      select: {
        approvedAt: true,
        completedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
      },
    });
    
    if (taskExtras) {
      (updatedTask as any).completedBy = taskExtras.completedBy || null;
      (updatedTask as any).approvedAt = taskExtras.approvedAt || null;
      (updatedTask as any).approvedBy = taskExtras.approvedBy || null;
    }
  } catch (error) {
    console.log('Extended fields not available in database yet');
  }

  // Sync WorkUnit status if status was updated (non-blocking)
  if (parsed.data.status) {
    WorkUnitSyncService.syncTaskStatusUpdate(id, parsed.data.status).catch((err) => {
      console.error('WorkUnit status sync failed:', err);
    });
  }

  // Create snapshot of task state before changes for undo functionality
  const taskSnapshot = JSON.stringify({
    title: task.title,
    description: task.description,
    assignedToId: task.assignedToId,
    requesterId: task.requesterId,
    projectId: task.projectId,
    buildingId: task.buildingId,
    departmentId: task.departmentId,
    taskInputDate: task.taskInputDate,
    dueDate: task.dueDate,
    releaseDate: task.releaseDate,
    priority: task.priority,
    status: task.status,
    isPrivate: task.isPrivate,
    isCeoTask: task.isCeoTask,
    remark: task.remark,
    revision: task.revision,
  });

  // Create audit log entries for all changes (non-blocking)
  const auditPromises: Promise<void>[] = [];
  
  // Helper to get display value for relations
  const getDisplayValue = async (field: string, value: string | null) => {
    if (!value) return null;
    try {
      if (field === 'assignedToId') {
        const user = await prisma.user.findUnique({ where: { id: value }, select: { name: true } });
        return user?.name || value;
      }
      if (field === 'projectId') {
        const project = await prisma.project.findUnique({ where: { id: value }, select: { projectNumber: true, name: true } });
        return project ? `${project.projectNumber} - ${project.name}` : value;
      }
      if (field === 'buildingId') {
        const building = await prisma.building.findUnique({ where: { id: value }, select: { designation: true, name: true } });
        return building ? `${building.designation} - ${building.name}` : value;
      }
      if (field === 'departmentId') {
        const dept = await prisma.department.findUnique({ where: { id: value }, select: { name: true } });
        return dept?.name || value;
      }
    } catch (e) {
      return value;
    }
    return value;
  };

  // Track changes for audit log
  const fieldsToTrack = ['title', 'description', 'assignedToId', 'projectId', 'buildingId', 'departmentId', 'taskInputDate', 'dueDate', 'priority', 'status', 'isPrivate', 'isCeoTask'];
  
  for (const field of fieldsToTrack) {
    if (parsed.data[field] !== undefined) {
      const oldVal = task[field as keyof typeof task];
      const newVal = parsed.data[field];
      
      // Check if value actually changed
      if (oldVal !== newVal) {
        let oldDisplay = oldVal?.toString() || null;
        let newDisplay = newVal?.toString() || null;
        
        // Get display values for relation fields
        if (['assignedToId', 'projectId', 'buildingId', 'departmentId'].includes(field)) {
          oldDisplay = await getDisplayValue(field, oldVal as string | null);
          newDisplay = await getDisplayValue(field, newVal as string | null);
        }
        
        // Format date fields
        if (['taskInputDate', 'dueDate'].includes(field)) {
          if (oldVal) oldDisplay = new Date(oldVal as Date).toISOString().split('T')[0];
          if (newVal) newDisplay = new Date(newVal as string).toISOString().split('T')[0];
        }
        
        // Determine action type
        let action = 'updated';
        if (field === 'status') {
          action = newVal === 'Completed' ? 'completed' : 'status_changed';
        }
        
        // Include snapshot only for the first change in this update
        const includeSnapshot = auditPromises.length === 0 ? taskSnapshot : null;
        auditPromises.push(createTaskAuditLog(id, session.sub, action, field, oldDisplay, newDisplay, includeSnapshot));
      }
    }
  }
  
  // Log approval / rejection changes to activity trail
  if (parsed.data.approved === true && !(task as any).approvedAt) {
    auditPromises.push(createTaskAuditLog(id, session.sub, 'approved', 'approvedAt', null, new Date().toISOString().split('T')[0]));
  } else if (parsed.data.approved === false && (task as any).approvedAt) {
    auditPromises.push(createTaskAuditLog(id, session.sub, 'approval_revoked', 'approvedAt', (task as any).approvedAt?.toString(), null));
  }
  if (parsed.data.rejected === true && !(task as any).rejectedAt) {
    auditPromises.push(createTaskAuditLog(id, session.sub, 'rejected', 'rejectionReason', null, parsed.data.rejectionReason || null));
  }

  // Execute all audit logs (non-blocking)
  Promise.all(auditPromises).catch(err => console.error('Audit logging failed:', err));

  return NextResponse.json({ ...updatedTask, ...(dependencyWarning ? { dependencyWarning } : {}) });
}

export async function DELETE(
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
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Permission check:
  // 1. Users with tasks.manage or tasks.delete_all can delete any task
  // 2. Users with tasks.delete can delete their own tasks (assigned or created)
  const permissions = await getCurrentUserPermissions();
  const canDeleteAll = permissions.includes('tasks.manage') || permissions.includes('tasks.delete_all');
  const canDelete = permissions.includes('tasks.delete');
  const isAssignedUser = task.assignedToId === session.sub;
  const isCreator = task.createdById === session.sub;

  if (!canDeleteAll && !canDelete) {
    return NextResponse.json({ error: 'Forbidden: No permission to delete tasks' }, { status: 403 });
  }

  if (!canDeleteAll && !isAssignedUser && !isCreator) {
    return NextResponse.json({ error: 'Forbidden: You can only delete your own tasks' }, { status: 403 });
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return NextResponse.json({ success: true });
}
