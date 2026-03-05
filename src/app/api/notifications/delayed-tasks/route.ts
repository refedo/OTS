import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { cache } from '@/lib/cache';

// GET - Fetch delayed tasks (past due date and not completed)
export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user info for personalized filtering
    const currentUser = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, departmentId: true, role: { select: { name: true } } },
    });

    const isAdmin = currentUser?.role?.name === 'Admin' || currentUser?.role?.name === 'CEO';

    // Check cache first (30 second TTL) - cache per user
    const cacheKey = `delayed-tasks-${session.sub}`;
    const cached = cache.get(cacheKey, 30000);
    if (cached) {
      return NextResponse.json(cached);
    }

    const now = new Date();

    // Build user-specific filter: only tasks the user is involved in
    // Admin/CEO see all delayed tasks; others see only their own
    const userFilter = isAdmin ? {} : {
      OR: [
        { assignedToId: session.sub },           // assigned to user
        { createdById: session.sub },             // created by user
        { requesterId: session.sub },             // requested by user
        ...(currentUser?.departmentId ? [{
          departmentId: currentUser.departmentId, // same department (for dept heads)
        }] : []),
      ],
    };

    // Find delayed tasks personalized to the user
    const delayedTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: now, // Due date is in the past
        },
        status: {
          not: 'Completed', // Not completed
        },
        ...userFilter,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            projectNumber: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc', // Most overdue first
      },
    });

    // Calculate delay days for each task
    const tasksWithDelay = delayedTasks.map(task => {
      const dueDate = new Date(task.dueDate!);
      const delayDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...task,
        delayDays,
        delayStatus: delayDays > 7 ? 'critical' : delayDays > 3 ? 'warning' : 'minor',
      };
    });

    const result = {
      tasks: tasksWithDelay,
      total: tasksWithDelay.length,
      critical: tasksWithDelay.filter(t => t.delayStatus === 'critical').length,
      warning: tasksWithDelay.filter(t => t.delayStatus === 'warning').length,
      minor: tasksWithDelay.filter(t => t.delayStatus === 'minor').length,
    };

    // Cache the result
    cache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching delayed tasks:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch delayed tasks', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
