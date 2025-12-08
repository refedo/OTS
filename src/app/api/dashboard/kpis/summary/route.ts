import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
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

    const userId = session.sub;
    const userRole = session.role;

    // Fetch user with role permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        department: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse permissions
    const permissions = user.role.permissions as any;
    const canViewAllKPIs = permissions?.kpis?.viewAll || userRole === 'admin';

    // Get current period (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build query based on permissions
    let kpiQuery: any = {
      periodStart: {
        gte: thirtyDaysAgo,
      },
    };

    if (!canViewAllKPIs && user.departmentId) {
      // Filter by department if user doesn't have viewAll permission
      kpiQuery.entityType = 'department';
      kpiQuery.entityId = user.departmentId;
    }

    // Get all KPI scores for the period
    const kpiScores = await prisma.kPIScore.findMany({
      where: kpiQuery,
      include: {
        kpiDefinition: true,
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    // Categorize KPIs by status
    const redKPIs = kpiScores.filter(score => score.status === 'critical').length;
    const yellowKPIs = kpiScores.filter(score => score.status === 'warning').length;
    const greenKPIs = kpiScores.filter(score => score.status === 'ok').length;

    // Calculate company KPI score (weighted average)
    let totalWeight = 0;
    let weightedSum = 0;

    kpiScores.forEach(score => {
      const weight = score.kpiDefinition.weight || 1;
      const target = score.kpiDefinition.target || 100;
      const achievement = target > 0 ? (score.value / target) * 100 : 0;
      
      totalWeight += weight;
      weightedSum += achievement * weight;
    });

    const companyKPIScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // Get department scores if admin
    let departmentScores: any[] = [];
    if (canViewAllKPIs) {
      const departments = await prisma.department.findMany({
        select: {
          id: true,
          name: true,
        },
      });

      for (const dept of departments) {
        const deptScores = await prisma.kPIScore.findMany({
          where: {
            entityType: 'department',
            entityId: dept.id,
            periodStart: {
              gte: thirtyDaysAgo,
            },
          },
          include: {
            kpiDefinition: true,
          },
        });

        let deptWeight = 0;
        let deptWeightedSum = 0;

        deptScores.forEach(score => {
          const weight = score.kpiDefinition.weight || 1;
          const target = score.kpiDefinition.target || 100;
          const achievement = target > 0 ? (score.value / target) * 100 : 0;
          
          deptWeight += weight;
          deptWeightedSum += achievement * weight;
        });

        const deptScore = deptWeight > 0 ? Math.round(deptWeightedSum / deptWeight) : 0;

        departmentScores.push({
          departmentId: dept.id,
          departmentName: dept.name,
          score: deptScore,
          status: deptScore >= 80 ? 'ok' : deptScore >= 60 ? 'warning' : 'critical',
        });
      }
    }

    // Get top performing and underperforming KPIs
    const sortedKPIs = kpiScores
      .map(score => {
        const target = score.kpiDefinition.target || 100;
        const achievement = target > 0 ? (score.value / target) * 100 : 0;
        return {
          name: score.kpiDefinition.name,
          value: score.value,
          target,
          achievement: Math.round(achievement),
          status: score.status,
        };
      })
      .sort((a, b) => b.achievement - a.achievement);

    const topPerforming = sortedKPIs.slice(0, 5);
    const underperforming = sortedKPIs.slice(-5).reverse();

    return NextResponse.json({
      companyKPIScore,
      redKPIs,
      yellowKPIs,
      greenKPIs,
      totalKPIs: kpiScores.length,
      departmentScores: canViewAllKPIs ? departmentScores : [],
      topPerforming,
      underperforming,
    });

  } catch (error) {
    console.error('Error fetching KPI summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI summary' },
      { status: 500 }
    );
  }
}
