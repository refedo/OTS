import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all tasks that have audit logs with snapshots created in the last 30 minutes
    // and haven't been undone yet
    const fiveMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const recentAuditLogs = await prisma.taskAuditLog.findMany({
      where: {
        snapshot: { not: null },
        undone: false,
        createdAt: { gte: fiveMinutesAgo },
      },
      select: {
        taskId: true,
      },
      distinct: ['taskId'],
    });

    const taskIds = recentAuditLogs.map(log => log.taskId);

    return NextResponse.json({ taskIds });
  } catch (error) {
    console.error('Failed to fetch recently changed tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch recently changed tasks' }, { status: 500 });
  }
}
