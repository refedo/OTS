import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// Activity types resolved from the Tasks module
const TASK_BASED_ACTIVITIES = [
  'arch_approval', 'design', 'design_approval', 'detailing', 'detailing_approval',
];

// Map tracker activity types → Task.mainActivity (keys from activity-constants.ts)
const ACTIVITY_TO_TASK_MAIN: Record<string, string> = {
  arch_approval: 'architecture',
  design: 'design',
  design_approval: 'design',
  detailing: 'detailing',
  detailing_approval: 'detailing',
};

// Activities where we check approvedAt (approval-led)
const APPROVAL_ACTIVITIES = ['arch_approval', 'design_approval', 'detailing_approval'];

// Activities where we check completedAt + releaseDate (completion-led)
const COMPLETION_ACTIVITIES = ['design', 'detailing'];

// Production log process types
const PRODUCTION_ACTIVITIES: Record<string, string[]> = {
  production: ['Fit-up', 'Welding', 'Visualization'],
  coating: ['Sandblasting', 'Painting', 'Galvanization'],
  dispatch: ['Dispatch'],
  erection: ['Erection'],
};

// LCR statuses that count towards procurement total
const LCR_ACTIVE_STATUSES = [
  'bought', 'under request', 'available at factory',
  'pending', 'ordered', 'po issued', 'received', 'available',
];

// LCR statuses that count as "bought"
const LCR_BOUGHT_STATUSES = [
  'bought', 'ordered', 'po issued',
];

export const GET = withApiContext(async (req, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const statusFilter = searchParams.get('status'); // all, in_progress, blocked, completed

    // Fetch all active projects with buildings, scopes, and activities
    const projectWhere: Record<string, unknown> = {
      deletedAt: null,
      status: { not: 'Draft' },
    };
    if (projectId) projectWhere.id = projectId;

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        contractualTonnage: true,
        buildings: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            designation: true,
            weight: true,
            scopeOfWorks: {
              select: {
                id: true,
                scopeType: true,
                scopeLabel: true,
                customLabel: true,
                activities: {
                  where: { isApplicable: true },
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    activityType: true,
                    activityLabel: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { projectNumber: 'asc' },
    });

    // For each project, compute activity progress
    const trackerData = await Promise.all(
      projects.map(async (project) => {
        const buildingsData = await Promise.all(
          project.buildings.map(async (building) => {
            const scopesData = await Promise.all(
              building.scopeOfWorks.map(async (scope) => {
                const activitiesData = await Promise.all(
                  scope.activities.map(async (activity) => {
                    const progress = await computeActivityProgress(
                      project.id,
                      building.id,
                      scope.id,
                      scope.scopeType,
                      activity.activityType
                    );
                    return {
                      ...activity,
                      ...progress,
                    };
                  })
                );

                return {
                  id: scope.id,
                  scopeType: scope.scopeType,
                  scopeLabel: scope.customLabel || scope.scopeLabel,
                  activities: activitiesData,
                };
              })
            );

            // Calculate overall building progress
            const allActivities = scopesData.flatMap((s) => s.activities);
            const totalProgress =
              allActivities.length > 0
                ? Math.round(allActivities.reduce((sum, a) => sum + a.percentage, 0) / allActivities.length)
                : 0;

            // Determine current stage
            const currentStage = allActivities.find(
              (a) => a.percentage > 0 && a.percentage < 100
            );

            return {
              id: building.id,
              name: building.name,
              designation: building.designation,
              weight: building.weight,
              scopes: scopesData,
              overallProgress: totalProgress,
              currentStage: currentStage
                ? { label: currentStage.activityLabel, index: allActivities.indexOf(currentStage) + 1 }
                : null,
            };
          })
        );

        // Calculate project overall progress
        const allBuildingProgress = buildingsData.map((b) => b.overallProgress);
        const projectProgress =
          allBuildingProgress.length > 0
            ? Math.round(allBuildingProgress.reduce((a, b) => a + b, 0) / allBuildingProgress.length)
            : 0;

        return {
          id: project.id,
          projectNumber: project.projectNumber,
          name: project.name,
          status: project.status,
          contractualTonnage: project.contractualTonnage,
          buildings: buildingsData,
          overallProgress: projectProgress,
        };
      })
    );

    // Apply status filter
    let filtered = trackerData;
    if (statusFilter === 'in_progress') {
      filtered = trackerData.filter((p) => p.overallProgress > 0 && p.overallProgress < 100);
    } else if (statusFilter === 'completed') {
      filtered = trackerData.filter((p) => p.overallProgress === 100);
    } else if (statusFilter === 'blocked') {
      filtered = trackerData.filter((p) => p.status === 'On Hold');
    }

    // Summary stats
    const stats = {
      activeProjects: trackerData.filter((p) => p.status === 'Active').length,
      totalBuildings: trackerData.reduce((sum, p) => sum + p.buildings.length, 0),
      inProgress: trackerData.filter((p) => p.overallProgress > 0 && p.overallProgress < 100).length,
      completed: trackerData.filter((p) => p.overallProgress === 100).length,
      blocked: trackerData.filter((p) => p.status === 'On Hold').length,
    };

    return NextResponse.json({ stats, projects: filtered });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch project tracker data');
    return NextResponse.json({ error: 'Failed to fetch project tracker data' }, { status: 500 });
  }
});

