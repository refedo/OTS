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

    // Check cache first (30 second TTL)
    const cacheKey = 'delayed-tasks';
    const cached = cache.get(cacheKey, 30000);
    if (cached) {
      return NextResponse.json(cached);
    }

    const now = new Date();

    // Find all tasks that are past due date and not completed
    const delayedTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: now, // Due date is in the past
        },
        status: {
          not: 'Completed', // Not completed
        },
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
