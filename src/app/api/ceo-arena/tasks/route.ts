import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Show: tasks flagged as CEO tasks, tasks assigned to the viewer, or tasks created by the viewer.
  // The CEO Arena requires executive.view, so whoever is viewing IS the CEO.
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { isCeoTask: true },
        { assignedToId: session.sub },
        { createdById: session.sub },
      ],
      status: { not: 'Completed' },
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      project: { select: { name: true, projectNumber: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  });

  return NextResponse.json({ tasks });
}