async function computeActivityProgress(
  projectId: string,
  buildingId: string,
  scopeOfWorkId: string,
  scopeType: string,
  activityType: string
): Promise<{ percentage: number; status: 'not_started' | 'in_progress' | 'completed' }> {
  try {
    // Task-based activities
    if (TASK_BASED_ACTIVITIES.includes(activityType)) {
      return await computeTaskProgress(projectId, buildingId, activityType);
    }

    // Procurement from LCR
    if (activityType === 'procurement') {
      return await computeProcurementProgress(projectId, buildingId);
    }

    // Production-based activities
    if (['production', 'coating', 'dispatch', 'erection'].includes(activityType)) {
      return await computeProductionProgress(projectId, buildingId, activityType);
    }

    return { percentage: 0, status: 'not_started' };
  } catch (error) {
    logger.error({ error, projectId, buildingId, activityType }, 'Error computing activity progress');
    return { percentage: 0, status: 'not_started' };
  }
}

async function computeTaskProgress(
  projectId: string,
  buildingId: string,
  activityType: string
): Promise<{ percentage: number; status: 'not_started' | 'in_progress' | 'completed' }> {
  const mainActivity = ACTIVITY_TO_TASK_MAIN[activityType];

  // Match tasks for this building OR tasks with no building set (project-level)
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      OR: [{ buildingId }, { buildingId: null }],
      mainActivity,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      revision: true,
      releaseDate: true,
      approvedAt: true,
      completedAt: true,
      subActivity: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (tasks.length === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Group tasks by subActivity to find the latest revision per sub-activity
  const bySubActivity = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = t.subActivity || '__none__';
    if (!bySubActivity.has(key)) bySubActivity.set(key, []);
    bySubActivity.get(key)!.push(t);
  }

  // For each sub-activity group, pick the latest task (latest revision = latest createdAt)
  const latestTasks = Array.from(bySubActivity.values()).map((group) => group[0]);

  // Approval-led activities (arch_approval, design_approval, detailing_approval)
  if (APPROVAL_ACTIVITIES.includes(activityType)) {
    const approved = latestTasks.filter((t) => t.approvedAt !== null);
    const submitted = latestTasks.filter((t) => t.completedAt !== null || t.releaseDate !== null);

    if (approved.length === latestTasks.length) {
      return { percentage: 100, status: 'completed' };
    }
    if (submitted.length > 0 || approved.length > 0) {
      const pct = Math.round((approved.length / latestTasks.length) * 100);
      return { percentage: Math.max(pct, 50), status: 'in_progress' };
    }
    return { percentage: 0, status: 'not_started' };
  }

  // Completion-led activities (design, detailing) — check completedAt + releaseDate
  if (COMPLETION_ACTIVITIES.includes(activityType)) {
    const completed = latestTasks.filter(
      (t) => (t.completedAt !== null || t.status === 'Completed') && t.releaseDate !== null
    );
    const partiallyDone = latestTasks.filter(
      (t) => t.completedAt !== null || t.releaseDate !== null || t.status === 'Completed'
    );

    if (completed.length === latestTasks.length) {
      return { percentage: 100, status: 'completed' };
    }
    if (partiallyDone.length > 0) {
      const pct = Math.round((completed.length / latestTasks.length) * 100);
      return { percentage: Math.max(pct, 25), status: 'in_progress' };
    }
    return { percentage: 0, status: 'not_started' };
  }

  return { percentage: 0, status: 'not_started' };
}

