import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/api-utils';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, status: true, backlogItemId: true },
    });

    if (!task || task.backlogItemId !== id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
      if (parsed.data.status === 'Completed' && task.status !== 'Completed') {
        updateData.completedAt = new Date();
        updateData.completedById = session.sub;
      } else if (parsed.data.status !== 'Completed' && task.status === 'Completed') {
        updateData.completedAt = null;
        updateData.completedById = null;
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      select: { id: true, title: true, status: true, priority: true, description: true, assignedTo: { select: { id: true, name: true, email: true } } },
    });

    const event =
      parsed.data.status === 'Completed' ? 'task_completed'
      : task.status === 'Completed' && parsed.data.status !== undefined ? 'task_reopened'
      : 'task_updated';

    await logAuditEvent({
      entityType: 'ProductBacklogItem',
      entityId: id,
      action: 'UPDATE',
      userId: session.sub,
      metadata: { event, taskId: task.id, taskTitle: task.title, newStatus: parsed.data.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update backlog task');
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, backlogItemId: true },
    });

    if (!task || task.backlogItemId !== id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: taskId } });

    await logAuditEvent({
      entityType: 'ProductBacklogItem',
      entityId: id,
      action: 'UPDATE',
      userId: session.sub,
      metadata: { event: 'task_deleted', taskId: task.id, taskTitle: task.title },
    });

    return NextResponse.json({ message: 'Task deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete backlog task');
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
