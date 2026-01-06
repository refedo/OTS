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
});

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

  // Try to fetch completedBy if the field exists in the database
  try {
    const taskWithCompletedBy = await prisma.task.findUnique({
      where: { id },
      select: {
        completedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
      },
    });
    
    if (taskWithCompletedBy?.completedBy) {
      task.completedBy = taskWithCompletedBy.completedBy;
    }
  } catch (error) {
    // completedBy field doesn't exist in database yet
    console.log('completedBy field not available in database yet');
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
    // Engineers/Operators can only update status
    if (Object.keys(parsed.data).some(key => key !== 'status')) {
      return NextResponse.json({ error: 'You can only update task status' }, { status: 403 });
    }
  }

  const updateData: any = { ...parsed.data };
  if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate);
  if (parsed.data.taskInputDate) updateData.taskInputDate = new Date(parsed.data.taskInputDate);
  
  // Handle completion tracking (only if database schema supports it)
  // Note: This will only work after database migration is applied
  try {
    if (parsed.data.status === 'Completed' && task.status !== 'Completed') {
      updateData.completedAt = new Date();
      updateData.completedById = session.sub;
    } else if (parsed.data.status !== 'Completed' && task.status === 'Completed') {
      updateData.completedAt = null;
      updateData.completedById = null;
    }
  } catch (error) {
    // If database doesn't have these fields yet, skip completion tracking
    console.log('Completion tracking fields not available in database yet');
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

  // Try to fetch completedBy if the field exists in the database
  try {
    const taskWithCompletedBy = await prisma.task.findUnique({
      where: { id },
      select: {
        completedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
      },
    });
    
    if (taskWithCompletedBy?.completedBy) {
      updatedTask.completedBy = taskWithCompletedBy.completedBy;
    }
  } catch (error) {
    // completedBy field doesn't exist in database yet
    console.log('completedBy field not available in database yet');
  }

  // Sync WorkUnit status if status was updated (non-blocking)
  if (parsed.data.status) {
    WorkUnitSyncService.syncTaskStatusUpdate(id, parsed.data.status).catch((err) => {
      console.error('WorkUnit status sync failed:', err);
    });
  }

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
