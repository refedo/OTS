import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find Walid Dami's user ID by name
  const ceoUser = await prisma.user.findFirst({
    where: { name: { contains: 'Walid' }, isActive: true },
    select: { id: true, name: true },
  });

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { isCeoTask: true },
        ...(ceoUser ? [{ assignedToId: ceoUser.id }, { createdById: ceoUser.id }] : []),
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
