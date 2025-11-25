import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// GET /api/kpi/manual-entries - List manual entries
export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const approved = searchParams.get('approved');
    const kpiId = searchParams.get('kpiId');

    const whereClause: any = {};
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (approved !== null) {
      whereClause.approved = approved === 'true';
    }
    
    if (kpiId) {
      whereClause.kpiId = kpiId;
    }

    // Get user for RBAC
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true, department: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Apply RBAC filters
    if (user.role.name === 'Employee') {
      // Employees can only see their own entries
      whereClause.userId = session.sub;
    } else if (user.role.name === 'Manager') {
      // Managers can see their department's entries
      const departmentUsers = await prisma.user.findMany({
        where: { departmentId: user.departmentId },
        select: { id: true },
      });
      whereClause.userId = {
        in: departmentUsers.map(u => u.id),
      };
    }
    // Admin and HR can see all

    const entries = await prisma.kPIManualEntry.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching manual entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual entries' },
      { status: 500 }
    );
  }
}

// POST /api/kpi/manual-entries - Create manual entry (Manager/Admin)
export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      kpiId,
      userId,
      periodStart,
      periodEnd,
      value,
      notes,
    } = body;

    // Validate required fields
    if (!kpiId || !userId || !periodStart || !periodEnd || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify KPI exists
    const kpi = await prisma.kPIDefinition.findUnique({
      where: { id: kpiId },
    });

    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI definition not found' },
        { status: 404 }
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // If Manager, verify user is in their department
    if (user.role.name === 'Manager' && targetUser.departmentId !== user.departmentId) {
      return NextResponse.json(
        { error: 'Forbidden: Can only create entries for your department' },
        { status: 403 }
      );
    }

    // Create manual entry
    const entry = await prisma.kPIManualEntry.create({
      data: {
        kpiId,
        userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        value,
        notes: notes || null,
        createdById: session.sub,
      },
      include: {
        kpiDefinition: {
          select: { id: true, code: true, name: true, unit: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating manual entry:', error);
    return NextResponse.json(
      { error: 'Failed to create manual entry' },
      { status: 500 }
    );
  }
}
