import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { cache } from '@/lib/cache';
import { logger } from '@/lib/logger';

// GET - Fetch delayed tasks (past due date and not completed)
export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if personal-only mode is requested (used by widgets/dialogs)
    const url = new URL(req.url);
    const personalOnly = url.searchParams.get('personal') === 'true';

    // Permission-based filtering
    const userPermissions = await getCurrentUserPermissions();
    const isAdmin = userPermissions.includes('tasks.view_all');

    // Get department for filtering
    const currentUser = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, departmentId: true },
    });

    // Check cache first (30 second TTL) - cache per user and mode
    const cacheKey = `delayed-tasks-${session.sub}-${personalOnly ? 'personal' : 'all'}`;
    const cached = cache.get(cacheKey, 30000);
    if (cached) {
      return NextResponse.json(cached);
    }

    const now = new Date();

    // Personal filter: tasks where user is assigner, assignee, or requester
    const personalFilter = {
      OR: [
        { assignedToId: session.sub },
        { createdById: session.sub },
        { requesterId: session.sub },
      ],
    };

    // Build user-specific filter
    // personalOnly mode: always filter to user's own tasks (for widgets/dialogs)
    // Otherwise: Admin/CEO see all delayed tasks; others see own + department
    const userFilter = personalOnly
      ? personalFilter
      : isAdmin
        ? {}
        : {
            OR: [
              ...personalFilter.OR,
              ...(currentUser?.departmentId ? [{
                departmentId: currentUser.departmentId,
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
        deletedAt: null,
        ...userFilter,
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        priority: true,
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
    logger.error({ error }, 'Failed to fetch delayed tasks');
    return NextResponse.json({ error: 'Failed to fetch delayed tasks' }, { status: 500 });
  }
}