async function computeProcurementProgress(
  projectId: string,
  buildingId: string
): Promise<{ percentage: number; status: 'not_started' | 'in_progress' | 'completed' }> {
  const entries = await prisma.lcrEntry.findMany({
    where: {
      projectId,
      buildingId,
      isDeleted: false,
    },
    select: {
      status: true,
      totalWeight: true,
      weight: true,
    },
  });

  if (entries.length === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Only count entries with active procurement statuses
  let boughtWeight = 0;
  let totalActiveWeight = 0;

  for (const entry of entries) {
    const status = (entry.status || '').toLowerCase().trim();
    const isActive = LCR_ACTIVE_STATUSES.some((s) => status.includes(s));
    if (!isActive) continue;

    const w = Number(entry.totalWeight || entry.weight || 0);
    totalActiveWeight += w;

    const isBought = LCR_BOUGHT_STATUSES.some((s) => status.includes(s));
    if (isBought) {
      boughtWeight += w;
    }
  }

  if (totalActiveWeight === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Bought weight / total weight of all active LCR items
  const pct = Math.round((boughtWeight / totalActiveWeight) * 100);

  if (pct >= 100) return { percentage: 100, status: 'completed' };
  if (pct > 0) return { percentage: pct, status: 'in_progress' };
  return { percentage: 0, status: 'not_started' };
}

async function computeProductionProgress(
  projectId: string,
  buildingId: string,
  activityType: string
): Promise<{ percentage: number; status: 'not_started' | 'in_progress' | 'completed' }> {
  const processTypes = PRODUCTION_ACTIVITIES[activityType] || [];

  // Get total weight of all assembly parts for this building
  const totalWeightResult = await prisma.assemblyPart.aggregate({
    where: {
      projectId,
      buildingId,
      deletedAt: null,
    },
    _sum: { netWeightTotal: true },
  });

  const totalWeight = Number(totalWeightResult._sum.netWeightTotal || 0);
  if (totalWeight === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Get production logs with their assembly part weights
  const logs = await prisma.productionLog.findMany({
    where: {
      assemblyPart: {
        projectId,
        buildingId,
        deletedAt: null,
      },
      processType: { in: processTypes },
    },
    select: {
      processType: true,
      processedQty: true,
      assemblyPart: {
        select: {
          singlePartWeight: true,
          quantity: true,
        },
      },
    },
  });

  if (logs.length === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Calculate processed weight per process type
  const weightByProcess = new Map<string, number>();
  for (const pt of processTypes) {
    weightByProcess.set(pt, 0);
  }

  for (const log of logs) {
    const partWeight = Number(log.assemblyPart.singlePartWeight || 0);
    const processedWeight = log.processedQty * partWeight;
    const current = weightByProcess.get(log.processType) || 0;
    weightByProcess.set(log.processType, current + processedWeight);
  }

  // Average percentage across all process types
  let totalPct = 0;
  for (const pt of processTypes) {
    const processedWeight = weightByProcess.get(pt) || 0;
    totalPct += (processedWeight / totalWeight) * 100;
  }
  const pct = Math.round(totalPct / processTypes.length);

  if (pct >= 100) return { percentage: 100, status: 'completed' };
  if (pct > 0) return { percentage: pct, status: 'in_progress' };
  return { percentage: 0, status: 'not_started' };
}
