import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/prisma';

// PATCH /api/detailed-project-planner/tasks/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.level !== undefined) updateData.level = body.level;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.durationDays !== undefined) updateData.durationDays = body.durationDays;
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.isSummary !== undefined) updateData.isSummary = body.isSummary;
    if (body.isMilestone !== undefined) updateData.isMilestone = body.isMilestone;
    if (body.taskMode !== undefined) updateData.taskMode = body.taskMode;
    if (body.parentId !== undefined) updateData.parentId = body.parentId || null;

    const task = await prisma.plannerTask.update({
      where: { id },
      data: updateData,
    });

    // Recalculate parent chain if dates changed
    if (task.parentId && (body.startDate !== undefined || body.endDate !== undefined || body.durationDays !== undefined)) {
      await recalculateParentChain(task.parentId);
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating planner task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/detailed-project-planner/tasks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the task first to know its parent
    const task = await prisma.plannerTask.findUnique({
      where: { id },
      select: { parentId: true },
    });

    // Delete cascades children via Prisma relation
    await prisma.plannerTask.delete({ where: { id } });

    // Recalculate parent if exists
    if (task?.parentId) {
      // Check if parent still has children
      const siblingCount = await prisma.plannerTask.count({
        where: { parentId: task.parentId },
      });

      if (siblingCount === 0) {
        await prisma.plannerTask.update({
          where: { id: task.parentId },
          data: { isSummary: false },
        });
      } else {
        await recalculateParentChain(task.parentId);
      }
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting planner task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

async function recalculateParentChain(parentId: string) {
  const children = await prisma.plannerTask.findMany({
    where: { parentId },
  });

  if (children.length === 0) return;

  const validChildren = children.filter(c => c.startDate && c.endDate);
  if (validChildren.length === 0) return;

  const earliestStart = new Date(
    Math.min(...validChildren.map(c => new Date(c.startDate!).getTime()))
  );
  const latestEnd = new Date(
    Math.max(...validChildren.map(c => new Date(c.endDate!).getTime()))
  );

  const msPerDay = 86400000;
  const totalDuration = Math.round(
    ((latestEnd.getTime() - earliestStart.getTime()) / msPerDay) * 100
  ) / 100;

  const totalProgress = validChildren.reduce((sum, c) => {
    const dur = c.durationDays ? Number(c.durationDays) : 1;
    return sum + (c.progress * dur);
  }, 0);
  const totalDur = validChildren.reduce((sum, c) => {
    return sum + (c.durationDays ? Number(c.durationDays) : 1);
  }, 0);
  const avgProgress = totalDur > 0 ? Math.round(totalProgress / totalDur) : 0;

  await prisma.plannerTask.update({
    where: { id: parentId },
    data: {
      startDate: earliestStart,
      endDate: latestEnd,
      durationDays: totalDuration,
      isSummary: true,
      progress: avgProgress,
    },
  });

  const parent = await prisma.plannerTask.findUnique({
    where: { id: parentId },
    select: { parentId: true },
  });

  if (parent?.parentId) {
    await recalculateParentChain(parent.parentId);
  }
}
