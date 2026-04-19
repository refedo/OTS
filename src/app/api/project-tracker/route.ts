import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { TRACKER_COLUMNS, computeActivityProgress } from '@/lib/services/project-tracker.service';

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
              const w =
                Number(p.netWeightTotal ?? 0) > 0
                  ? Number(p.netWeightTotal)
                  : Number(p.singlePartWeight ?? 0) * (p.quantity ?? 1);
              return sum + w;
            }, 0);

            if (rawTotalKg === 0) {
              const projectParts = await prisma.assemblyPart.findMany({
                where: { projectId: project.id, buildingId: null, deletedAt: null },
                select: { netWeightTotal: true, singlePartWeight: true, quantity: true },
              });
              rawTotalKg = projectParts.reduce((sum, p) => {
                const w =
                  Number(p.netWeightTotal ?? 0) > 0
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
              scopes: [
                {
                  id: `${building.id}-default`,
                  scopeType: 'steel',
                  scopeLabel: 'Steel',
                  activities,
                },
              ],
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
            ? Math.round(
                allBuildingProgress.reduce((a, b) => a + b, 0) / allBuildingProgress.length
              )
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
    if (statusFilter === 'active') {
      filtered = trackerData.filter((p) => p.status === 'Active');
    } else if (statusFilter === 'in_progress') {
      filtered = trackerData.filter((p) => p.overallProgress > 0 && p.overallProgress < 100);
    } else if (statusFilter === 'completed') {
      filtered = trackerData.filter((p) => p.overallProgress === 100);
    } else if (statusFilter === 'blocked') {
      filtered = trackerData.filter(
        (p) => p.status === 'On Hold' || p.buildings.some((b) => b.hasBlocked)
      );
    }

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
