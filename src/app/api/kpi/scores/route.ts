import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// GET /api/kpi/scores - Get KPI scores with filters
export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('kpiId');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const status = searchParams.get('status');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    const whereClause: any = {};
    
    if (kpiId) {
      whereClause.kpiId = kpiId;
    }
    
    if (entityType) {
      whereClause.entityType = entityType;
    }
    
    if (entityId) {
      whereClause.entityId = entityId;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (periodStart && periodEnd) {
      whereClause.periodStart = { gte: new Date(periodStart) };
      whereClause.periodEnd = { lte: new Date(periodEnd) };
    }

    // Check user permissions
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true, department: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Apply RBAC filters
    if (user.role.name === 'Employee') {
      // Employees can only see their own scores
      whereClause.entityType = 'user';
      whereClause.entityId = session.sub;
    } else if (user.role.name === 'Manager') {
      // Managers can see department and their team scores
      if (!entityType || entityType === 'department') {
        whereClause.OR = [
          { entityType: 'department', entityId: user.departmentId },
          { entityType: 'user', entityId: session.sub },
        ];
      }
    }
    // Admin and HR can see all scores

    const scores = await prisma.kPIScore.findMany({
      where: whereClause,
      include: {
        kpiDefinition: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            target: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit results
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching KPI scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI scores' },
      { status: 500 }
    );
  }
}
