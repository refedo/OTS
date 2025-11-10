import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  status: z.enum(['Planned', 'In Progress', 'On Hold', 'Completed', 'Cancelled']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  actualStartDate: z.string().optional().nullable(),
  actualEndDate: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional().nullable(),
  budget: z.number().optional().nullable(),
  kpiImpact: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/initiatives/[id] - Get single initiative
export async function GET(
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

    const initiative = await prisma.initiative.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, position: true },
        },
        department: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        updater: {
          select: { id: true, name: true, email: true },
        },
        milestones: {
          include: {
            responsible: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { plannedDate: 'asc' },
        },
        tasks: {
          include: {
            assignedUser: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    return NextResponse.json(initiative);
  } catch (error) {
    console.error('Error fetching initiative:', error);
    return NextResponse.json(
      { error: 'Failed to fetch initiative' },
      { status: 500 }
    );
  }
}

// PATCH /api/initiatives/[id] - Update initiative
export async function PATCH(
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
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedBy: session.sub,
    };

    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.objective !== undefined) updateData.objective = parsed.data.objective;
    if (parsed.data.ownerId) updateData.ownerId = parsed.data.ownerId;
    if (parsed.data.departmentId !== undefined) updateData.departmentId = parsed.data.departmentId;
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.priority) updateData.priority = parsed.data.priority;
    if (parsed.data.startDate !== undefined) updateData.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    if (parsed.data.endDate !== undefined) updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
    if (parsed.data.actualStartDate !== undefined) updateData.actualStartDate = parsed.data.actualStartDate ? new Date(parsed.data.actualStartDate) : null;
    if (parsed.data.actualEndDate !== undefined) updateData.actualEndDate = parsed.data.actualEndDate ? new Date(parsed.data.actualEndDate) : null;
    if (parsed.data.progress !== undefined) updateData.progress = parsed.data.progress;
    if (parsed.data.budget !== undefined) updateData.budget = parsed.data.budget;
    if (parsed.data.kpiImpact !== undefined) updateData.kpiImpact = parsed.data.kpiImpact;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const initiative = await prisma.initiative.update({
      where: { id: params.id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true, position: true },
        },
        department: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        updater: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(initiative);
  } catch (error) {
    console.error('Error updating initiative:', error);
    return NextResponse.json(
      { error: 'Failed to update initiative' },
      { status: 500 }
    );
  }
}

// DELETE /api/initiatives/[id] - Delete initiative
export async function DELETE(
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

    // Only Admin can delete
    if (session.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await prisma.initiative.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Initiative deleted successfully' });
  } catch (error) {
    console.error('Error deleting initiative:', error);
    return NextResponse.json(
      { error: 'Failed to delete initiative' },
      { status: 500 }
    );
  }
}
