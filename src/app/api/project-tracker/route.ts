import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// Activity types that come from the tasks module
const TASK_BASED_ACTIVITIES = [
  'arch_approval', 'material_approval', 'design', 'design_approval',
  'anchor_bolts', 'surveying_as_built', 'detailing', 'detailing_approval',
];

// Map activity types to task mainActivity values
const ACTIVITY_TO_TASK_MAIN: Record<string, string> = {
  arch_approval: 'architectural',
  material_approval: 'material',
  design: 'design',
  design_approval: 'design',
  anchor_bolts: 'anchor_bolts',
  surveying_as_built: 'surveying',
  detailing: 'detailing',
  detailing_approval: 'detailing',
};

// Sub-activity mapping for submission vs approval
const ACTIVITY_TO_SUB: Record<string, string | null> = {
  arch_approval: null,
  material_approval: null,
  design: 'submission',
  design_approval: 'approval',
  anchor_bolts: null,
  surveying_as_built: null,
  detailing: 'submission',
  detailing_approval: 'approval',
};

// Production log process types
const PRODUCTION_ACTIVITIES: Record<string, string[]> = {
  production: ['Preparation', 'Fit-up', 'Welding'],
  coating: ['Sandblasting', 'Painting', 'Galvanization'],
  dispatch: ['Dispatch'],
  erection: ['Erection'],
};

// LCR statuses grouped by procurement stage
const PROCUREMENT_STATUSES: Record<string, string[]> = {
  under_request: ['Under Request', 'under request', 'Pending', 'pending'],
  bought: ['Bought', 'bought', 'Ordered', 'ordered', 'PO Issued', 'po issued'],
  available: ['Available at Factory', 'available at factory', 'Received', 'received', 'Available', 'available'],
};

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
  const subActivity = ACTIVITY_TO_SUB[activityType];

  const where: Record<string, unknown> = {
    projectId,
    buildingId,
    mainActivity,
  };
  if (subActivity) where.subActivity = subActivity;

  const tasks = await prisma.task.findMany({
    where,
    select: {
      status: true,
      releaseDate: true,
      approvedAt: true,
      completedAt: true,
    },
  });

  if (tasks.length === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // For approval-type activities, check if task is approved
  const isApprovalType = activityType.endsWith('_approval') || ['arch_approval', 'material_approval'].includes(activityType);

  if (isApprovalType) {
    const approved = tasks.filter((t) => t.approvedAt !== null);
    const submitted = tasks.filter((t) => t.releaseDate !== null || t.completedAt !== null);

    if (approved.length === tasks.length) {
      return { percentage: 100, status: 'completed' };
    }
    if (submitted.length > 0) {
      // Submitted but not all approved yet
      const pct = Math.round((approved.length / tasks.length) * 100);
      return { percentage: Math.max(pct, 50), status: 'in_progress' };
    }
    return { percentage: 0, status: 'not_started' };
  }

  // For submission-type activities
  const completed = tasks.filter(
    (t) => t.releaseDate !== null || t.completedAt !== null || t.status === 'Completed'
  );

  if (completed.length === tasks.length) {
    return { percentage: 100, status: 'completed' };
  }
  if (completed.length > 0) {
    return {
      percentage: Math.round((completed.length / tasks.length) * 100),
      status: 'in_progress',
    };
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

  let availableWeight = 0;
  let boughtWeight = 0;
  let underRequestWeight = 0;
  let totalWeight = 0;

  for (const entry of entries) {
    const w = Number(entry.totalWeight || entry.weight || 0);
    totalWeight += w;

    const status = (entry.status || '').toLowerCase();
    if (PROCUREMENT_STATUSES.available.some((s) => status.includes(s.toLowerCase()))) {
      availableWeight += w;
    } else if (PROCUREMENT_STATUSES.bought.some((s) => status.includes(s.toLowerCase()))) {
      boughtWeight += w;
    } else if (PROCUREMENT_STATUSES.under_request.some((s) => status.includes(s.toLowerCase()))) {
      underRequestWeight += w;
    }
  }

  if (totalWeight === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Weight-based: available = 100%, bought = 66%, under request = 33%
  const weightedProgress =
    (availableWeight * 100 + boughtWeight * 66 + underRequestWeight * 33) / totalWeight;
  const pct = Math.round(weightedProgress);

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

  // Get total assembly parts for this project/building
  const totalParts = await prisma.assemblyPart.aggregate({
    where: {
      projectId,
      buildingId,
      deletedAt: null,
    },
    _sum: { quantity: true },
  });

  const totalQty = totalParts._sum.quantity || 0;
  if (totalQty === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Get production logs for the relevant process types
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
      processedQty: true,
    },
  });

  const processedQty = logs.reduce((sum, l) => sum + l.processedQty, 0);
  const pct = Math.round((processedQty / totalQty) * 100);

  if (pct >= 100) return { percentage: 100, status: 'completed' };
  if (pct > 0) return { percentage: Math.min(pct, 99), status: 'in_progress' };
  return { percentage: 0, status: 'not_started' };
}
