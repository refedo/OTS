import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// GET /api/kpi/alerts - List alerts
export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const acknowledged = searchParams.get('acknowledged');
    const level = searchParams.get('level');
    const entityType = searchParams.get('entityType');

    const whereClause: any = {};
    
    if (acknowledged !== null) {
      if (acknowledged === 'false') {
        whereClause.acknowledgedBy = null;
      } else {
        whereClause.acknowledgedBy = { not: null };
      }
    }
    
    if (level) {
      whereClause.level = level;
    }
    
    if (entityType) {
      whereClause.entityType = entityType;
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
      // Employees can only see their own alerts
      whereClause.entityType = 'user';
      whereClause.entityId = session.sub;
    } else if (user.role.name === 'Manager') {
      // Managers can see department alerts
      whereClause.OR = [
        { entityType: 'department', entityId: user.departmentId },
        { entityType: 'user', entityId: session.sub },
      ];
    }
    // Admin and HR can see all

    const alerts = await prisma.kPIAlert.findMany({
      where: whereClause,
      include: {
        kpiDefinition: {
          select: { id: true, code: true, name: true, unit: true },
        },
        acknowledger: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { level: 'desc' }, // Critical first
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
