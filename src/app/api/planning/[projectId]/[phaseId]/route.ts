import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// PATCH /api/planning/[projectId]/[phaseId] - Update a specific phase
export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string; phaseId: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin and Manager can update plans
    if (session.role !== 'Admin' && session.role !== 'Manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { phaseId } = params;
    const body = await request.json();

    const {
      plannedStart,
      plannedEnd,
      plannedDuration,
      actualStart,
      actualEnd,
      progress,
      responsibleDept,
      status,
      remarks,
    } = body;

    // Calculate actual duration if both dates are provided
    let actualDuration = null;
    if (actualStart && actualEnd) {
      const start = new Date(actualStart);
      const end = new Date(actualEnd);
      actualDuration = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Auto-update status based on progress and dates
    let autoStatus = status;
    if (!autoStatus) {
      if (actualEnd) {
        autoStatus = 'Completed';
      } else if (actualStart) {
        autoStatus = 'In Progress';
      } else if (plannedStart && new Date(plannedStart) > new Date()) {
        autoStatus = 'Not Started';
      } else if (plannedEnd && new Date(plannedEnd) < new Date() && !actualEnd) {
        autoStatus = 'Delayed';
      }
    }

    const updatedPlan = await prisma.projectPlan.update({
      where: { id: phaseId },
      data: {
        plannedStart: plannedStart ? new Date(plannedStart) : undefined,
        plannedEnd: plannedEnd ? new Date(plannedEnd) : undefined,
        plannedDuration,
        actualStart: actualStart ? new Date(actualStart) : undefined,
        actualEnd: actualEnd ? new Date(actualEnd) : undefined,
        actualDuration,
        progress: progress !== undefined ? progress : undefined,
        responsibleDept,
        status: autoStatus,
        remarks,
        updatedById: session.sub,
      },
      include: {
        project: {
          select: {
            projectNumber: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Error updating project plan:', error);
    return NextResponse.json(
      { error: 'Failed to update project plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/planning/[projectId]/[phaseId] - Delete a specific phase
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string; phaseId: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin can delete phases
    if (session.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { phaseId } = params;

    await prisma.projectPlan.delete({
      where: { id: phaseId },
    });

    return NextResponse.json({ message: 'Phase deleted successfully' });
  } catch (error) {
    console.error('Error deleting project plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete project plan' },
      { status: 500 }
    );
  }
}
