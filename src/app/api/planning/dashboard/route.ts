import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// GET /api/planning/dashboard - Get planning dashboard summary
export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all projects with their plans
    const projects = await prisma.project.findMany({
      where: {
        status: {
          in: ['Active', 'Draft'],
        },
      },
      include: {
        projectPlans: {
          select: {
            id: true,
            phase: true,
            status: true,
            progress: true,
            plannedStart: true,
            plannedEnd: true,
            actualStart: true,
            actualEnd: true,
          },
        },
        projectManager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalProjects = projects.length;
    const projectsWithPlans = projects.filter(
      (p) => p.projectPlans.length > 0
    ).length;

    // Get all phases across all projects
    const allPhases = projects.flatMap((p) => p.projectPlans);
    const totalPhases = allPhases.length;
    const completedPhases = allPhases.filter(
      (p) => p.status === 'Completed'
    ).length;
    const inProgressPhases = allPhases.filter(
      (p) => p.status === 'In Progress'
    ).length;
    const delayedPhases = allPhases.filter((p) => p.status === 'Delayed').length;
    const notStartedPhases = allPhases.filter(
      (p) => p.status === 'Not Started'
    ).length;

    // Calculate average progress
    const avgProgress =
      totalPhases > 0
        ? allPhases.reduce((sum, p) => sum + p.progress, 0) / totalPhases
        : 0;

    // Get phase breakdown by type
    const phaseBreakdown = allPhases.reduce((acc, phase) => {
      acc[phase.phase] = (acc[phase.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get projects by status
    const projectsByStatus = projects.reduce((acc, project) => {
      const hasDelayed = project.projectPlans.some((p) => p.status === 'Delayed');
      const allCompleted =
        project.projectPlans.length > 0 &&
        project.projectPlans.every((p) => p.status === 'Completed');
      const hasInProgress = project.projectPlans.some(
        (p) => p.status === 'In Progress'
      );

      if (allCompleted) {
        acc.completed++;
      } else if (hasDelayed) {
        acc.delayed++;
      } else if (hasInProgress) {
        acc.inProgress++;
      } else {
        acc.notStarted++;
      }

      return acc;
    }, { completed: 0, delayed: 0, inProgress: 0, notStarted: 0 });

    // Get recent updates
    const recentUpdates = await prisma.projectPlan.findMany({
      take: 10,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        project: {
          select: {
            projectNumber: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      summary: {
        totalProjects,
        projectsWithPlans,
        totalPhases,
        completedPhases,
        inProgressPhases,
        delayedPhases,
        notStartedPhases,
        avgProgress: Math.round(avgProgress * 10) / 10,
        completionRate:
          totalPhases > 0
            ? Math.round((completedPhases / totalPhases) * 100)
            : 0,
      },
      phaseBreakdown,
      projectsByStatus,
      recentUpdates,
      projects: projects.map((p) => ({
        id: p.id,
        projectNumber: p.projectNumber,
        name: p.name,
        status: p.status,
        projectManager: p.projectManager,
        totalPhases: p.projectPlans.length,
        completedPhases: p.projectPlans.filter((ph) => ph.status === 'Completed')
          .length,
        delayedPhases: p.projectPlans.filter((ph) => ph.status === 'Delayed')
          .length,
        avgProgress:
          p.projectPlans.length > 0
            ? Math.round(
                (p.projectPlans.reduce((sum, ph) => sum + ph.progress, 0) /
                  p.projectPlans.length) *
                  10
              ) / 10
            : 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching planning dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning dashboard' },
      { status: 500 }
    );
  }
}
