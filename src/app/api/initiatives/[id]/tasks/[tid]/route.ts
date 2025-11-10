import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';

const updateTaskSchema = z.object({
  taskName: z.string().min(2).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
  progress: z.number().min(0).max(100).optional(),
  notes: z.string().optional().nullable(),
});

// PATCH /api/initiatives/[id]/tasks/[tid] - Update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; tid: string } }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (parsed.data.taskName) updateData.taskName = parsed.data.taskName;
    if (parsed.data.assignedTo !== undefined) updateData.assignedTo = parsed.data.assignedTo;
    if (parsed.data.startDate !== undefined) updateData.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    if (parsed.data.endDate !== undefined) updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.progress !== undefined) updateData.progress = parsed.data.progress;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const task = await prisma.initiativeTask.update({
      where: { id: params.tid },
      data: updateData,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update initiative progress
    await updateInitiativeProgress(params.id);

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/initiatives/[id]/tasks/[tid] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tid: string } }
) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check if user is Admin or Manager
    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await prisma.initiativeTask.delete({
      where: { id: params.tid },
    });

    // Update initiative progress
    await updateInitiativeProgress(params.id);

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

// Helper function to update initiative progress
async function updateInitiativeProgress(initiativeId: string) {
  const milestones = await prisma.initiativeMilestone.findMany({
    where: { initiativeId },
  });

  const tasks = await prisma.initiativeTask.findMany({
    where: { initiativeId },
  });

  let totalProgress = 0;
  let count = 0;

  if (milestones.length > 0) {
    const milestoneProgress = milestones.reduce((sum, m) => sum + (m.progress || 0), 0) / milestones.length;
    totalProgress += milestoneProgress;
    count++;
  }

  if (tasks.length > 0) {
    const taskProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length;
    totalProgress += taskProgress;
    count++;
  }

  const averageProgress = count > 0 ? totalProgress / count : 0;

  await prisma.initiative.update({
    where: { id: initiativeId },
    data: { progress: averageProgress },
  });
}
