import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { approveManualEntry } from '@/lib/kpi/calculator';

// PATCH /api/kpi/manual-entries/[id]/approve - Approve manual entry
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

    // Check if user is Manager or Admin
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true, department: true },
    });

    if (!user || !['Manager', 'Admin'].includes(user.role.name)) {
      return NextResponse.json(
        { error: 'Forbidden: Manager or Admin access required' },
        { status: 403 }
      );
    }

    // Get the entry
    const entry = await prisma.kPIManualEntry.findUnique({
      where: { id: params.id },
      include: {
        user: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Manual entry not found' },
        { status: 404 }
      );
    }

    // If Manager, verify user is in their department
    if (user.role.name === 'Manager' && entry.user.departmentId !== user.departmentId) {
      return NextResponse.json(
        { error: 'Forbidden: Can only approve entries for your department' },
        { status: 403 }
      );
    }

    // Approve the entry (this also creates/updates KPI score)
    await approveManualEntry(params.id, session.sub);

    // Get updated entry
    const updatedEntry = await prisma.kPIManualEntry.findUnique({
      where: { id: params.id },
      include: {
        kpiDefinition: {
          select: { id: true, code: true, name: true, unit: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedEntry);
  } catch (error: any) {
    console.error('Error approving manual entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve manual entry' },
      { status: 500 }
    );
  }
}
