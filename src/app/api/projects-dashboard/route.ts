import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { cache } from '@/lib/cache';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes — shared across all users (project data)

type AggProgressRow = {
  buildingId: string;
  processType: string;
  completedTonnage: number;
};

type AggTonnageRow = {
  buildingId: string;
  totalTonnage: number;
  totalParts: bigint;
};

type ProcessProgressMap = Map<string, number>;

type BuildingProgress = {
  totalParts: number;
  progressPercentage: number;
  totalTonnage: number;
  completedTonnage: number;
  processProgress: ProcessProgressMap;
};

const PROCESS_TYPES = [
  'Preparation', 'Fit-up', 'Welding', 'Visualization',
  'Sandblasting', 'Painting', 'Galvanization', 'Dispatch',
];

// GET /api/projects-dashboard - All active projects with building-level stage and production data
export const GET = withApiContext(async (_req: NextRequest) => {
  const cached = cache.get<ReturnType<typeof buildResponse>>('projects-dashboard', CACHE_TTL_MS);
  if (cached) return NextResponse.json(cached);

  // Load projects + stage configs in parallel
  const [projects, stageConfigs] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ['Active', 'Draft'] }, deletedAt: null },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        contractDate: true,
        downPaymentDate: true,
        scopeOfWorkJson: true,
      },
      orderBy: { projectNumber: 'asc' },
    }),
    prisma.operationStageConfig.findMany({
      where: { stageCode: { notIn: ['CONTRACT_SIGNED', 'DOWN_PAYMENT_RECEIVED'] } },
      orderBy: { orderIndex: 'asc' },
    }),
  ]);

  if (projects.length === 0) return NextResponse.json([]);

  const projectIds = projects.map((p: { id: string }) => p.id);

  // Load buildings, events, and design submissions in parallel
  const [buildings, events, designSubmissions] = await Promise.all([
    prisma.building.findMany({
      where: { projectId: { in: projectIds }, deletedAt: null },
      select: { id: true, projectId: true, designation: true, name: true },
      orderBy: { designation: 'asc' },
    }),
    prisma.operationEvent.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, projectId: true, buildingId: true, stage: true, eventDate: true, status: true },
    }),
    prisma.documentSubmission.findMany({
      where: {
        projectId: { in: projectIds },
        documentType: { in: ['Structural Design Package', 'Structural Design'] },
      },
      select: {
        id: true, projectId: true, buildingId: true, documentType: true,
        submissionDate: true, approvalDate: true, status: true,
        clientCode: true, clientResponse: true,
      },
    }),
  ]);

  const buildingIds = buildings.map((b: { id: string }) => b.id);

  // Two aggregated SQL queries replace the per-building N+1 loop.
  // All production data is aggregated in the DB — nothing is loaded row-by-row into Node memory.
  let aggProgress: AggProgressRow[] = [];
  let aggTonnage: AggTonnageRow[] = [];

  if (buildingIds.length > 0) {
    const idList = Prisma.join(buildingIds);
    [aggProgress, aggTonnage] = await Promise.all([
      // Completed tonnage per building per process type
      // Sub-query aggregates multiple logs per (part, process) before joining parts
      prisma.$queryRaw<AggProgressRow[]>`
        SELECT
          ap.buildingId,
          pl_agg.processType,
          SUM(
            CASE
              WHEN pl_agg.minRemaining = 0
                THEN ap.netWeightTotal / 1000
              ELSE
                (ap.netWeightTotal / 1000) *
                LEAST(pl_agg.sumProcessed / GREATEST(ap.quantity, 1), 1.0)
            END
          ) AS completedTonnage
        FROM (
          SELECT
            assemblyPartId,
            processType,
            SUM(processedQty)  AS sumProcessed,
            MIN(remainingQty)  AS minRemaining
          FROM ProductionLog
          GROUP BY assemblyPartId, processType
        ) pl_agg
        JOIN AssemblyPart ap ON ap.id = pl_agg.assemblyPartId
        WHERE ap.buildingId IN (${idList})
          AND ap.deletedAt IS NULL
        GROUP BY ap.buildingId, pl_agg.processType
      `,
      // Total tonnage and part count per building (independent of logs)
      prisma.$queryRaw<AggTonnageRow[]>`
        SELECT
          buildingId,
          SUM(netWeightTotal) / 1000 AS totalTonnage,
          COUNT(*)                   AS totalParts
        FROM AssemblyPart
        WHERE buildingId IN (${idList})
          AND deletedAt IS NULL
        GROUP BY buildingId
      `,
    ]);
  }

  // Build in-memory progress map from aggregated rows
  const tonnageByBuilding = new Map<string, { totalTonnage: number; totalParts: number }>();
  for (const row of aggTonnage) {
    tonnageByBuilding.set(row.buildingId, {
      totalTonnage: Number(row.totalTonnage) || 0,
      totalParts: Number(row.totalParts) || 0,
    });
  }

  const completedByBuilding = new Map<string, Map<string, number>>();
  for (const row of aggProgress) {
    if (!completedByBuilding.has(row.buildingId)) completedByBuilding.set(row.buildingId, new Map());
    completedByBuilding.get(row.buildingId)!.set(row.processType, Number(row.completedTonnage) || 0);
  }

  const productionProgressMap = new Map<string, BuildingProgress>();
  for (const [buildingId, { totalTonnage, totalParts }] of tonnageByBuilding) {
    const completed = completedByBuilding.get(buildingId) ?? new Map<string, number>();
    const processProgress: ProcessProgressMap = new Map();
    for (const pt of PROCESS_TYPES) {
      const c = completed.get(pt) ?? 0;
      processProgress.set(pt, totalTonnage > 0 ? (c / totalTonnage) * 100 : 0);
    }
    // Overall progress = average of the three core fabrication stages
    const fitup = processProgress.get('Fit-up') ?? 0;
    const welding = processProgress.get('Welding') ?? 0;
    const viz = processProgress.get('Visualization') ?? 0;
    const progressPercentage = (fitup + welding + viz) / 3;
    const completedTonnage = totalTonnage * progressPercentage / 100;

    productionProgressMap.set(buildingId, {
      totalParts,
      progressPercentage,
      totalTonnage,
      completedTonnage,
      processProgress,
    });
  }

  const result = buildResponse(projects, buildings, events, designSubmissions, stageConfigs, productionProgressMap);
  cache.set('projects-dashboard', result);
  return NextResponse.json(result);
}, { requireAuth: true });

