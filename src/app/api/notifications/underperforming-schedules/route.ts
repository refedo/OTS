import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { cache } from '@/lib/cache';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SCHEDULE_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000; // only schedules ending within last 90 days

type ScheduleRow = {
  id: string;
  buildingId: string;
  scopeType: string;
  scopeLabel: string;
  startDate: Date;
  endDate: Date;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; name: string; designation: string | null } | null;
};

type ScheduleResult = {
  schedules: UnderperformingSchedule[];
  total: number;
  critical: number;
  atRisk: number;
};

type UnderperformingSchedule = {
  id: string;
  scopeType: string;
  scopeLabel: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  expectedProgress: number;
  progressGap: number;
  status: 'critical' | 'at-risk';
  daysOverdue: number;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; name: string; designation: string | null } | null;
};

// Module-level in-flight map: prevents duplicate concurrent queries for the same key
const inFlight = new Map<string, Promise<ScheduleResult>>();

async function runQuery(projectFilter: object, now: Date): Promise<ScheduleResult> {
  const lookbackDate = new Date(now.getTime() - SCHEDULE_LOOKBACK_MS);

  const scopeSchedules = (await prisma.scopeSchedule.findMany({
    where: {
      ...projectFilter,
      endDate: { gte: lookbackDate },
    },
    select: {
      id: true,
      buildingId: true,
      scopeType: true,
      scopeLabel: true,
      startDate: true,
      endDate: true,
      project: { select: { id: true, projectNumber: true, name: true } },
      building: { select: { id: true, name: true, designation: true } },
    },
    orderBy: { endDate: 'asc' },
  })) as ScheduleRow[];

  const fabricationTypes = new Set(['fabrication', 'painting', 'galvanization']);
  const partBuildingIds = [
    ...new Set(
      scopeSchedules
        .filter(s => fabricationTypes.has(s.scopeType))
        .map(s => s.buildingId)
    ),
  ];
  const docBuildingIds = [
    ...new Set(
      scopeSchedules
        .filter(s => s.scopeType === 'design' || s.scopeType === 'shopDrawing')
        .map(s => s.buildingId)
    ),
  ];

  // buildingId -> processType -> progress%
  const progressByBuilding = new Map<string, Map<string, number>>();
  const buildingTotalQty = new Map<string, number>();

  if (partBuildingIds.length > 0) {
    // Step 1: part metadata only — no nested production logs (small payload)
    const partsBasic = await prisma.assemblyPart.findMany({
      where: { buildingId: { in: partBuildingIds }, deletedAt: null },
      select: { id: true, buildingId: true, quantity: true },
    });

    const partQtyMap = new Map<string, { buildingId: string; quantity: number }>();
    for (const p of partsBasic) {
      if (!p.buildingId) continue;
      partQtyMap.set(p.id, { buildingId: p.buildingId, quantity: p.quantity ?? 0 });
      buildingTotalQty.set(
        p.buildingId,
        (buildingTotalQty.get(p.buildingId) ?? 0) + (p.quantity ?? 0)
      );
    }

    if (partQtyMap.size > 0) {
      // Step 2: DB-level aggregation — one row per (part, processType) instead of one row per log entry
      const logAgg = await prisma.productionLog.groupBy({
        by: ['assemblyPartId', 'processType'],
        where: {
          assemblyPartId: { in: [...partQtyMap.keys()] },
          processType: { in: ['Fit-up', 'Welding', 'Visualization', 'Painting', 'Galvanization'] },
        },
        _sum: { processedQty: true },
      });

      const cappedByBuilding = new Map<string, Map<string, number>>();
      for (const row of logAgg) {
        const part = partQtyMap.get(row.assemblyPartId);
        if (!part) continue;
        const capped = Math.min(row._sum.processedQty ?? 0, part.quantity);
        if (!cappedByBuilding.has(part.buildingId)) {
          cappedByBuilding.set(part.buildingId, new Map());
        }
        const byType = cappedByBuilding.get(part.buildingId)!;
        byType.set(row.processType, (byType.get(row.processType) ?? 0) + capped);
      }

      for (const [buildingId, byType] of cappedByBuilding) {
        const total = buildingTotalQty.get(buildingId) ?? 0;
        if (total === 0) continue;
        const pctMap = new Map<string, number>();
        for (const [pt, capped] of byType) {
          pctMap.set(pt, (capped / total) * 100);
        }
        progressByBuilding.set(buildingId, pctMap);
      }
    }
  }

  // Document submission progress (compact dataset, kept as Prisma query)
  const submissionsByKey = new Map<string, { total: number; approved: number }>();
  if (docBuildingIds.length > 0) {
    const allSubmissions = await prisma.documentSubmission.findMany({
      where: {
        buildingId: { in: docBuildingIds },
        documentType: { in: ['Design', 'Shop Drawing'] },
      },
      select: {
        buildingId: true,
        documentType: true,
        clientResponse: true,
        revisions: {
          orderBy: { revision: 'desc' },
          take: 1,
          select: { revision: true, clientResponse: true },
        },
      },
    });

    for (const sub of allSubmissions) {
      const key = `${sub.buildingId}:${sub.documentType}`;
      const response = sub.revisions[0]?.clientResponse ?? sub.clientResponse;
      const isApproved = response === 'Approved' || response === 'Approved with Comments';
      const existing = submissionsByKey.get(key) ?? { total: 0, approved: 0 };
      submissionsByKey.set(key, {
        total: existing.total + 1,
        approved: existing.approved + (isApproved ? 1 : 0),
      });
    }
  }

  const underperformingSchedules: UnderperformingSchedule[] = [];
  for (const schedule of scopeSchedules) {
    let progress = 0;

    if (schedule.scopeType === 'fabrication') {
      const types = progressByBuilding.get(schedule.buildingId);
      if (types) {
        const processes = ['Fit-up', 'Welding', 'Visualization'];
        progress = processes.reduce((s, pt) => s + (types.get(pt) ?? 0), 0) / processes.length;
      }
    } else if (schedule.scopeType === 'painting') {
      progress = progressByBuilding.get(schedule.buildingId)?.get('Painting') ?? 0;
    } else if (schedule.scopeType === 'galvanization') {
      progress = progressByBuilding.get(schedule.buildingId)?.get('Galvanization') ?? 0;
    } else if (schedule.scopeType === 'design') {
      const d = submissionsByKey.get(`${schedule.buildingId}:Design`);
      if (d && d.total > 0) progress = (d.approved / d.total) * 100;
    } else if (schedule.scopeType === 'shopDrawing') {
      const d = submissionsByKey.get(`${schedule.buildingId}:Shop Drawing`);
      if (d && d.total > 0) progress = (d.approved / d.total) * 100;
    }

    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const timeElapsedPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
    const progressGap = timeElapsedPercent - progress;

    let status: 'critical' | 'at-risk' | null = null;
    if (now > end && progress < 100) status = 'critical';
    else if (progressGap > 20) status = 'critical';
    else if (progressGap > 10) status = 'at-risk';

    if (status) {
      underperformingSchedules.push({
        id: schedule.id,
        scopeType: schedule.scopeType,
        scopeLabel: schedule.scopeLabel,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        progress: Math.round(progress * 10) / 10,
        expectedProgress: Math.round(Math.max(0, Math.min(100, timeElapsedPercent)) * 10) / 10,
        progressGap: Math.round(progressGap * 10) / 10,
        status,
        daysOverdue:
          now > end
            ? Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        project: schedule.project,
        building: schedule.building,
      });
    }
  }

  return {
    schedules: underperformingSchedules,
    total: underperformingSchedules.length,
    critical: underperformingSchedules.filter(s => s.status === 'critical').length,
    atRisk: underperformingSchedules.filter(s => s.status === 'at-risk').length,
  };
}

