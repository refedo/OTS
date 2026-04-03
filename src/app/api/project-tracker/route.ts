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
  dispatch: ['Dispatched to Customer'],
  erection: ['Erection'],
};

// LCR statuses that count towards procurement total
const LCR_ACTIVE_STATUSES = [
  'bought', 'under request', 'available at factory',
  'pending', 'ordered', 'po issued', 'received', 'available',
];

// LCR statuses that count as "bought"
const LCR_BOUGHT_STATUSES = ['bought', 'ordered', 'po issued'];

type ActivityStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'pending_approval';

interface TaskDetail {
  id: string;
  title: string;
  subActivity: string | null;
  revision: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  consultantResponseCode: string | null;
  assignedTo: string | null;
  isOverdue: boolean;
}

interface ProcurementDetail {
  totalEntries: number;
  totalWeight: number;
  boughtWeight: number;
  underRequestWeight: number;
  availableWeight: number;
}

interface ProductionDetail {
  totalWeight: number;
  dispatchedWeight: number;
  processes: { name: string; processedWeight: number; percentage: number }[];
}

interface ActivityResult {
  percentage: number;
  status: ActivityStatus;
  details: {
    tasks?: TaskDetail[];
    procurement?: ProcurementDetail;
    production?: ProductionDetail;
  };
}

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

    const trackerData = await Promise.all(
      projects.map(async (project) => {
        const buildingsData = await Promise.all(
          project.buildings.map(async (building) => {
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

            const totalProgress = Math.round(
              activities.reduce((sum, a) => sum + a.percentage, 0) / activities.length
            );

            const currentStage = activities.find(
              (a) => a.percentage > 0 && a.percentage < 100
            );

            const hasBlocked = activities.some((a) => a.status === 'blocked');

            // Sum assembly tonnage via raw SQL to avoid Prisma Decimal conversion issues
            const [tonnageResult] = await prisma.$queryRaw<[{totalKg: number | null}]>`
              SELECT COALESCE(SUM(
                CASE
                  WHEN netWeightTotal > 0 THEN netWeightTotal
                  ELSE COALESCE(singlePartWeight, 0) * COALESCE(quantity, 1)
                END
              ), 0) as totalKg
              FROM AssemblyPart
              WHERE buildingId = ${building.id} AND deletedAt IS NULL
            `;
            let rawTotalKg = Number(tonnageResult?.totalKg ?? 0);

            // Fallback: project-level parts with no building assigned
            if (rawTotalKg === 0) {
              const [unboundResult] = await prisma.$queryRaw<[{totalKg: number | null}]>`
                SELECT COALESCE(SUM(
                  CASE
                    WHEN netWeightTotal > 0 THEN netWeightTotal
                    ELSE COALESCE(singlePartWeight, 0) * COALESCE(quantity, 1)
                  END
                ), 0) as totalKg
                FROM AssemblyPart
                WHERE projectId = ${project.id} AND buildingId IS NULL AND deletedAt IS NULL
              `;
              rawTotalKg = Number(unboundResult?.totalKg ?? 0) / (project.buildings.length || 1);
            }

            // Final fallback: building.weight (already in tons)
            const assemblyTonnage = rawTotalKg > 0 ? rawTotalKg / 1000 : Number(building.weight ?? 0);

            return {
              id: building.id,
              name: building.name,
              designation: building.designation,
              weight: building.weight,
              assemblyTonnage,
              scopes: [{
                id: `${building.id}-default`,
                scopeType: 'steel',
                scopeLabel: 'Steel',
                activities,
              }],
              overallProgress: totalProgress,
              hasBlocked,
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

    let filtered = trackerData;
    if (statusFilter === 'in_progress') {
      filtered = trackerData.filter((p) => p.overallProgress > 0 && p.overallProgress < 100);
    } else if (statusFilter === 'completed') {
      filtered = trackerData.filter((p) => p.overallProgress === 100);
    } else if (statusFilter === 'blocked') {
      filtered = trackerData.filter(
        (p) => p.status === 'On Hold' || p.buildings.some((b) => b.hasBlocked)
      );
    }

    // Count buildings, not projects, for in-progress/completed/blocked
    const allBuildings = trackerData.flatMap((p) => p.buildings);
    const stats = {
      activeProjects: trackerData.filter((p) => p.status === 'Active').length,
      totalBuildings: allBuildings.length,
      inProgress: allBuildings.filter((b) => b.overallProgress > 0 && b.overallProgress < 100).length,
      completed: allBuildings.filter((b) => b.overallProgress === 100).length,
      blocked: allBuildings.filter((b) => b.hasBlocked).length,
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
): Promise<ActivityResult> {
  try {
    if (ACTIVITY_TO_TASK_MAIN[activityType]) {
      return await computeTaskProgress(projectId, buildingId, activityType);
    }
    if (activityType === 'procurement') {
      return await computeProcurementProgress(projectId, buildingId);
    }
    if (PRODUCTION_PROCESS_TYPES[activityType]) {
      return await computeProductionProgress(projectId, buildingId, activityType);
    }
    return { percentage: 0, status: 'not_started', details: {} };
  } catch (error) {
    logger.error({ error, projectId, buildingId, activityType }, 'Error computing activity progress');
    return { percentage: 0, status: 'not_started', details: {} };
  }
}

async function computeTaskProgress(
  projectId: string,
  buildingId: string,
  activityType: string
): Promise<ActivityResult> {
  const mainActivity = ACTIVITY_TO_TASK_MAIN[activityType];
  const now = new Date();
  const isApprovalLed = APPROVAL_ACTIVITIES.has(activityType);

  // NOTE: Task model has no deletedAt — do not add that filter
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      OR: [{ buildingId }, { buildingId: null }],
      mainActivity,
    },
    select: {
      id: true,
      title: true,
      status: true,
      revision: true,
      dueDate: true,
      releaseDate: true,
      approvedAt: true,
      completedAt: true,
      subActivity: true,
      consultantResponseCode: true,
      createdAt: true,
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (tasks.length === 0) {
    return { percentage: 0, status: 'not_started', details: {} };
  }

  // Group by subActivity — keep the most-recently-created per group
  const bySubActivity = new Map<string, (typeof tasks)[number]>();
  for (const t of tasks) {
    const key = t.subActivity || '__none__';
    if (!bySubActivity.has(key)) bySubActivity.set(key, t);
  }
  const latestTasks = Array.from(bySubActivity.values());

  // Build drill-down details
  const taskDetails: TaskDetail[] = latestTasks.map((t) => {
    const isOverdue = !!(
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== 'Completed' &&
      !t.completedAt
    );
    return {
      id: t.id,
      title: t.title,
      subActivity: t.subActivity,
      revision: t.revision,
      status: t.status,
      dueDate: t.dueDate?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      approvedAt: t.approvedAt?.toISOString() ?? null,
      consultantResponseCode: t.consultantResponseCode,
      assignedTo: t.assignedTo?.name ?? null,
      isOverdue,
    };
  });

  const hasOverdue = taskDetails.some((t) => t.isOverdue);

  /**
   * Score each task 0-100 based on its actual state so we always
   * show meaningful progress — even for open / pending tasks.
   *
   * Approval-led columns (arch_approval, design_approval, detailing_approval):
   *   approved                          → 100
   *   completed / released (not approved) → 75
   *   in_progress                       → 40
   *   pending (open)                    → 15
   *
   * Completion-led columns (design, detailing):
   *   completed + releaseDate           → 100
   *   completed (no releaseDate)        → 65
   *   in_progress                       → 40
   *   pending (open)                    → 15
   */
  const scores = latestTasks.map((t) => {
    if (isApprovalLed) {
      if (t.approvedAt) return 100;
      if (t.completedAt || t.releaseDate !== null || t.status === 'Completed') return 75;
      if (t.status === 'In Progress') return 40;
      return 15;
    } else {
      if (t.completedAt && t.releaseDate) return 100;
      if (t.completedAt || t.status === 'Completed') return 65;
      if (t.status === 'In Progress') return 40;
      return 15;
    }
  });

  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Overall status
  const allFullyDone = isApprovalLed
    ? latestTasks.every((t) => t.approvedAt !== null)
    : latestTasks.every((t) => t.completedAt !== null && t.releaseDate !== null);

  if (allFullyDone) {
    return { percentage: 100, status: 'completed', details: { tasks: taskDetails } };
  }

  // All tasks have at least been submitted/completed
  const allSubmitted = latestTasks.every(
    (t) => t.completedAt !== null || t.releaseDate !== null || t.status === 'Completed'
  );
  if (allSubmitted) {
    return { percentage: Math.max(avgScore, 60), status: 'pending_approval', details: { tasks: taskDetails } };
  }

  if (hasOverdue) {
    return { percentage: Math.max(avgScore, 15), status: 'blocked', details: { tasks: taskDetails } };
  }

  // Tasks exist (open, in-progress, partially done) — show real score, min 10%
  return { percentage: Math.max(avgScore, 10), status: 'in_progress', details: { tasks: taskDetails } };
}

async function computeProcurementProgress(
  projectId: string,
  buildingId: string
): Promise<ActivityResult> {
  const entries = await prisma.lcrEntry.findMany({
    where: { projectId, buildingId, isDeleted: false },
    select: { status: true, totalWeight: true, weight: true },
  });

  if (entries.length === 0) {
    return { percentage: 0, status: 'not_started', details: {} };
  }

  let boughtWeight = 0;
  let underRequestWeight = 0;
  let availableWeight = 0;
  let totalActiveWeight = 0;

  for (const entry of entries) {
    const status = (entry.status || '').toLowerCase().trim();
    const isActive = LCR_ACTIVE_STATUSES.some((s) => status.includes(s));
    if (!isActive) continue;

    const w = Number(entry.totalWeight || entry.weight || 0);
    totalActiveWeight += w;

    if (LCR_BOUGHT_STATUSES.some((s) => status.includes(s))) {
      boughtWeight += w;
    } else if (status.includes('under request') || status.includes('pending')) {
      underRequestWeight += w;
    } else if (status.includes('available') || status.includes('received')) {
      availableWeight += w;
    }
  }

  const detail: ProcurementDetail = {
    totalEntries: entries.length,
    totalWeight: totalActiveWeight,
    boughtWeight,
    underRequestWeight,
    availableWeight,
  };

  if (totalActiveWeight === 0) {
    return { percentage: 0, status: 'not_started', details: { procurement: detail } };
  }

  const pct = Math.round((boughtWeight / totalActiveWeight) * 100);

  if (pct >= 100) return { percentage: 100, status: 'completed', details: { procurement: detail } };
  if (pct > 0) return { percentage: pct, status: 'in_progress', details: { procurement: detail } };
  return { percentage: 0, status: 'not_started', details: { procurement: detail } };
}

async function computeProductionProgress(
  projectId: string,
  buildingId: string,
  activityType: string
): Promise<ActivityResult> {
  const processTypes = PRODUCTION_PROCESS_TYPES[activityType] || [];

  const totalWeightResult = await prisma.assemblyPart.aggregate({
    where: { projectId, buildingId, deletedAt: null },
    _sum: { netWeightTotal: true },
  });

  const totalWeight = Number(totalWeightResult._sum.netWeightTotal || 0);
  if (totalWeight === 0) {
    return { percentage: 0, status: 'not_started', details: {} };
  }

  const logs = await prisma.productionLog.findMany({
    where: {
      assemblyPart: { projectId, buildingId, deletedAt: null },
      processType: { in: processTypes },
    },
    select: {
      processType: true,
      processedQty: true,
      assemblyPart: { select: { singlePartWeight: true } },
    },
  });

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

  const processes = processTypes.map((pt) => {
    const pw = weightByProcess.get(pt) || 0;
    return {
      name: pt,
      processedWeight: Math.round(pw * 100) / 100,
      percentage: totalWeight > 0 ? Math.round((pw / totalWeight) * 100) : 0,
    };
  });

  let totalPct = 0;
  for (const p of processes) {
    totalPct += p.percentage;
  }
  const pct = Math.round(totalPct / processTypes.length);

  const dispatchedWeight = processTypes.includes('Dispatched to Customer')
    ? Math.round((weightByProcess.get('Dispatched to Customer') || 0) * 100) / 100
    : 0;

  const detail: ProductionDetail = {
    totalWeight: Math.round(totalWeight * 100) / 100,
    dispatchedWeight,
    processes,
  };

  if (logs.length === 0) {
    return { percentage: 0, status: 'not_started', details: { production: detail } };
  }
  if (pct >= 100) return { percentage: 100, status: 'completed', details: { production: detail } };
  if (pct > 0) return { percentage: pct, status: 'in_progress', details: { production: detail } };
  return { percentage: 0, status: 'not_started', details: { production: detail } };
}