function buildResponse(
  projects: Array<{
    id: string; projectNumber: string; name: string; status: string;
    contractDate: Date | null; downPaymentDate: Date | null; scopeOfWorkJson: unknown;
  }>,
  buildings: Array<{ id: string; projectId: string; designation: string; name: string }>,
  events: Array<{ id: string; projectId: string; buildingId: string | null; stage: string; eventDate: Date; status: string }>,
  designSubmissions: Array<{
    id: string; projectId: string; buildingId: string | null; documentType: string;
    submissionDate: Date; approvalDate: Date | null; status: string | null;
    clientCode: string | null; clientResponse: string | null;
  }>,
  stageConfigs: Array<{ stageCode: string; stageName: string; orderIndex: number }>,
  productionProgressMap: Map<string, BuildingProgress>
) {
  const filteredStageConfigs = stageConfigs.filter(
    s => !s.stageCode.includes('COMPLETED') && s.stageCode !== 'PROCUREMENT_STARTED'
  );

  return projects.map(project => {
    const projectBuildings = buildings.filter(b => b.projectId === project.id);
    const enabledPhases = (project.scopeOfWorkJson as string[] | null) ?? [];

    const isInScope = (stageCode: string): boolean => {
      if (enabledPhases.length === 0) return true;
      if (['DESIGN_SUBMITTED', 'DESIGN_APPROVED'].includes(stageCode))
        return enabledPhases.includes('Design') || enabledPhases.includes('Engineering');
      if (['SHOP_SUBMITTED', 'SHOP_APPROVED'].includes(stageCode))
        return enabledPhases.includes('Detailing');
      if (['PRODUCTION_STARTED', 'COATING_STARTED'].includes(stageCode))
        return enabledPhases.includes('Fabrication') || enabledPhases.includes('Production');
      if (stageCode === 'DISPATCHING_STARTED')
        return enabledPhases.includes('Delivery') || enabledPhases.includes('Fabrication') || enabledPhases.includes('Production');
      if (stageCode === 'ERECTION_STARTED')
        return enabledPhases.includes('Erection');
      if (stageCode === 'ARCH_APPROVED')
        return enabledPhases.includes('Architectural');
      return true;
    };

    const buildingsData = projectBuildings.map(building => {
      const buildingEvents = events.filter(e => e.projectId === project.id && e.buildingId === building.id);
      const buildingDesign = designSubmissions.filter(d => d.projectId === project.id && d.buildingId === building.id);
      const bp = productionProgressMap.get(building.id);

      const stages = filteredStageConfigs.map(sc => {
        if (!isInScope(sc.stageCode)) {
          return { stageCode: sc.stageCode, stageName: sc.stageName, status: 'out_of_scope' as const, outOfScope: true };
        }

        const cleanName = sc.stageName.replace(/ Started$/, '').replace(/ Start$/, '');

        if (sc.stageCode === 'DESIGN_SUBMITTED') {
          const sub = buildingDesign.find(d => d.submissionDate);
          return {
            stageCode: sc.stageCode, stageName: sc.stageName,
            status: sub ? 'completed' : 'not_started',
            eventDate: sub?.submissionDate, clientCode: sub?.clientCode,
            clientResponse: sub?.clientResponse, outOfScope: false,
          };
        }
        if (sc.stageCode === 'DESIGN_APPROVED') {
          const sub = buildingDesign.find(d => d.approvalDate);
          return {
            stageCode: sc.stageCode, stageName: sc.stageName,
            status: sub ? 'completed' : 'not_started',
            eventDate: sub?.approvalDate, clientCode: sub?.clientCode,
            clientResponse: sub?.clientResponse, outOfScope: false,
          };
        }
        if (sc.stageCode === 'PRODUCTION_STARTED') {
          const event = buildingEvents.find(e => e.stage === sc.stageCode);
          const pct = bp ? ((bp.processProgress.get('Fit-up') ?? 0) + (bp.processProgress.get('Welding') ?? 0) + (bp.processProgress.get('Visualization') ?? 0)) / 3 : 0;
          return {
            stageCode: sc.stageCode, stageName: cleanName,
            status: event ? 'completed' : (pct > 0 ? 'pending' : 'not_started'),
            eventDate: event?.eventDate, progressPercentage: pct, outOfScope: false,
          };
        }
        if (sc.stageCode === 'COATING_STARTED') {
          const event = buildingEvents.find(e => e.stage === sc.stageCode);
          const pct = bp ? Math.max(bp.processProgress.get('Galvanization') ?? 0, bp.processProgress.get('Painting') ?? 0) : 0;
          return {
            stageCode: sc.stageCode, stageName: cleanName,
            status: event ? 'completed' : (pct > 0 ? 'pending' : 'not_started'),
            eventDate: event?.eventDate, progressPercentage: pct, outOfScope: false,
          };
        }
        if (sc.stageCode === 'DISPATCHING_STARTED') {
          const event = buildingEvents.find(e => e.stage === sc.stageCode);
          const pct = bp?.processProgress.get('Dispatch') ?? 0;
          return {
            stageCode: sc.stageCode, stageName: cleanName,
            status: event ? 'completed' : (pct > 0 ? 'pending' : 'not_started'),
            eventDate: event?.eventDate, progressPercentage: pct, outOfScope: false,
          };
        }

        const event = buildingEvents.find(e => e.stage === sc.stageCode);
        return {
          stageCode: sc.stageCode, stageName: cleanName,
          status: event ? (event.status === 'Completed' ? 'completed' : 'pending') : 'not_started',
          eventDate: event?.eventDate, outOfScope: false,
        };
      });

      const completedCount = stages.filter(s => s.status === 'completed').length;
      const pendingCount = stages.filter(s => s.status === 'pending').length;
      const notStartedCount = stages.filter(s => s.status === 'not_started').length;
      const progress = filteredStageConfigs.length > 0 ? (completedCount / filteredStageConfigs.length) * 100 : 0;

      return {
        id: building.id,
        designation: building.designation,
        name: building.name,
        stages,
        completedCount,
        pendingCount,
        notStartedCount,
        progress,
        productionProgress: bp?.progressPercentage ?? 0,
        totalTonnage: bp?.totalTonnage ?? 0,
        completedTonnage: bp?.completedTonnage ?? 0,
      };
    });

    return {
      id: project.id,
      projectNumber: project.projectNumber,
      name: project.name,
      status: project.status,
      contractDate: project.contractDate,
      downPaymentDate: project.downPaymentDate,
      buildings: buildingsData,
    };
  });
}