export const GET = withApiContext(async (_req: NextRequest, session) => {
  const userPermissions = await getCurrentUserPermissions();
  const isAdmin = userPermissions.includes('projects.view_all');
  const now = new Date();

  // Admin users all see the same data — share one cache entry to avoid N parallel queries
  const cacheKey = isAdmin
    ? 'underperforming-schedules-all'
    : `underperforming-schedules-${session!.userId}`;

  const cached = cache.get<ScheduleResult>(cacheKey, CACHE_TTL_MS);
  if (cached) return NextResponse.json(cached);

  // In-flight deduplication: if the same query is already running (e.g. multiple users at startup),
  // wait for the first one to complete rather than spawning duplicate DB work
  const existing = inFlight.get(cacheKey);
  if (existing) {
    const result = await existing;
    return NextResponse.json(result);
  }

  const projectFilter = isAdmin
    ? {}
    : {
        project: {
          OR: [
            { projectManagerId: session!.userId },
            { assignments: { some: { userId: session!.userId } } },
          ],
        },
      };

  const queryPromise = runQuery(projectFilter, now);
  inFlight.set(cacheKey, queryPromise);

  try {
    const result = await queryPromise;
    cache.set(cacheKey, result);
    return NextResponse.json(result);
  } finally {
    inFlight.delete(cacheKey);
  }
}, { requireAuth: true });
