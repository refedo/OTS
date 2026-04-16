import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'agent/tasks/stale' });

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-ots-agent-secret') === process.env.OTS_INTERNAL_API_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const staleDays = parseInt(searchParams.get('taskStaleDays') ?? '3', 10);
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'APPROVED'] },
        OR: [{ dueDate: { lt: now } }, { updatedAt: { lt: staleDate } }],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 100,
    });

    const enriched = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
      lastActivity: t.updatedAt.toISOString(),
      assignee: t.assignedTo ? { id: t.assignedTo.id, name: t.assignedTo.name } : null,
      project: t.project ? { id: t.project.id, name: t.project.name } : null,
      isOverdue: t.dueDate ? t.dueDate < now : false,
      isStale: t.updatedAt < staleDate,
      daysSinceUpdate: Math.floor((now.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    return NextResponse.json({ tasks: enriched, count: enriched.length, staleDays });
  } catch (error) {
    log.error({ error }, 'Failed to fetch stale tasks');
    return NextResponse.json({ error: 'Failed to fetch stale tasks' }, { status: 500 });
  }
}
