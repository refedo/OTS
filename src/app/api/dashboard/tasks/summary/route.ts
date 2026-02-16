import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = session.sub;
    const userRole = session.role;

    // Fetch user with role permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse permissions
    const permissions = user.role.permissions as any;
    const canViewAllTasks = permissions?.tasks?.viewAll || userRole === 'admin';

    // Build query based on permissions
    let taskQuery: any = {};
    
    if (!canViewAllTasks) {
      // User can only see tasks assigned to them or created by them
      taskQuery = {
        OR: [
          { assignedToId: userId },
          { createdById: userId },
        ],
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Get total tasks (excluding completed)
    const totalTasks = await prisma.task.count({
      where: {
        ...taskQuery,
        status: {
          not: 'Completed',
        },
      },
    });

    // Get my tasks (assigned to current user, not completed)
    const myTasks = await prisma.task.count({
      where: {
        assignedToId: userId,
        status: {
          not: 'Completed',
        },
      },
    });

    // Get overdue tasks
    const overdueTasks = await prisma.task.count({
      where: {
        ...taskQuery,
        status: {
          not: 'Completed',
        },
        dueDate: {
          lt: today,
        },
      },
    });

    // Get tasks due today
    const tasksDueToday = await prisma.task.count({
      where: {
        ...taskQuery,
        status: {
          not: 'Completed',
        },
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get completed tasks (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const tasksCompleted = await prisma.task.count({
      where: {
        ...taskQuery,
        status: 'Completed',
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get tasks by priority
    const highPriorityTasks = await prisma.task.count({
      where: {
        ...taskQuery,
        status: {
          not: 'Completed',
        },
        priority: 'High',
      },
    });

    // Get approved tasks (completed and approved)
    const approvedTasks = await prisma.task.count({
      where: {
        ...taskQuery,
        status: 'Completed',
        approvedAt: {
          not: null,
        },
      },
    });

    // Get pending approval tasks (completed but not approved)
    const pendingApprovalTasks = await prisma.task.count({
      where: {
        ...taskQuery,
        status: 'Completed',
        approvedAt: null,
      },
    });

    return NextResponse.json({
      total: totalTasks,
      myTasks,
      overdue: overdueTasks,
      dueToday: tasksDueToday,
      completed: tasksCompleted,
      highPriority: highPriorityTasks,
      approved: approvedTasks,
      pendingApproval: pendingApprovalTasks,
    });

  } catch (error) {
    console.error('Error fetching task summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task summary' },
      { status: 500 }
    );
  }
}
