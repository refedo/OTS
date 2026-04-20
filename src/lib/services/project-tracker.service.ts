/**
 * Project Tracker Service
 *
 * Shared computation layer used by both the Project Tracker API route and the
 * Early Warning Engine. Extracts real execution progress from Tasks, LcrEntries,
 * AssemblyParts, and ProductionLogs — the same live data that feeds the tracker UI.
 *
 * EWS integration exports (bottom of file):
 *   getProjectActivitySummary(projectId)   → per-activity average % + completion flags
 *   getProjectActivitySummaries(projectIds) → batch version returning a Map
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// ============================================
// CONSTANTS
// ============================================

export const TRACKER_COLUMNS = [
  { type: 'design', label: 'Design Stage' },
  { type: 'detailing', label: 'Shop Drawings' },
  { type: 'procurement', label: 'Procurement' },
  { type: 'production', label: 'Production' },
  { type: 'coating', label: 'Coating' },
  { type: 'dispatch', label: 'Dispatch' },
  { type: 'erection', label: 'Erection' },
] as const;

export type TrackerActivityType = typeof TRACKER_COLUMNS[number]['type'];

export const ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  TRACKER_COLUMNS.map((c) => [c.type, c.label])
);

const ACTIVITY_TO_TASK_MAIN: Record<string, string> = {
  design: 'design',
  detailing: 'detailing',
};

const DESIGN_REVISION_ACTIVITIES = new Set(['design', 'detailing']);

const PRODUCTION_PROCESS_TYPES: Record<string, string[]> = {
  production: ['Fit-up', 'Welding', 'Visualization'],
  coating: ['Sandblasting', 'Painting', 'Galvanization'],
  dispatch: ['Dispatched to Customer'],
  erection: ['Erection'],
};

const LCR_ACTIVE_STATUSES = [
  'bought', 'under request', 'available at factory',
  'pending', 'ordered', 'po issued', 'received', 'available',
];
const LCR_BOUGHT_STATUSES = ['bought', 'ordered', 'po issued'];

// ============================================
// TYPES
// ============================================

export type ActivityStatus =
  | 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'pending_approval'
  | 'pending' | 'waiting_approval' | 'completed_released' | 'rejected' | 'approved';

type DesignRevisionState =
  | 'pending' | 'in_progress' | 'waiting_approval' | 'completed'
  | 'completed_released' | 'rejected' | 'approved';

const DESIGN_STATE_PRIORITY: Record<DesignRevisionState, number> = {
  pending: 0, rejected: 1, in_progress: 2, waiting_approval: 3,
  completed: 4, completed_released: 5, approved: 6,
};

const DESIGN_STATE_PERCENTAGE: Record<DesignRevisionState, number> = {
  pending: 0, rejected: 50, in_progress: 50, waiting_approval: 50,
  completed: 70, completed_released: 80, approved: 100,
};

export interface ActivityResult {
  percentage: number;
  status: ActivityStatus;
  consultantCode?: string;
  details: Record<string, unknown>;
}

// ============================================
// INTERNAL HELPERS
// ============================================

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

async function computeTaskProgress(
  projectId: string,
  buildingId: string,
  activityType: string
): Promise<ActivityResult> {
  const mainActivity = ACTIVITY_TO_TASK_MAIN[activityType];
  const now = new Date();

  // Task model has no deletedAt — do not add that filter
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

  const taskDetails = latestTasks.map((t) => {
    const isOverdue = !!(
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed' && !t.completedAt
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
    if (LCR_BOUGHT_STATUSES.some((s) => status.includes(s))) boughtWeight += w;
    else if (status.includes('under request') || status.includes('pending')) underRequestWeight += w;
    else if (status.includes('available') || status.includes('received')) availableWeight += w;
  }

  const detail = {
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
  for (const pt of processTypes) weightByProcess.set(pt, 0);

  for (const log of logs) {
    const partWeight = Number(log.assemblyPart.singlePartWeight || 0);
    const processedWeight = log.processedQty * partWeight;
    weightByProcess.set(log.processType, (weightByProcess.get(log.processType) || 0) + processedWeight);
  }

  const processes = processTypes.map((pt) => {
    const pw = weightByProcess.get(pt) || 0;
    return {
      name: pt,
      processedWeight: Math.round(pw * 100) / 100,
      percentage: totalWeight > 0 ? Math.round((pw / totalWeight) * 100) : 0,
    };
  });

  const activeProcesses = processes.filter((p) => p.processedWeight > 0);
  const pct = activeProcesses.length > 0
    ? Math.round(activeProcesses.reduce((s, p) => s + p.percentage, 0) / activeProcesses.length)
    : 0;

  const dispatchedWeight = processTypes.includes('Dispatched to Customer')
    ? Math.round((weightByProcess.get('Dispatched to Customer') || 0) * 100) / 100
    : 0;

  const shipmentCount =
    activityType === 'dispatch'
      ? (() => {
          const dispatchLogs = logs.filter((l) => l.processType === 'Dispatched to Customer');
          const reportNums = new Set(dispatchLogs.map((l) => l.reportNumber).filter(Boolean));
          return reportNums.size > 0 ? reportNums.size : dispatchLogs.length;
        })()
      : undefined;

  const detail = {
    totalWeight: Math.round(totalWeight * 100) / 100,
    dispatchedWeight,
    ...(shipmentCount !== undefined && { shipmentCount }),
    processes,
  };

  if (logs.length === 0) return { percentage: 0, status: 'not_started', details: { production: detail } };
  if (pct >= 100) return { percentage: 100, status: 'completed', details: { production: detail } };
  if (pct > 0) return { percentage: pct, status: 'in_progress', details: { production: detail } };
  return { percentage: 0, status: 'not_started', details: { production: detail } };
}

// ============================================
// PUBLIC: CORE COMPUTATION (used by tracker API)
// ============================================

export async function computeActivityProgress(
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

// ============================================
// PUBLIC: EWS INTEGRATION EXPORTS
// ============================================

export interface ProjectActivitySummary {
  projectId: string;
  buildingCount: number;
  /**
   * activityType → average % across all buildings (0–100).
   * Activities with no data in any building are 0.
   */
  activityAverages: Record<string, number>;
  /**
   * activityType → true if ALL buildings show ≥ 95%.
   * Only meaningful when buildingCount > 0.
   */
  activityCompleted: Record<string, boolean>;
}

