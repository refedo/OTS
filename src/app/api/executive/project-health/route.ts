import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

type RAGStatus = 'green' | 'amber' | 'red';

function computeRAG(params: {
  daysRemaining: number | null;
  productionPct: number;
  procurementOverdue: number;
  collectionPct: number | null;
  riskCount: number;
}): RAGStatus {
  const { daysRemaining, productionPct, procurementOverdue, collectionPct, riskCount } = params;

  // Red conditions
  if (
    (daysRemaining !== null && daysRemaining < 30 && productionPct < 70) ||
    procurementOverdue > 3 ||
    (collectionPct !== null && collectionPct < 50)
  ) {
    return 'red';
  }

  // Amber conditions
  if (
    (daysRemaining !== null && daysRemaining < 60) ||
    productionPct < 70 ||
    procurementOverdue > 0 ||
    (collectionPct !== null && collectionPct < 70) ||
    riskCount > 2
  ) {
    return 'amber';
  }

  return 'green';
}

export const GET = withApiContext(async (_req: NextRequest, session) => {
  const hasAccess = await checkPermission('executive.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeProjects = await prisma.project.findMany({
      where: { status: 'Active', deletedAt: null },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        plannedEndDate: true,
        contractValue: true,
        contractualTonnage: true,
        client: { select: { name: true } },
        assemblyParts: {
          where: { deletedAt: null },
          select: { netWeightTotal: true, status: true },
        },
        tasks: {
          where: {
            mainActivity: {
              in: ['Design', 'Detailing', 'Engineering', 'Shop Drawings', 'Detailing & Design'],
            },
          },
          select: { status: true },
        },
        paymentSchedules: {
          select: { receivedAmount: true, status: true },
        },
        lcrEntries: {
          where: {
            isDeleted: false,
            neededToDate: { lt: today },
            receivingDate: null,
          },
          select: { id: true },
        },
        scopeSchedules: {
          orderBy: { endDate: 'desc' },
          take: 1,
          select: { endDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch risk events — affectedProjectIds is JSON, so filter application-side
    const allOpenRisks = await prisma.riskEvent.findMany({
      where: { resolvedAt: null },
      select: { affectedProjectIds: true, severity: true },
    });

    const projectIds = new Set(activeProjects.map(p => p.id));

    // Build per-project risk count map
    const riskCountMap = new Map<string, number>();
    for (const risk of allOpenRisks) {
      const ids = (risk.affectedProjectIds as string[]) ?? [];
      for (const pid of ids) {
        if (projectIds.has(pid)) {
          riskCountMap.set(pid, (riskCountMap.get(pid) ?? 0) + 1);
        }
      }
    }

    const rows = activeProjects.map(project => {
      const deadline = project.plannedEndDate ?? project.scopeSchedules[0]?.endDate ?? null;
      const daysRemaining = deadline
        ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Production %
      const totalWeight = project.assemblyParts.reduce(
        (sum, p) => sum + (Number(p.netWeightTotal) || 0),
        0,
      );
      const completedWeight = project.assemblyParts
        .filter(p => p.status === 'Completed')
        .reduce((sum, p) => sum + (Number(p.netWeightTotal) || 0), 0);
      const productionPct =
        totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 1000) / 10 : 0;

      // Engineering %
      const engTasks = project.tasks;
      const completedEngTasks = engTasks.filter(t =>
        ['Completed', 'Done', 'Closed', 'Approved'].includes(t.status),
      ).length;
      const engineeringPct =
        engTasks.length > 0
          ? Math.round((completedEngTasks / engTasks.length) * 1000) / 10
          : null;

      // Collection %
      const totalContractValue = Number(project.contractValue) || 0;
      const totalReceived = project.paymentSchedules.reduce(
        (sum, ps) => sum + (Number(ps.receivedAmount) || 0),
        0,
      );
      const collectionPct =
        totalContractValue > 0
          ? Math.round((totalReceived / totalContractValue) * 1000) / 10
          : null;

      // Procurement overdue
      const procurementOverdue = project.lcrEntries.length;

      // Risk count
      const riskCount = riskCountMap.get(project.id) ?? 0;

      const ragStatus = computeRAG({
        daysRemaining,
        productionPct,
        procurementOverdue,
        collectionPct,
        riskCount,
      });

      return {
        projectId: project.id,
        projectNumber: project.projectNumber,
        name: project.name,
        clientName: project.client?.name ?? '—',
        deadline: deadline?.toISOString() ?? null,
        daysRemaining,
        engineeringPct,
        productionPct,
        procurementOverdue,
        collectionPct,
        riskCount,
        ragStatus,
      };
    });

    return NextResponse.json({
      data: rows,
      meta: { generatedAt: new Date().toISOString(), count: rows.length },
    });
  } catch (error) {
    logger.error({ error }, '[Executive] Failed to fetch project health matrix');
    return NextResponse.json({ error: 'Failed to fetch project health' }, { status: 500 });
  }
});
