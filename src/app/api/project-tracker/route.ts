import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// The 8 fixed activity columns displayed in the tracker
const TRACKER_COLUMNS = [
  { type: 'arch_approval', label: 'Arch Drawing' },
  { type: 'design', label: 'Design Stage' },
  { type: 'detailing', label: 'Shop Drawings' },
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
  detailing: 'detailing',
};

// Activities where we check approvedAt (approval-led)
const APPROVAL_ACTIVITIES = new Set(['arch_approval']);

// Activities where progress is driven by revision status (design/detailing new logic)
const DESIGN_REVISION_ACTIVITIES = new Set(['design', 'detailing']);

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

type ActivityStatus =
  | 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'pending_approval'
  | 'pending' | 'waiting_approval' | 'completed_released' | 'rejected' | 'approved';

type DesignRevisionState = 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'completed_released' | 'rejected' | 'approved';

const DESIGN_STATE_PRIORITY: Record<DesignRevisionState, number> = {
  pending: 0, rejected: 1, in_progress: 2, waiting_approval: 3,
  completed: 4, completed_released: 5, approved: 6,
};

const DESIGN_STATE_PERCENTAGE: Record<DesignRevisionState, number> = {
  pending: 0, rejected: 50, in_progress: 50, waiting_approval: 50,
  completed: 70, completed_released: 80, approved: 100,
};

function getTaskDesignState(t: {
  status: string;
  completedAt: Date | null;
  releaseDate: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  consultantResponseCode: string | null;
}): DesignRevisionState {
  if (t.approvedAt) return 'approved';
  if (t.rejectedAt || t.consultantResponseCode === 'code_c') return 'rejected';
  if (t.completedAt || t.status === 'Completed') {
    return t.releaseDate ? 'completed_released' : 'completed';
  }
  if (t.status === 'Waiting for Approval') return 'waiting_approval';
  if (t.status === 'In Progress') return 'in_progress';
  return 'pending';
}

interface TaskDetail {
  id: string;
  title: string;
  subActivity: string | null;
  revision: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
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
  shipmentCount?: number;
  processes: { name: string; processedWeight: number; percentage: number }[];
}

interface ActivityResult {
  percentage: number;
  status: ActivityStatus;
  consultantCode?: string;
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

            // Sum assembly tonnage — use netWeightTotal if set, else singlePartWeight * quantity
            const assemblyParts = await prisma.assemblyPart.findMany({
              where: { buildingId: building.id, deletedAt: null },
              select: { netWeightTotal: true, singlePartWeight: true, quantity: true },
            });
            let rawTotalKg = assemblyParts.reduce((sum, p) => {
              const w = Number(p.netWeightTotal ?? 0) > 0
                ? Number(p.netWeightTotal)
                : Number(p.singlePartWeight ?? 0) * (p.quantity ?? 1);
              return sum + w;
            }, 0);
            // Fallback: if no building-level data, aggregate at project level
            if (rawTotalKg === 0) {
              const projectParts = await prisma.assemblyPart.findMany({
                where: { projectId: project.id, buildingId: null, deletedAt: null },
                select: { netWeightTotal: true, singlePartWeight: true, quantity: true },
              });
              rawTotalKg = projectParts.reduce((sum, p) => {
                const w = Number(p.netWeightTotal ?? 0) > 0
                  ? Number(p.netWeightTotal)
                  : Number(p.singlePartWeight ?? 0) * (p.quantity ?? 1);
                return sum + w;
              }, 0);
            }
            const assemblyTonnage = rawTotalKg / 1000;

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
      rejectedAt: true,
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
      rejectedAt: t.rejectedAt?.toISOString() ?? null,
      consultantResponseCode: t.consultantResponseCode,
      assignedTo: t.assignedTo?.name ?? null,
      isOverdue,
    };
  });

  // Design Stage & Shop Drawings: revision-based status logic
  if (DESIGN_REVISION_ACTIVITIES.has(activityType)) {
    let worstState: DesignRevisionState = 'approved';
    for (const t of latestTasks) {
      const state = getTaskDesignState(t);
      if (DESIGN_STATE_PRIORITY[state] < DESIGN_STATE_PRIORITY[worstState]) {
        worstState = state;
      }
    }
    const percentage = DESIGN_STATE_PERCENTAGE[worstState];

    let consultantCode: string | undefined;
    if (worstState === 'approved') {
      const codes = latestTasks.map((t) => t.consultantResponseCode).filter(Boolean) as string[];
      if (codes.some((c) => c === 'code_b')) consultantCode = 'B';
      else if (codes.some((c) => c === 'code_a')) consultantCode = 'A';
      else consultantCode = 'A';
    }

    return { percentage, status: worstState, consultantCode, details: { tasks: taskDetails } };
  }

  const hasOverdue = taskDetails.some((t) => t.isOverdue);

  /**
   * Score each task 0-100 for approval-led columns (arch_approval):
   *   approved                          → 100
   *   completed / released (not approved) → 75
   *   in_progress                       → 40
   *   pending (open)                    → 15
   */
  const scores = latestTasks.map((t) => {
    if (t.approvedAt) return 100;
    if (t.completedAt || t.releaseDate !== null || t.status === 'Completed') return 75;
    if (t.status === 'In Progress') return 40;
    return 15;
  });

  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  if (latestTasks.every((t) => t.approvedAt !== null)) {
    return { percentage: 100, status: 'completed', details: { tasks: taskDetails } };
  }

  const allSubmitted = latestTasks.every(
    (t) => t.completedAt !== null || t.releaseDate !== null || t.status === 'Completed'
  );
  if (allSubmitted) {
    return { percentage: Math.max(avgScore, 60), status: 'pending_approval', details: { tasks: taskDetails } };
  }

  if (hasOverdue) {
    return { percentage: Math.max(avgScore, 15), status: 'blocked', details: { tasks: taskDetails } };
  }

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
      reportNumber: true,
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
  // Only average processes that have actual production data
  const activeProcesses = processes.filter(p => p.processedWeight > 0);
  for (const p of activeProcesses) {
    totalPct += p.percentage;
  }
  const pct = activeProcesses.length > 0 ? Math.round(totalPct / activeProcesses.length) : 0;

  const dispatchedWeight = processTypes.includes('Dispatched to Customer')
    ? Math.round((weightByProcess.get('Dispatched to Customer') || 0) * 100) / 100
    : 0;

  // Count distinct report numbers for dispatch (each distinct reportNumber = one shipment/delivery)
  const shipmentCount = activityType === 'dispatch'
    ? (() => {
        const dispatchLogs = logs.filter(l => l.processType === 'Dispatched to Customer');
        const reportNums = new Set(dispatchLogs.map(l => l.reportNumber).filter(Boolean));
        return reportNums.size > 0 ? reportNums.size : dispatchLogs.length;
      })()
    : undefined;

  const detail: ProductionDetail = {
    totalWeight: Math.round(totalWeight * 100) / 100,
    dispatchedWeight,
    ...(shipmentCount !== undefined && { shipmentCount }),
    processes,
  };

  if (logs.length === 0) {
    return { percentage: 0, status: 'not_started', details: { production: detail } };
  }
  if (pct >= 100) return { percentage: 100, status: 'completed', details: { production: detail } };
  if (pct > 0) return { percentage: pct, status: 'in_progress', details: { production: detail } };
  return { percentage: 0, status: 'not_started', details: { production: detail } };
}
