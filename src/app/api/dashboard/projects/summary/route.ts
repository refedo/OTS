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
    const canViewAllProjects = permissions?.projects?.viewAll || userRole === 'admin';

    // Build query based on permissions
    let projectQuery: any = {};
    
    if (!canViewAllProjects) {
      // User can only see projects they're assigned to or manage
      projectQuery = {
        OR: [
          { projectManagerId: userId },
          { salesEngineerId: userId },
          { assignments: { some: { userId } } },
        ],
      };
    }

    // Get total projects
    const totalProjects = await prisma.project.count({
      where: projectQuery,
    });

    // Get active projects (status = Active)
    const activeProjects = await prisma.project.count({
      where: {
        ...projectQuery,
        status: 'Active',
      },
    });

    // Get completed projects
    const completedProjects = await prisma.project.count({
      where: {
        ...projectQuery,
        status: 'Completed',
      },
    });

    // Get delayed projects (active projects past planned end date)
    const now = new Date();
    const delayedProjects = await prisma.project.count({
      where: {
        ...projectQuery,
        status: 'Active',
        plannedEndDate: {
          lt: now,
        },
      },
    });

    // Calculate weekly progress (production logs from last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyProductionLogs = await prisma.productionLog.findMany({
      where: {
        dateProcessed: {
          gte: sevenDaysAgo,
        },
        assemblyPart: {
          project: projectQuery,
        },
      },
      include: {
        assemblyPart: true,
      },
    });

    // Calculate total weight produced this week
    const weeklyWeightProduced = weeklyProductionLogs.reduce((sum, log) => {
      const weight = log.assemblyPart.singlePartWeight 
        ? Number(log.assemblyPart.singlePartWeight) * log.processedQty 
        : 0;
      return sum + weight;
    }, 0);

    // Get previous week for comparison
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousWeekLogs = await prisma.productionLog.findMany({
      where: {
        dateProcessed: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
        assemblyPart: {
          project: projectQuery,
        },
      },
      include: {
        assemblyPart: true,
      },
    });

    const previousWeekWeight = previousWeekLogs.reduce((sum, log) => {
      const weight = log.assemblyPart.singlePartWeight 
        ? Number(log.assemblyPart.singlePartWeight) * log.processedQty 
        : 0;
      return sum + weight;
    }, 0);

    // Calculate percentage change
    const weeklyProgress = previousWeekWeight > 0 
      ? ((weeklyWeightProduced - previousWeekWeight) / previousWeekWeight) * 100 
      : 0;

    return NextResponse.json({
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      delayed: delayedProjects,
      weeklyProgress: Math.round(weeklyProgress * 10) / 10, // Round to 1 decimal
      weeklyWeightProduced: Math.round(weeklyWeightProduced * 100) / 100,
    });

  } catch (error) {
    console.error('Error fetching project summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project summary' },
      { status: 500 }
    );
  }
}
