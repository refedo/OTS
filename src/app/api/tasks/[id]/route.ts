import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  buildingId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  taskInputDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['Pending', 'In Progress', 'Waiting for Approval', 'Completed']).optional(),
  isPrivate: z.boolean().optional(),
  isCeoTask: z.boolean().optional(),
  approved: z.boolean().optional(),
});

// Helper to create audit log entries
async function createTaskAuditLog(
  taskId: string,
  userId: string,
  action: string,
  field?: string,
  oldValue?: string | null,
  newValue?: string | null
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

  // Check permissions: Admins/Managers see all, others only their assigned tasks
  // Also check private task access
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    if (task.assignedToId !== session.sub && task.createdById !== session.sub) {
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
  // - Admins/Managers can update everything
  // - Assigned users can only update status
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    if (task.assignedToId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Engineers/Operators can only update status and approval
    if (Object.keys(parsed.data).some(key => key !== 'status' && key !== 'approved')) {
      return NextResponse.json({ error: 'You can only update task status' }, { status: 403 });
    }
  }

  const updateData: any = { ...parsed.data };
  if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate);
  if (parsed.data.taskInputDate) updateData.taskInputDate = new Date(parsed.data.taskInputDate);
  
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
    } else if (parsed.data.approved === false) {
      updateData.approvedAt = null;
      updateData.approvedById = null;
    }
    // Remove the 'approved' field from updateData since it's not a real DB field
    delete updateData.approved;
  } catch (error) {
    console.log('Approval tracking fields not available in database yet');
  }
  
  // CEO task visibility - only CEO can set/modify isCeoTask
  if (parsed.data.isCeoTask !== undefined) {
    if (session.role === 'CEO') {
      updateData.isCeoTask = parsed.data.isCeoTask;
    } else {
      delete updateData.isCeoTask;
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
        
        auditPromises.push(createTaskAuditLog(id, session.sub, action, field, oldDisplay, newDisplay));
      }
    }
  }
  
  // Execute all audit logs (non-blocking)
  Promise.all(auditPromises).catch(err => console.error('Audit logging failed:', err));

  return NextResponse.json(updatedTask);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  // Only Admins can delete tasks
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await prisma.task.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
