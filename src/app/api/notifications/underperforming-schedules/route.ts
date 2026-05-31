import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { cache } from '@/lib/cache';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type PartRow = {
  id: string;
  buildingId: string | null;
  quantity: number | null;
  productionLogs: Array<{ processType: string; processedQty: number | null }>;
};

type SubmissionRow = {
  buildingId: string | null;
  documentType: string;
  clientResponse: string | null;
  revisions: Array<{ revision: string; clientResponse: string | null }>;
};

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

function computeProgress(
  scopeType: string,
  buildingId: string,
  partsByBuilding: Map<string, PartRow[]>,
  submissionsByKey: Map<string, SubmissionRow[]>
): number {
  if (scopeType === 'fabrication') {
    const parts = partsByBuilding.get(buildingId) ?? [];
    if (parts.length === 0) return 0;
    const totalQty = parts.reduce((s, p) => s + (p.quantity ?? 0), 0);
    if (totalQty === 0) return 0;
    const processes = ['Fit-up', 'Welding', 'Visualization'];
    const avg = processes.map(pt => {
      const processed = parts.reduce((s, part) => {
        const sum = part.productionLogs
          .filter(l => l.processType === pt)
          .reduce((a, l) => a + (l.processedQty ?? 0), 0);
        return s + Math.min(sum, part.quantity ?? 0);
      }, 0);
      return (processed / totalQty) * 100;
    });
    return avg.reduce((s, p) => s + p, 0) / processes.length;
  }

  if (scopeType === 'painting' || scopeType === 'galvanization') {
    const processType = scopeType === 'painting' ? 'Painting' : 'Galvanization';
    const parts = partsByBuilding.get(buildingId) ?? [];
    if (parts.length === 0) return 0;
    const totalQty = parts.reduce((s, p) => s + (p.quantity ?? 0), 0);
    if (totalQty === 0) return 0;
    const processed = parts.reduce((s, part) => {
      const sum = part.productionLogs
        .filter(l => l.processType === processType)
        .reduce((a, l) => a + (l.processedQty ?? 0), 0);
      return s + Math.min(sum, part.quantity ?? 0);
    }, 0);
    return (processed / totalQty) * 100;
  }

  if (scopeType === 'design' || scopeType === 'shopDrawing') {
    const documentType = scopeType === 'design' ? 'Design' : 'Shop Drawing';
    const submissions = submissionsByKey.get(`${buildingId}:${documentType}`) ?? [];
    if (submissions.length === 0) return 0;
    const approved = submissions.filter(doc => {
      const response = doc.revisions[0]?.clientResponse ?? doc.clientResponse;
      return response === 'Approved' || response === 'Approved with Comments';
    });
    return (approved.length / submissions.length) * 100;
  }

  return 0;
}

export const GET = withApiContext(async (_req: NextRequest, session) => {
  const cacheKey = `underperforming-schedules-${session!.userId}`;
  const cached = cache.get(cacheKey, CACHE_TTL_MS);
  if (cached) {
    return NextResponse.json(cached);
  }

  const userPermissions = await getCurrentUserPermissions();
  const isAdmin = userPermissions.includes('projects.view_all');
  const now = new Date();

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

  const scopeSchedules: ScheduleRow[] = await prisma.scopeSchedule.findMany({
    where: { ...projectFilter },
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
  });

  // Collect building IDs per category — avoids N+1 by batch-loading all data upfront
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

  // Single batch query for all assembly parts across all relevant buildings
  const partsByBuilding = new Map<string, PartRow[]>();
  if (partBuildingIds.length > 0) {
    const allParts = await prisma.assemblyPart.findMany({
      where: { buildingId: { in: partBuildingIds }, deletedAt: null },
      select: {
        id: true,
        buildingId: true,
        quantity: true,
        productionLogs: {
          select: { processType: true, processedQty: true },
        },
      },
    });
    for (const part of allParts) {
      if (!part.buildingId) continue;
      const list = partsByBuilding.get(part.buildingId);
      if (list) list.push(part);
      else partsByBuilding.set(part.buildingId, [part]);
    }
  }

  // Single batch query for all document submissions across all relevant buildings
  const submissionsByKey = new Map<string, SubmissionRow[]>();
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
      const list = submissionsByKey.get(key);
      if (list) list.push(sub);
      else submissionsByKey.set(key, [sub]);
    }
  }

  // All progress calculations are now pure in-memory — no DB calls in this loop
  const underperformingSchedules = [];
  for (const schedule of scopeSchedules) {
    const progress = computeProgress(
      schedule.scopeType,
      schedule.buildingId,
      partsByBuilding,
      submissionsByKey
    );

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

  const result = {
    schedules: underperformingSchedules,
    total: underperformingSchedules.length,
    critical: underperformingSchedules.filter(s => s.status === 'critical').length,
    atRisk: underperformingSchedules.filter(s => s.status === 'at-risk').length,
  };

  cache.set(cacheKey, result);
  return NextResponse.json(result);
}, { requireAuth: true });
