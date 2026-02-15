import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/prisma';

// GET /api/detailed-project-planner/tasks?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const tasks = await prisma.plannerTask.findMany({
      where: { plannerProjectId: projectId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching planner tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/detailed-project-planner/tasks
export async function POST(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plannerProjectId, parentId, name, level, startDate, endDate, durationDays, isMilestone } = body;

    if (!plannerProjectId || !name || !level) {
      return NextResponse.json(
        { error: 'plannerProjectId, name, and level are required' },
        { status: 400 }
      );
    }

    // Get the max sort order for this project
    const maxSortOrder = await prisma.plannerTask.aggregate({
      where: { plannerProjectId },
      _max: { sortOrder: true },
    });

    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

    // Determine if this is a summary task (has children potential based on level)
    const isSummary = level === 'building' || level === 'activity';

    const task = await prisma.plannerTask.create({
      data: {
        plannerProjectId,
        parentId: parentId || null,
        name,
        level,
        sortOrder: nextSortOrder,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        durationDays: durationDays || null,
        isSummary,
        isMilestone: isMilestone || false,
        taskMode: isSummary ? 'auto' : 'manual',
      },
    });

    // If parent exists, mark it as summary and recalculate
    if (parentId) {
      await prisma.plannerTask.update({
        where: { id: parentId },
        data: { isSummary: true, taskMode: 'auto' },
      });
      await recalculateParentChain(parentId);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating planner task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
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

  // Calculate progress as weighted average
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

  // Recurse up the chain
  const parent = await prisma.plannerTask.findUnique({
    where: { id: parentId },
    select: { parentId: true },
  });

  if (parent?.parentId) {
    await recalculateParentChain(parent.parentId);
  }
}
