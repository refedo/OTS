import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// GET /api/kpi/dashboard - Get dashboard data
export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || 'company';
    const entityId = searchParams.get('entityId');

    // Get user for RBAC
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { role: true, department: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine what data user can access
    let allowedEntityType = entityType;
    let allowedEntityId = entityId;

    if (user.role.name === 'Employee') {
      // Employees can only see their own dashboard
      allowedEntityType = 'user';
      allowedEntityId = session.sub;
    } else if (user.role.name === 'Manager') {
      // Managers can see department or their own
      if (entityType === 'company') {
        allowedEntityType = 'department';
        allowedEntityId = user.departmentId;
      }
    }
    // Admin and HR can see all

    // Get latest scores for the entity
    const scores = await prisma.kPIScore.findMany({
      where: {
        entityType: allowedEntityType,
        entityId: allowedEntityId,
      },
      include: {
        kpiDefinition: true,
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['kpiId'],
    });

    // Get active alerts
    const alerts = await prisma.kPIAlert.findMany({
      where: {
        entityType: allowedEntityType,
        entityId: allowedEntityId || undefined,
        acknowledgedBy: null,
      },
      include: {
        kpiDefinition: {
          select: { code: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Calculate summary statistics
    const summary = {
      totalKPIs: scores.length,
      okCount: scores.filter(s => s.status === 'ok').length,
      warningCount: scores.filter(s => s.status === 'warning').length,
      criticalCount: scores.filter(s => s.status === 'critical').length,
      activeAlerts: alerts.length,
    };

    // Get historical trend (last 6 periods)
    const trendData = await prisma.kPIScore.findMany({
      where: {
        entityType: allowedEntityType,
        entityId: allowedEntityId,
      },
      include: {
        kpiDefinition: {
          select: { code: true, name: true, unit: true },
        },
      },
      orderBy: { periodStart: 'desc' },
      take: 60, // Assuming ~10 KPIs * 6 periods
    });

    return NextResponse.json({
      summary,
      scores,
      alerts,
      trendData,
      entityType: allowedEntityType,
      entityId: allowedEntityId,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
