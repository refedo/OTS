import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const GET = withApiContext(async (_req: NextRequest, _session) => {
  const hasAccess = await checkPermission('executive.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const thirtyDaysOut = new Date(now);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const thirtyDaysBack = new Date(now);
    thirtyDaysBack.setDate(thirtyDaysBack.getDate() - 30);

    // ── This month cash in (collected) ────────────────────────────────────
    const collectedThisMonth = await prisma.projectPaymentSchedule.findMany({
      where: {
        status: 'received',
        updatedAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { receivedAmount: true },
    });
    const cashInThisMonth = collectedThisMonth.reduce(
      (sum, ps) => sum + (Number(ps.receivedAmount) || 0),
      0,
    );

    // ── This month cash out (LCR buying date) ─────────────────────────────
    const lcrPaidThisMonth = await prisma.lcrEntry.findMany({
      where: {
        isDeleted: false,
        buyingDate: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { amount: true },
    });
    const cashOutThisMonth = lcrPaidThisMonth.reduce(
      (sum, l) => sum + (Number(l.amount) || 0),
      0,
    );

    // ── Next 30 days projected collections ────────────────────────────────
    const upcomingCollectionsDetailed = await prisma.projectPaymentSchedule.findMany({
      where: {
        status: { in: ['pending', 'invoiced'] },
        dueDate: { gte: now, lte: thirtyDaysOut },
      },
      select: {
        id: true,
        dueDate: true,
        receivedAmount: true,
        paymentSlot: true,
        project: {
          select: {
            contractValue: true,
            downPaymentPercentage: true,
            payment2Percentage: true,
            payment3Percentage: true,
            payment4Percentage: true,
            payment5Percentage: true,
            payment6Percentage: true,
          },
        },
      },
    });

    // Compute projected amount per schedule entry
    const projectedIn = upcomingCollectionsDetailed.reduce((sum, ps) => {
      const cv = Number(ps.project.contractValue) || 0;
      // Try to map paymentSlot to a percentage
      const slotPctMap: Record<string, number | null> = {
        downPayment: Number(ps.project.downPaymentPercentage) || 0,
        payment2: Number(ps.project.payment2Percentage) || 0,
        payment3: Number(ps.project.payment3Percentage) || 0,
        payment4: Number(ps.project.payment4Percentage) || 0,
        payment5: Number(ps.project.payment5Percentage) || 0,
        payment6: Number(ps.project.payment6Percentage) || 0,
      };
      const pct = slotPctMap[ps.paymentSlot] ?? 0;
      return sum + (cv * pct) / 100;
    }, 0);

    // ── Next 30 days projected payables (LCR neededToDate) ────────────────
    const upcomingPayables = await prisma.lcrEntry.findMany({
      where: {
        isDeleted: false,
        receivingDate: null,
        neededToDate: { gte: now, lte: thirtyDaysOut },
      },
      select: { amount: true },
    });
    const projectedOut = upcomingPayables.reduce(
      (sum, l) => sum + (Number(l.amount) || 0),
      0,
    );

    // ── 30-day production trend by week ───────────────────────────────────
    const productionLogs30d = await prisma.productionLog.findMany({
      where: {
        dateProcessed: { gte: thirtyDaysBack, lte: now },
        assemblyPart: { deletedAt: null },
      },
      select: {
        dateProcessed: true,
        processedQty: true,
        assemblyPart: { select: { singlePartWeight: true, projectId: true } },
      },
      orderBy: { dateProcessed: 'asc' },
    });

    // Group by ISO week
    const weeklyMap = new Map<string, { tonnes: number; weekStart: Date }>();
    for (const log of productionLogs30d) {
      const ws = startOfWeek(log.dateProcessed);
      const key = ws.toISOString().slice(0, 10);
      const weight = Number(log.assemblyPart.singlePartWeight) || 0;
      const tonnes = (log.processedQty * weight) / 1000;
      const existing = weeklyMap.get(key);
      if (existing) {
        existing.tonnes += tonnes;
      } else {
        weeklyMap.set(key, { tonnes, weekStart: ws });
      }
    }

    const weeklyTrend = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, { tonnes }]) => ({
        week,
        tonnes: Math.round(tonnes * 10) / 10,
      }));

    // ── Top 3 projects this week ───────────────────────────────────────────
    const thisWeekStart = startOfWeek(now);
    const thisWeekLogs = productionLogs30d.filter(
      l => l.dateProcessed >= thisWeekStart,
    );

    const projectTonnesThisWeek = new Map<string, number>();
    for (const log of thisWeekLogs) {
      const pid = log.assemblyPart.projectId;
      const weight = Number(log.assemblyPart.singlePartWeight) || 0;
      const tonnes = (log.processedQty * weight) / 1000;
      projectTonnesThisWeek.set(pid, (projectTonnesThisWeek.get(pid) ?? 0) + tonnes);
    }

    const topProjectIds = Array.from(projectTonnesThisWeek.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id]) => id);

    const topProjects =
      topProjectIds.length > 0
        ? await prisma.project.findMany({
            where: { id: { in: topProjectIds } },
            select: { id: true, projectNumber: true, name: true },
          })
        : [];

    const topProjectsRanked = topProjectIds.map(pid => {
      const project = topProjects.find(p => p.id === pid);
      return {
        projectId: pid,
        projectNumber: project?.projectNumber ?? '—',
        name: project?.name ?? '—',
        tonnesThisWeek: Math.round((projectTonnesThisWeek.get(pid) ?? 0) * 10) / 10,
      };
    });

    return NextResponse.json({
      data: {
        thisMonth: {
          cashIn: Math.round(cashInThisMonth),
          cashOut: Math.round(cashOutThisMonth),
          net: Math.round(cashInThisMonth - cashOutThisMonth),
        },
        next30Days: {
          projectedIn: Math.round(projectedIn),
          projectedOut: Math.round(projectedOut),
          netPosition: Math.round(projectedIn - projectedOut),
        },
        weeklyTrend,
        topProjectsThisWeek: topProjectsRanked,
      },
      meta: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    logger.error({ error }, '[Executive] Failed to fetch cashflow snapshot');
    return NextResponse.json({ error: 'Failed to fetch cashflow snapshot' }, { status: 500 });
  }
});
