import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';

const updateMilestoneSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  plannedDate: z.string().optional().nullable(),
  actualDate: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Delayed']).optional(),
  responsibleId: z.string().uuid().optional().nullable(),
});

// PATCH /api/initiatives/[id]/milestones/[mid] - Update milestone
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; mid: string } }
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
    const parsed = updateMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.plannedDate !== undefined) updateData.plannedDate = parsed.data.plannedDate ? new Date(parsed.data.plannedDate) : null;
    if (parsed.data.actualDate !== undefined) updateData.actualDate = parsed.data.actualDate ? new Date(parsed.data.actualDate) : null;
    if (parsed.data.progress !== undefined) updateData.progress = parsed.data.progress;
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.responsibleId !== undefined) updateData.responsibleId = parsed.data.responsibleId;

    const milestone = await prisma.initiativeMilestone.update({
      where: { id: params.mid },
      data: updateData,
      include: {
        responsible: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update initiative progress
    await updateInitiativeProgress(params.id);

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    );
  }
}

// DELETE /api/initiatives/[id]/milestones/[mid] - Delete milestone
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; mid: string } }
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

    await prisma.initiativeMilestone.delete({
      where: { id: params.mid },
    });

    // Update initiative progress
    await updateInitiativeProgress(params.id);

    return NextResponse.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
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
