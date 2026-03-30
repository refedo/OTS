import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// The 10 fixed activity columns displayed in the tracker
const TRACKER_COLUMNS = [
  { type: 'arch_approval', label: 'Arch Drawing' },
  { type: 'design', label: 'Design Stage' },
  { type: 'design_approval', label: 'Design Approval' },
  { type: 'detailing', label: 'Shop Drawings' },
  { type: 'detailing_approval', label: 'SD Approval' },
  { type: 'procurement', label: 'Procurement' },
  { type: 'production', label: 'Production' },
  { type: 'coating', label: 'Coating' },
  { type: 'dispatch', label: 'Dispatch' },
  { type: 'erection', label: 'Erection' },
] as const;

// Map tracker activity types → Task.mainActivity (keys from activity-constants.ts)
const ACTIVITY_TO_TASK_MAIN: Record<string, string> = {
  arch_approval: 'architecture',
  design: 'design',
  design_approval: 'design',
  detailing: 'detailing',
  detailing_approval: 'detailing',
};

// Activities where we check approvedAt (approval-led)
const APPROVAL_ACTIVITIES = new Set(['arch_approval', 'design_approval', 'detailing_approval']);

// Activities where we check completedAt + releaseDate (completion-led)
const COMPLETION_ACTIVITIES = new Set(['design', 'detailing']);

// Production log process types
const PRODUCTION_PROCESS_TYPES: Record<string, string[]> = {
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
const LCR_BOUGHT_STATUSES = ['bought', 'ordered', 'po issued'];

export const GET = withApiContext(async (req, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const statusFilter = searchParams.get('status');

    const projectWhere: Record<string, unknown> = {
      deletedAt: null,
      status: { not: 'Draft' },
    };
    if (projectId) projectWhere.id = projectId;

    // Simple query: just projects + buildings, no ScopeOfWork dependency
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
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { projectNumber: 'asc' },
    });

    // For each project/building, compute all 10 activity columns directly
    const trackerData = await Promise.all(
      projects.map(async (project) => {
        const buildingsData = await Promise.all(
          project.buildings.map(async (building) => {
            // Compute all 10 activities for this building
            const activities = await Promise.all(
              TRACKER_COLUMNS.map(async (col) => {
                const progress = await computeActivityProgress(
                  project.id,
                  building.id,
                  col.type
                );
                return {
                  id: `${building.id}-${col.type}`,
                  activityType: col.type,
                  activityLabel: col.label,
                  ...progress,
                };
              })
            );

            // Overall = average of all 10 columns
            const totalProgress = Math.round(
              activities.reduce((sum, a) => sum + a.percentage, 0) / activities.length
            );

            const currentStage = activities.find(
              (a) => a.percentage > 0 && a.percentage < 100
            );

            return {
              id: building.id,
              name: building.name,
              designation: building.designation,
              weight: building.weight,
              scopes: [{
                id: `${building.id}-default`,
                scopeType: 'steel',
                scopeLabel: 'Steel',
                activities,
              }],
              overallProgress: totalProgress,
              currentStage: currentStage
                ? { label: currentStage.activityLabel, index: activities.indexOf(currentStage) + 1 }
                : null,
            };
          })
        );

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

// --- Progress computation ---

async function computeActivityProgress(
  projectId: string,
  buildingId: string,
  activityType: string
): Promise<{ percentage: number; status: 'not_started' | 'in_progress' | 'completed' }> {
  try {
    // Task-based: arch_approval, design, design_approval, detailing, detailing_approval
    if (ACTIVITY_TO_TASK_MAIN[activityType]) {
      return await computeTaskProgress(projectId, buildingId, activityType);
    }

    // Procurement from LCR
    if (activityType === 'procurement') {
      return await computeProcurementProgress(projectId, buildingId);
    }

    // Production-based: production, coating, dispatch, erection
    if (PRODUCTION_PROCESS_TYPES[activityType]) {
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

  // Group by subActivity, pick latest revision (most recent createdAt) per group
  const bySubActivity = new Map<string, (typeof tasks)[number]>();
  for (const t of tasks) {
    const key = t.subActivity || '__none__';
    if (!bySubActivity.has(key)) {
      bySubActivity.set(key, t); // already sorted desc, first = latest
    }
  }
  const latestTasks = Array.from(bySubActivity.values());

  // Approval-led: arch_approval, design_approval, detailing_approval
  if (APPROVAL_ACTIVITIES.has(activityType)) {
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

  // Completion-led: design, detailing — check completedAt + releaseDate on latest revision
  if (COMPLETION_ACTIVITIES.has(activityType)) {
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
  const processTypes = PRODUCTION_PROCESS_TYPES[activityType] || [];

  // Total weight of all assembly parts for this building
  const totalWeightResult = await prisma.assemblyPart.aggregate({
    where: { projectId, buildingId, deletedAt: null },
    _sum: { netWeightTotal: true },
  });

  const totalWeight = Number(totalWeightResult._sum.netWeightTotal || 0);
  if (totalWeight === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Production logs with assembly part weight info
  const logs = await prisma.productionLog.findMany({
    where: {
      assemblyPart: { projectId, buildingId, deletedAt: null },
      processType: { in: processTypes },
    },
    select: {
      processType: true,
      processedQty: true,
      assemblyPart: {
        select: { singlePartWeight: true },
      },
    },
  });

  if (logs.length === 0) {
    return { percentage: 0, status: 'not_started' };
  }

  // Sum processed weight per process type
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
