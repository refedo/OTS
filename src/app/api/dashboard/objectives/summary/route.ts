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
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse permissions
    const permissions = user.role.permissions as any;
    const canViewAllObjectives = permissions?.objectives?.viewAll || userRole === 'admin';

    // Get current year
    const currentYear = new Date().getFullYear();

    // Build query based on permissions
    let objectiveQuery: any = {
      year: currentYear,
    };

    if (!canViewAllObjectives) {
      // User can only see objectives they own
      objectiveQuery.ownerId = userId;
    }

    // Get total objectives
    const totalObjectives = await prisma.companyObjective.count({
      where: objectiveQuery,
    });

    // Get objectives by status
    const achievedObjectives = await prisma.companyObjective.count({
      where: {
        ...objectiveQuery,
        status: 'Completed',
      },
    });

    const inProgressObjectives = await prisma.companyObjective.count({
      where: {
        ...objectiveQuery,
        status: 'On Track',
      },
    });

    const behindScheduleObjectives = await prisma.companyObjective.count({
      where: {
        ...objectiveQuery,
        status: {
          in: ['At Risk', 'Behind'],
        },
      },
    });

    const notStartedObjectives = await prisma.companyObjective.count({
      where: {
        ...objectiveQuery,
        status: 'Not Started',
      },
    });

    // Get objectives by category
    const objectivesByCategory = await prisma.companyObjective.groupBy({
      by: ['category'],
      where: objectiveQuery,
      _count: true,
    });

    // Get average progress
    const objectives = await prisma.companyObjective.findMany({
      where: objectiveQuery,
      select: {
        progress: true,
      },
    });

    const averageProgress = objectives.length > 0
      ? Math.round(objectives.reduce((sum, obj) => sum + obj.progress, 0) / objectives.length)
      : 0;

    // Get key results summary
    const keyResults = await prisma.keyResult.findMany({
      where: {
        objective: objectiveQuery,
      },
    });

    const totalKeyResults = keyResults.length;
    const completedKeyResults = keyResults.filter(kr => kr.status === 'Completed').length;
    const onTrackKeyResults = keyResults.filter(kr => kr.status === 'On Track').length;
    const atRiskKeyResults = keyResults.filter(kr => kr.status === 'At Risk' || kr.status === 'Behind').length;

    // Get recent objectives (last 5)
    const recentObjectives = await prisma.companyObjective.findMany({
      where: objectiveQuery,
      include: {
        owner: {
          select: {
            name: true,
          },
        },
        keyResults: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
    });

    return NextResponse.json({
      total: totalObjectives,
      achieved: achievedObjectives,
      inProgress: inProgressObjectives,
      behindSchedule: behindScheduleObjectives,
      notStarted: notStartedObjectives,
      averageProgress,
      byCategory: objectivesByCategory.map(cat => ({
        category: cat.category,
        count: cat._count,
      })),
      keyResults: {
        total: totalKeyResults,
        completed: completedKeyResults,
        onTrack: onTrackKeyResults,
        atRisk: atRiskKeyResults,
      },
      recent: recentObjectives.map(obj => ({
        id: obj.id,
        title: obj.title,
        category: obj.category,
        status: obj.status,
        progress: obj.progress,
        owner: obj.owner.name,
        keyResultsCount: obj.keyResults.length,
      })),
    });

  } catch (error) {
    console.error('Error fetching objectives summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch objectives summary' },
      { status: 500 }
    );
  }
}
