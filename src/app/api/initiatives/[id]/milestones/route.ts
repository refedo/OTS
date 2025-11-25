import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';

const createMilestoneSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  plannedDate: z.string().optional().nullable(),
  actualDate: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Delayed']).optional(),
  responsibleId: z.string().uuid().optional().nullable(),
});

// POST /api/initiatives/[id]/milestones - Create milestone
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
    const parsed = createMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const milestoneData: any = {
      initiativeId: params.id,
      name: parsed.data.name,
    };

    if (parsed.data.description) milestoneData.description = parsed.data.description;
    if (parsed.data.plannedDate) milestoneData.plannedDate = new Date(parsed.data.plannedDate);
    if (parsed.data.actualDate) milestoneData.actualDate = new Date(parsed.data.actualDate);
    if (parsed.data.progress !== undefined) milestoneData.progress = parsed.data.progress;
    if (parsed.data.status) milestoneData.status = parsed.data.status;
    if (parsed.data.responsibleId) milestoneData.responsibleId = parsed.data.responsibleId;

    const milestone = await prisma.initiativeMilestone.create({
      data: milestoneData,
      include: {
        responsible: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update initiative progress
    await updateInitiativeProgress(params.id);

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to create milestone' },
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
