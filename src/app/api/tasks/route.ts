import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import NotificationService from '@/lib/services/notification.service';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  buildingId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  taskInputDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
});

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assignedTo = searchParams.get('assignedTo');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const projectId = searchParams.get('projectId');

  // Build where clause based on role and filters
  let whereClause: any = {};

  // Role-based filtering
  if (session.role === 'Admin' || session.role === 'Manager') {
    // Admins and Managers see all tasks (or can filter)
    if (assignedTo) whereClause.assignedToId = assignedTo;
  } else {
    // Engineers/Operators only see their assigned tasks
    whereClause.assignedToId = session.sub;
  }

  // Apply additional filters
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (projectId) whereClause.projectId = projectId;

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, position: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      project: {
        select: { id: true, projectNumber: true, name: true },
      },
      building: {
        select: { id: true, designation: true, name: true },
      },
      department: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { status: 'asc' }, // Pending first
      { priority: 'desc' }, // High priority first
      { dueDate: 'asc' }, // Earliest due date first
    ],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    // Only Admins and Managers can create tasks
    if (!session || !['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    console.log('Received task data:', body);
    
    const parsed = createSchema.safeParse(body);
    
    if (!parsed.success) {
      console.error('Validation error:', parsed.error);
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    console.log('Creating task with data:', { ...parsed.data, createdById: session.sub });

    const taskData: any = {
      title: parsed.data.title,
      createdById: session.sub,
    };

    if (parsed.data.description) taskData.description = parsed.data.description;
    if (parsed.data.assignedToId) taskData.assignedToId = parsed.data.assignedToId;
    if (parsed.data.projectId) taskData.projectId = parsed.data.projectId;
    if (parsed.data.buildingId) taskData.buildingId = parsed.data.buildingId;
    if (parsed.data.departmentId) taskData.departmentId = parsed.data.departmentId;
    if (parsed.data.taskInputDate) taskData.taskInputDate = new Date(parsed.data.taskInputDate);
    if (parsed.data.dueDate) taskData.dueDate = new Date(parsed.data.dueDate);
    if (parsed.data.priority) taskData.priority = parsed.data.priority;
    if (parsed.data.status) taskData.status = parsed.data.status;

    const task = await prisma.task.create({
      data: taskData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, position: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        building: {
          select: { id: true, designation: true, name: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
    });

    console.log('Task created successfully:', task.id);

    // Send notification to assigned user
    if (task.assignedToId && task.assignedTo) {
      try {
        await NotificationService.notifyTaskAssigned({
          taskId: task.id,
          assignedToId: task.assignedToId,
          taskTitle: task.title,
          assignedByName: task.createdBy.name,
          dueDate: task.dueDate || undefined,
          projectName: task.project?.name,
          buildingName: task.building?.name,
        });
        console.log('Notification sent to:', task.assignedTo.name);
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }
    }

    // Sync to WorkUnit for Operations Control (non-blocking)
    WorkUnitSyncService.syncFromTask({
      id: task.id,
      projectId: task.projectId,
      createdById: task.createdById,
      assignedToId: task.assignedToId,
      taskInputDate: task.taskInputDate,
      dueDate: task.dueDate,
      status: task.status,
      departmentId: task.departmentId,
    }).catch((err) => {
      console.error('WorkUnit sync failed:', err);
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ 
      error: 'Failed to create task', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
