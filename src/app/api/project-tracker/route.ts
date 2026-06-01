import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { TRACKER_COLUMNS, computeActivityProgress } from '@/lib/services/project-tracker.service';

// 60-second cache + in-flight deduplication so concurrent users after a restart
// share one computation instead of each triggering hundreds of DB queries.
const CACHE_TTL_MS = 60_000;

type TrackerPayload = { stats: Record<string, unknown>; projects: unknown[] };
const cache = new Map<string, { data: TrackerPayload; ts: number }>();
const inFlight = new Map<string, Promise<TrackerPayload>>();

type Project = Awaited<ReturnType<typeof fetchProjects>>[number];
type Building = Project['buildings'][number];

async function fetchProjects(where: Record<string, unknown>) {
  return prisma.project.findMany({
    where,
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
              activities: {
                select: { activityType: true, isApplicable: true },
                orderBy: { sortOrder: 'asc' },
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
}

async function buildBuildingRow(projectId: string, building: Building) {
  // Run 7 activity-column queries in parallel (bounded concurrency)
  const activities = await Promise.all(
    TRACKER_COLUMNS.map(async (col) => {
      const progress = await computeActivityProgress(projectId, building.id, col.type);
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
  const currentStage = activities.find((a) => a.percentage > 0 && a.percentage < 100);
  const hasBlocked = activities.some((a) => a.status === 'blocked');

  // Aggregate tonnage in MySQL — avoids loading potentially thousands of rows
  type TonnageRow = { total_kg: string | null };
  const [buildingTonnage] = await prisma.$queryRaw<TonnageRow[]>`
    SELECT SUM(
      CASE WHEN netWeightTotal > 0 THEN netWeightTotal
           ELSE singlePartWeight * quantity END
    ) AS total_kg
    FROM AssemblyPart
    WHERE buildingId = ${building.id} AND deletedAt IS NULL
  `;
  let rawTotalKg = Number(buildingTonnage?.total_kg ?? 0);

  if (rawTotalKg === 0) {
    const [projectTonnage] = await prisma.$queryRaw<TonnageRow[]>`
      SELECT SUM(
        CASE WHEN netWeightTotal > 0 THEN netWeightTotal
             ELSE singlePartWeight * quantity END
      ) AS total_kg
      FROM AssemblyPart
      WHERE projectId = ${projectId} AND buildingId IS NULL AND deletedAt IS NULL
    `;
    rawTotalKg = Number(projectTonnage?.total_kg ?? 0);
  }
  const assemblyTonnage = rawTotalKg / 1000;

  const dbScopes = building.scopeOfWorks;
  const scopes =
    dbScopes.length > 0
      ? dbScopes.map((scope) => {
          const applicableMap = new Map<string, boolean>(
            scope.activities.map((a) => [a.activityType, a.isApplicable])
          );
          const hasActivityConfig = scope.activities.length > 0;
          const scopeActivities = activities.map((act) => ({
            ...act,
            isApplicable: hasActivityConfig ? (applicableMap.get(act.activityType) ?? true) : true,
          }));
          const applicable = scopeActivities.filter((a) => a.isApplicable);
          const scopeProgress =
            applicable.length > 0
              ? Math.round(applicable.reduce((s, a) => s + a.percentage, 0) / applicable.length)
              : 0;
          return {
            id: scope.id,
            scopeType: scope.scopeType,
            scopeLabel: scope.scopeLabel,
            activities: scopeActivities,
            overallProgress: scopeProgress,
          };
        })
      : [
          {
            id: `${building.id}-default`,
            scopeType: 'steel',
            scopeLabel: 'Steel',
            activities: activities.map((a) => ({ ...a, isApplicable: true })),
            overallProgress: totalProgress,
          },
        ];

  return {
    id: building.id,
    name: building.name,
    designation: building.designation,
    weight: building.weight,
    assemblyTonnage,
    scopes,
    overallProgress: totalProgress,
    hasBlocked,
    currentStage: currentStage
      ? { label: currentStage.activityLabel, index: activities.indexOf(currentStage) + 1 }
      : null,
  };
}

async function buildProjectRow(project: Project) {
  // Process buildings sequentially to cap peak memory
  const buildingsData: Awaited<ReturnType<typeof buildBuildingRow>>[] = [];
  for (const building of project.buildings) {
    buildingsData.push(await buildBuildingRow(project.id, building));
  }

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
}

async function computeFullDataset(projectId: string | null): Promise<TrackerPayload> {
  const projectWhere: Record<string, unknown> = {
    deletedAt: null,
    status: { not: 'Draft' },
  };
  if (projectId) projectWhere.id = projectId;

  const projects = await fetchProjects(projectWhere);

  // Process projects sequentially to cap peak memory; each building is also
  // processed sequentially (only the 7 activity-column queries run in parallel).
  const trackerData: Awaited<ReturnType<typeof buildProjectRow>>[] = [];
  for (const project of projects) {
    trackerData.push(await buildProjectRow(project));
  }

  const allBuildings = trackerData.flatMap((p) => p.buildings);
  const stats = {
    activeProjects: trackerData.filter((p) => p.status === 'Active').length,
    totalBuildings: allBuildings.length,
    inProgress: allBuildings.filter((b) => b.overallProgress > 0 && b.overallProgress < 100).length,
    completed: allBuildings.filter((b) => b.overallProgress === 100).length,
    blocked: allBuildings.filter((b) => b.hasBlocked).length,
  };

  return { stats, projects: trackerData };
}

export const GET = withApiContext(async (req, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const statusFilter = searchParams.get('status');

    const cacheKey = projectId ?? '__all__';
    const now = Date.now();

    // Serve from cache if fresh
    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      const filtered = applyStatusFilter(cached.data.projects, statusFilter);
      return NextResponse.json({ stats: cached.data.stats, projects: filtered });
    }

    // Deduplicate concurrent requests — all callers await the same Promise
    let promise = inFlight.get(cacheKey);
    if (!promise) {
      promise = computeFullDataset(projectId).then((result) => {
        cache.set(cacheKey, { data: result, ts: Date.now() });
        inFlight.delete(cacheKey);
        return result;
      }).catch((err) => {
        inFlight.delete(cacheKey);
        throw err;
      });
      inFlight.set(cacheKey, promise);
    }

    const result = await promise;
    const filtered = applyStatusFilter(result.projects, statusFilter);
    return NextResponse.json({ stats: result.stats, projects: filtered });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch project tracker data');
    return NextResponse.json({ error: 'Failed to fetch project tracker data' }, { status: 500 });
  }
});

function applyStatusFilter(
  projects: unknown[],
  statusFilter: string | null
): unknown[] {
  type P = { status: string; overallProgress: number; buildings: { hasBlocked: boolean }[] };
  const ps = projects as P[];
  if (statusFilter === 'active') return ps.filter((p) => p.status === 'Active');
  if (statusFilter === 'in_progress') return ps.filter((p) => p.overallProgress > 0 && p.overallProgress < 100);
  if (statusFilter === 'completed') return ps.filter((p) => p.overallProgress === 100);
  if (statusFilter === 'blocked') return ps.filter((p) => p.status === 'On Hold' || p.buildings.some((b) => b.hasBlocked));
  return ps;
}
