import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  
  // First verify the task exists and user has access
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      createdById: true,
      assignedToId: true,
      isPrivate: true,
      isCeoTask: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Check access permissions
  const isCeo = session.role === 'CEO';
  const isAdmin = session.role === 'Admin';
  const isManager = session.role === 'Manager';
  const isCreator = task.createdById === session.sub;
  const isAssignee = task.assignedToId === session.sub;

  // CEO tasks are only visible to CEO
  if (task.isCeoTask && !isCeo) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Private tasks are only visible to creator/assignee
  if (task.isPrivate && !isCreator && !isAssignee && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch audit logs
  const auditLogs = await prisma.taskAuditLog.findMany({
    where: { taskId: id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(auditLogs);
}
