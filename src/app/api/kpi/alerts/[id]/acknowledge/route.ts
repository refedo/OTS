import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// PATCH /api/kpi/alerts/[id]/acknowledge - Acknowledge alert
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

    // Get the alert
    const alert = await prisma.kPIAlert.findUnique({
      where: { id: params.id },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Check if already acknowledged
    if (alert.acknowledgedBy) {
      return NextResponse.json(
        { error: 'Alert already acknowledged' },
        { status: 400 }
      );
    }

    // Get user for RBAC
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true, department: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user has permission to acknowledge this alert
    if (user.role.name === 'Employee' && alert.entityId !== session.sub) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot acknowledge this alert' },
        { status: 403 }
      );
    }

    if (user.role.name === 'Manager' && alert.entityType === 'department' && alert.entityId !== user.departmentId) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot acknowledge this alert' },
        { status: 403 }
      );
    }

    // Acknowledge the alert
    const updatedAlert = await prisma.kPIAlert.update({
      where: { id: params.id },
      data: {
        acknowledgedBy: session.sub,
        acknowledgedAt: new Date(),
      },
      include: {
        kpiDefinition: {
          select: { id: true, code: true, name: true, unit: true },
        },
        acknowledger: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}
