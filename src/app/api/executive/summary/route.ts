import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (req: NextRequest, session) => {
  const hasAccess = await checkPermission('executive.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Log executive access
    await prisma.systemEvent.create({
      data: {
        eventType: 'viewed',
        category: 'EXECUTIVE_ACCESS',
        eventCategory: 'EXECUTIVE_ACCESS',
        severity: 'INFO',
        title: 'Executive Command Center accessed',
        userId: session!.userId,
        userName: session!.name,
        userRole: session!.role,
      },
    });

    // ── 1. Active Projects ──────────────────────────────────────────────────
    const activeProjects = await prisma.project.findMany({
      where: { status: 'Active', deletedAt: null },
      select: {
        id: true,
        contractValue: true,
        contractualTonnage: true,
        _count: { select: { buildings: { where: { deletedAt: null } } } },
      },
    });

    const activeProjectIds = activeProjects.map(p => p.id);
    const buildingsCount = activeProjects.reduce((sum, p) => sum + p._count.buildings, 0);
    const totalContractValue = activeProjects.reduce((sum, p) => sum + (Number(p.contractValue) || 0), 0);
    const totalTonnage = activeProjects.reduce((sum, p) => sum + (Number(p.contractualTonnage) || 0), 0);

    const lastMonthActiveCount = await prisma.project.count({
      where: {
        status: 'Active',
        deletedAt: null,
        createdAt: { lte: endOfLastMonth },
      },
    });
    const activeProjectsTrend =
      lastMonthActiveCount > 0
        ? ((activeProjects.length - lastMonthActiveCount) / lastMonthActiveCount) * 100
        : 0;

    // ── 2. Production Velocity ──────────────────────────────────────────────
    const productionThisMonth = await prisma.productionLog.findMany({
      where: {
        dateProcessed: { gte: startOfMonth, lte: endOfMonth },
        assemblyPart: { projectId: { in: activeProjectIds }, deletedAt: null },
      },
      select: {
        processedQty: true,
        assemblyPart: { select: { singlePartWeight: true } },
      },
    });

    const tonnesThisMonth = productionThisMonth.reduce((sum, log) => {
      const weight = Number(log.assemblyPart.singlePartWeight) || 0;
      return sum + (log.processedQty * weight) / 1000;
    }, 0);

    const productionLastMonth = await prisma.productionLog.findMany({
      where: {
        dateProcessed: { gte: startOfLastMonth, lte: endOfLastMonth },
        assemblyPart: { projectId: { in: activeProjectIds }, deletedAt: null },
      },
      select: {
        processedQty: true,
        assemblyPart: { select: { singlePartWeight: true } },
      },
    });

    const tonnesLastMonth = productionLastMonth.reduce((sum, log) => {
      const weight = Number(log.assemblyPart.singlePartWeight) || 0;
      return sum + (log.processedQty * weight) / 1000;
    }, 0);

    const monthlyTarget = totalTonnage / 12;
    const productionPct = monthlyTarget > 0 ? (tonnesThisMonth / monthlyTarget) * 100 : 0;
    const productionTrend =
      tonnesLastMonth > 0 ? ((tonnesThisMonth - tonnesLastMonth) / tonnesLastMonth) * 100 : 0;

    // ── 3. Collection Rate ──────────────────────────────────────────────────
    const paymentSchedules = await prisma.projectPaymentSchedule.findMany({
      where: { projectId: { in: activeProjectIds } },
      select: { receivedAmount: true, status: true },
    });

    const totalReceived = paymentSchedules.reduce(
      (sum, ps) => sum + (Number(ps.receivedAmount) || 0),
      0,
    );
    const pendingSAR = totalContractValue - totalReceived;
    const collectionPct = totalContractValue > 0 ? (totalReceived / totalContractValue) * 100 : 0;

    // ── 4. Procurement Exposure ────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueLcr = await prisma.lcrEntry.findMany({
      where: {
        isDeleted: false,
        neededToDate: { lt: today },
        receivingDate: null,
      },
      select: { amount: true },
    });

    const procurementCount = overdueLcr.length;
    const procurementValue = overdueLcr.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    // ── 5. Open Risk Flags ─────────────────────────────────────────────────
    const riskEvents = await prisma.riskEvent.findMany({
      where: { resolvedAt: null },
      select: { severity: true },
    });

    const criticalCount = riskEvents.filter(r => r.severity === 'CRITICAL').length;
    const warningCount = riskEvents.filter(
      r => r.severity === 'HIGH' || r.severity === 'MEDIUM',
    ).length;

    return NextResponse.json({
      data: {
        activeProjects: {
          count: activeProjects.length,
          buildings: buildingsCount,
          tonnes: Math.round(totalTonnage * 10) / 10,
          trend: Math.round(activeProjectsTrend * 10) / 10,
        },
        productionVelocity: {
          tonnesThisMonth: Math.round(tonnesThisMonth * 10) / 10,
          monthlyTarget: Math.round(monthlyTarget * 10) / 10,
          percentage: Math.round(productionPct * 10) / 10,
          trend: Math.round(productionTrend * 10) / 10,
        },
        collectionRate: {
          percentage: Math.round(collectionPct * 10) / 10,
          pendingSAR: Math.round(pendingSAR),
          totalContracted: Math.round(totalContractValue),
          trend: 0,
        },
        procurementExposure: {
          count: procurementCount,
          estimatedValue: Math.round(procurementValue),
          trend: 0,
        },
        openRiskFlags: {
          count: riskEvents.length,
          critical: criticalCount,
          warnings: warningCount,
          trend: 0,
        },
      },
      meta: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    logger.error({ error }, '[Executive] Failed to fetch summary');
    return NextResponse.json({ error: 'Failed to fetch executive summary' }, { status: 500 });
  }
});
