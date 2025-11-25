import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

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
  status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
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

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Check permissions: Admins/Managers see all, others only their assigned tasks
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    if (task.assignedToId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
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

  const updatedTask = await prisma.task.update({
    where: { id: params.id },
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

  return NextResponse.json(updatedTask);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  // Only Admins can delete tasks
  if (!session || session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.task.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
