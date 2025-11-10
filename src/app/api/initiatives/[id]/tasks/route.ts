import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';

const createTaskSchema = z.object({
  taskName: z.string().min(2),
  assignedTo: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
  progress: z.number().min(0).max(100).optional(),
  notes: z.string().optional().nullable(),
});

// POST /api/initiatives/[id]/tasks - Create task
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user is Admin or Manager
    if (!['Admin', 'Manager'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const taskData: any = {
      initiativeId: params.id,
      taskName: parsed.data.taskName,
    };

    if (parsed.data.assignedTo) taskData.assignedTo = parsed.data.assignedTo;
    if (parsed.data.startDate) taskData.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) taskData.endDate = new Date(parsed.data.endDate);
    if (parsed.data.status) taskData.status = parsed.data.status;
    if (parsed.data.progress !== undefined) taskData.progress = parsed.data.progress;
    if (parsed.data.notes) taskData.notes = parsed.data.notes;

    const task = await prisma.initiativeTask.create({
      data: taskData,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update initiative progress
    await updateInitiativeProgress(params.id);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// Helper function to update initiative progress
async function updateInitiativeProgress(initiativeId: string) {
  const milestones = await prisma.initiativeMilestone.findMany({
    where: { initiativeId },
  });

  const tasks = await prisma.initiativeTask.findMany({
    where: { initiativeId },
  });

  let totalProgress = 0;
  let count = 0;

  if (milestones.length > 0) {
    const milestoneProgress = milestones.reduce((sum, m) => sum + (m.progress || 0), 0) / milestones.length;
    totalProgress += milestoneProgress;
    count++;
  }

  if (tasks.length > 0) {
    const taskProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length;
    totalProgress += taskProgress;
    count++;
  }

  const averageProgress = count > 0 ? totalProgress / count : 0;

  await prisma.initiative.update({
    where: { id: initiativeId },
    data: { progress: averageProgress },
  });
}
