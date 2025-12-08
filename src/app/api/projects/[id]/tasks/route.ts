import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:projectId/tasks
 * Returns all tasks for a project with filtering options
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get('status'); // 'completed', 'non-completed', 'all'
    const filterMyTasks = searchParams.get('myTasks') === 'true';

    // Build where clause
    const whereClause: any = { projectId };

    if (filterStatus === 'completed') {
      whereClause.status = 'Completed';
    } else if (filterStatus === 'non-completed') {
      whereClause.status = { in: ['Pending', 'In Progress'] };
    }

    if (filterMyTasks) {
      whereClause.assignedToId = session.userId;
    }

    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // Pending first
        { priority: 'desc' }, // High priority first
        { dueDate: 'asc' }, // Earliest due date first
      ],
    });

    // Calculate statistics
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    
    // Calculate overdue tasks
    const now = new Date();
    const overdue = tasks.filter(
      t => t.dueDate && t.dueDate < now && t.status !== 'Completed'
    ).length;

    // Map to response format
    const tasksData = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo ? {
        id: task.assignedTo.id,
        name: task.assignedTo.name,
      } : null,
      status: task.status as 'Pending' | 'In Progress' | 'Completed',
      priority: task.priority as 'Low' | 'Medium' | 'High',
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      buildingId: task.buildingId,
      buildingName: task.building?.name || null,
    }));

    return NextResponse.json({
      total,
      completed,
      inProgress,
      pending,
      overdue,
      tasks: tasksData,
    });
  } catch (error) {
    console.error('Error fetching tasks data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks data' },
      { status: 500 }
    );
  }
}
