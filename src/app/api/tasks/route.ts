import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import NotificationService from '@/lib/services/notification.service';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { logActivity } from '@/lib/api-utils';

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  buildingId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  backlogItemId: z.string().uuid().optional().nullable(),
  taskInputDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['Pending', 'In Progress', 'Waiting for Approval', 'Completed']).optional(),
  isPrivate: z.boolean().optional(),
  isCeoTask: z.boolean().optional(),
  remark: z.string().optional().nullable(),
  revision: z.string().optional().nullable(),
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

  // Get user permissions
  const userPermissions = await getCurrentUserPermissions();

  // Build where clause based on permissions and filters
  let whereClause: any = {};

  // Permission-based filtering
  const isCeo = session.role === 'CEO';
  
  if (userPermissions.includes('tasks.view_all')) {
    // Users with tasks.view_all can see all tasks (or can filter)
    // But still filter out private tasks that don't belong to them
    if (assignedTo) {
      whereClause.assignedToId = assignedTo;
    }
    // Filter private tasks - only show non-private OR tasks where user is creator/assignee
    // Also filter CEO tasks - only CEO can see CEO tasks
    whereClause.AND = [
      {
        OR: [
          { isPrivate: false },
          { createdById: session.sub },
          { assignedToId: session.sub },
        ],
      },
      // CEO task visibility: only CEO can see CEO tasks
      isCeo ? {} : { isCeoTask: false },
    ];
  } else {
    // Users without tasks.view_all only see their assigned tasks
    whereClause.assignedToId = session.sub;
    // Non-CEO users cannot see CEO tasks even if assigned
    if (!isCeo) {
      whereClause.isCeoTask = false;
    }
  }

  // Apply additional filters
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (projectId) whereClause.projectId = projectId;

  let tasks = await prisma.task.findMany({
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
  });

  // Try to add completedBy and approvedBy if the fields exist in the database
  try {
    const tasksWithExtras = await prisma.task.findMany({
      where: whereClause,
      select: {
        id: true,
        approvedAt: true,
        completedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true, position: true },
        },
      },
    });
    
    // Merge extra data into tasks
    tasks = tasks.map(task => {
      const extra = tasksWithExtras.find(t => t.id === task.id);
      return {
        ...task,
        completedBy: extra?.completedBy || null,
        approvedAt: extra?.approvedAt || null,
        approvedBy: extra?.approvedBy || null,
      };
    });
  } catch (error) {
    console.log('Extended fields not available in database yet');
  }

  // Add orderBy to the original query
  tasks = tasks.sort((a, b) => {
    // Sort by status (Pending first)
    const statusOrder = { 'Pending': 0, 'In Progress': 1, 'Waiting for Approval': 2, 'Completed': 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    
    // Sort by priority (High first)
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // Sort by due date (earliest first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return 0;
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission to create tasks
    const userPermissions = await getCurrentUserPermissions();
    if (!userPermissions.includes('tasks.create')) {
      return NextResponse.json({ error: 'Forbidden - You do not have permission to create tasks' }, { status: 403 });
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
    if (parsed.data.backlogItemId) taskData.backlogItemId = parsed.data.backlogItemId;
    if (parsed.data.taskInputDate) taskData.taskInputDate = new Date(parsed.data.taskInputDate);
    if (parsed.data.dueDate) taskData.dueDate = new Date(parsed.data.dueDate);
    
    // Normalize priority to database format (capitalize first letter)
    if (parsed.data.priority) {
      const priorityMap: Record<string, string> = {
        'LOW': 'Low',
        'MEDIUM': 'Medium',
        'HIGH': 'High',
        'CRITICAL': 'High', // Map CRITICAL to High
        'Low': 'Low',
        'Medium': 'Medium',
        'High': 'High',
      };
      taskData.priority = priorityMap[parsed.data.priority] || 'Medium';
    }
    
    if (parsed.data.status) taskData.status = parsed.data.status;
    
    // Auto-mark as private if user is assigning to themselves, or if explicitly set
    if (parsed.data.isPrivate !== undefined) {
      taskData.isPrivate = parsed.data.isPrivate;
    } else if (parsed.data.assignedToId && parsed.data.assignedToId === session.sub) {
      // Auto-mark as private when self-assigning
      taskData.isPrivate = true;
    }
    
    // CEO task visibility - only CEO can create CEO tasks
    if (parsed.data.isCeoTask && session.role === 'CEO') {
      taskData.isCeoTask = true;
    }
    
    // Additional fields
    if (parsed.data.remark) taskData.remark = parsed.data.remark;
    if (parsed.data.revision) taskData.revision = parsed.data.revision;

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

    // Log audit trail and system event
    await logActivity({
      action: 'CREATE',
      entityType: 'Task',
      entityId: task.id,
      entityName: task.title,
      userId: session.sub,
      projectId: task.projectId || undefined,
      metadata: { 
        assignedTo: task.assignedTo?.name,
        priority: task.priority,
        status: task.status,
      },
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