/**
 * Compute per-activity average progress across all buildings for one project.
 * Called by the EWS engine to cross-check plan-based alerts against live tracker data.
 */
export async function getProjectActivitySummary(projectId: string): Promise<ProjectActivitySummary> {
  const buildings = await prisma.building.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true },
  });

  const emptyAverages = Object.fromEntries(TRACKER_COLUMNS.map((c) => [c.type, 0]));
  const emptyCompleted = Object.fromEntries(TRACKER_COLUMNS.map((c) => [c.type, false]));

  if (buildings.length === 0) {
    return { projectId, buildingCount: 0, activityAverages: emptyAverages, activityCompleted: emptyCompleted };
  }

  const totals: Record<string, number> = Object.fromEntries(TRACKER_COLUMNS.map((c) => [c.type, 0]));
  // Start optimistic — falsify if any building is below the completion threshold
  const completed: Record<string, boolean> = Object.fromEntries(TRACKER_COLUMNS.map((c) => [c.type, true]));

  for (const building of buildings) {
    for (const col of TRACKER_COLUMNS) {
      const result = await computeActivityProgress(projectId, building.id, col.type);
      totals[col.type] += result.percentage;
      if (result.percentage < 95) {
        completed[col.type] = false;
      }
    }
  }

  const activityAverages: Record<string, number> = {};
  for (const col of TRACKER_COLUMNS) {
    activityAverages[col.type] = Math.round(totals[col.type] / buildings.length);
  }

  return {
    projectId,
    buildingCount: buildings.length,
    activityAverages,
    activityCompleted: completed,
  };
}

/**
 * Batch version — fetches summaries for multiple projects concurrently.
 * Returns a Map keyed by projectId.
 */
export async function getProjectActivitySummaries(
  projectIds: string[]
): Promise<Map<string, ProjectActivitySummary>> {
  const results = new Map<string, ProjectActivitySummary>();
  await Promise.all(
    projectIds.map(async (pid) => {
      try {
        const summary = await getProjectActivitySummary(pid);
        results.set(pid, summary);
      } catch (error) {
        logger.warn({ error, projectId: pid }, 'EWS: failed to fetch tracker summary for project');
      }
    })
  );
  return results;
}
