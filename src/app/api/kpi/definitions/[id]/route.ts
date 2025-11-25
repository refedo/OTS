import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// GET /api/kpi/definitions/[id] - Get single KPI definition
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const definition = await prisma.kPIDefinition.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
        scores: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        targets: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            scores: true,
            targets: true,
            manualEntries: true,
            alerts: true,
          },
        },
      },
    });

    if (!definition) {
      return NextResponse.json(
        { error: 'KPI definition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(definition);
  } catch (error) {
    console.error('Error fetching KPI definition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI definition' },
      { status: 500 }
    );
  }
}

// PATCH /api/kpi/definitions/[id] - Update KPI definition (Admin only)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user || user.role.name !== 'Admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Get existing definition for history
    const existing = await prisma.kPIDefinition.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'KPI definition not found' },
        { status: 404 }
      );
    }

    // Update definition
    const definition = await prisma.kPIDefinition.update({
      where: { id: params.id },
      data: {
        ...body,
        updatedById: session.sub,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log update in history
    await prisma.kPIHistory.create({
      data: {
        kpiId: definition.id,
        action: 'definition_updated',
        payload: {
          before: existing,
          after: definition,
          changes: body,
        },
        performedBy: session.sub,
      },
    });

    return NextResponse.json(definition);
  } catch (error) {
    console.error('Error updating KPI definition:', error);
    return NextResponse.json(
      { error: 'Failed to update KPI definition' },
      { status: 500 }
    );
  }
}

// DELETE /api/kpi/definitions/[id] - Delete KPI definition (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Admin
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true },
    });

    if (!user || user.role.name !== 'Admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get definition for history
    const definition = await prisma.kPIDefinition.findUnique({
      where: { id: params.id },
    });

    if (!definition) {
      return NextResponse.json(
        { error: 'KPI definition not found' },
        { status: 404 }
      );
    }

    // Delete definition (cascade will delete related records)
    await prisma.kPIDefinition.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'KPI definition deleted successfully' });
  } catch (error) {
    console.error('Error deleting KPI definition:', error);
    return NextResponse.json(
      { error: 'Failed to delete KPI definition' },
      { status: 500 }
    );
  }
}
