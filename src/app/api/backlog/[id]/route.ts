import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.productBacklogItem.findUnique({
      where: { id: params.id },
      include: {
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching backlog item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backlog item' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const isCEOOrAdmin = user.role.name === 'CEO' || user.role.name === 'Admin';

    // Check permissions for status changes
    if (body.status) {
      if (body.status === 'APPROVED' && !isCEOOrAdmin) {
        return NextResponse.json(
          { error: 'Only CEO or Admin can approve backlog items' },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.businessReason !== undefined) updateData.businessReason = body.businessReason;
    if (body.expectedValue !== undefined) updateData.expectedValue = body.expectedValue;
    if (body.affectedModules !== undefined) updateData.affectedModules = body.affectedModules;
    if (body.riskLevel !== undefined) updateData.riskLevel = body.riskLevel;
    if (body.complianceFlag !== undefined) updateData.complianceFlag = body.complianceFlag;
    if (body.linkedObjectiveId !== undefined) updateData.linkedObjectiveId = body.linkedObjectiveId;
    if (body.linkedKpiId !== undefined) updateData.linkedKpiId = body.linkedKpiId;

    // Priority changes allowed for CEO/Admin only
    if (body.priority !== undefined && isCEOOrAdmin) {
      updateData.priority = body.priority;
    }

    // Status workflow enforcement
    if (body.status !== undefined) {
      updateData.status = body.status;

      if (body.status === 'APPROVED') {
        updateData.approvedById = session.sub;
        updateData.approvedAt = new Date();
      }

      if (body.status === 'PLANNED') {
        updateData.plannedAt = new Date();
      }

      if (body.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    const item = await prisma.productBacklogItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        tasks: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating backlog item:', error);
    return NextResponse.json(
      { error: 'Failed to update backlog item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isCEOOrAdmin = user.role.name === 'CEO' || user.role.name === 'Admin';

    if (!isCEOOrAdmin) {
      return NextResponse.json(
        { error: 'Only CEO or Admin can delete backlog items' },
        { status: 403 }
      );
    }

    await prisma.productBacklogItem.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Backlog item deleted successfully' });
  } catch (error) {
    console.error('Error deleting backlog item:', error);
    return NextResponse.json(
      { error: 'Failed to delete backlog item' },
      { status: 500 }
    );
  }
}
