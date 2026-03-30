import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = session.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const period = (url.searchParams.get('period') ?? 'week') as 'day' | 'week' | 'month';

    const now = new Date();
    let startDate: Date;
    let bucketCount: number;

    if (period === 'day') {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      bucketCount = 24;
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      bucketCount = 30;
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      bucketCount = 7;
    }

    const productionLogs = await prisma.productionLog.findMany({
      where: {
        dateProcessed: { gte: startDate },
      },
      include: {
        assemblyPart: {
          select: {
            singlePartWeight: true,
            netWeightTotal: true,
          },
        },
      },
      orderBy: { dateProcessed: 'asc' },
    });

    // Group by date
    const dailyProduction: { [key: string]: number } = {};
    const dailyProcesses: { [key: string]: { [process: string]: number } } = {};
    const processBreakdownMap: { [process: string]: number } = {};
    const teamPerformance: { [team: string]: number } = {};

    productionLogs.forEach((log) => {
      const dateKey = log.dateProcessed.toISOString().split('T')[0];
      const weight = log.assemblyPart.singlePartWeight
        ? Number(log.assemblyPart.singlePartWeight) * log.processedQty
        : 0;

      dailyProduction[dateKey] = (dailyProduction[dateKey] ?? 0) + weight;

      if (!dailyProcesses[dateKey]) dailyProcesses[dateKey] = {};
      dailyProcesses[dateKey][log.processType] =
        (dailyProcesses[dateKey][log.processType] ?? 0) + weight;

      processBreakdownMap[log.processType] = (processBreakdownMap[log.processType] ?? 0) + weight;

      if (log.processingTeam) {
        teamPerformance[log.processingTeam] = (teamPerformance[log.processingTeam] ?? 0) + weight;
      }
    });

    // Build buckets for the period
    const periodData = [];
    for (let i = bucketCount - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      periodData.push({
        date: dateKey,
        dayName:
          period === 'month'
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : date.toLocaleDateString('en-US', { weekday: 'short' }),
        totalWeight: Math.round((dailyProduction[dateKey] ?? 0) * 100) / 100,
        processes: dailyProcesses[dateKey] ?? {},
      });
    }

    const totalWeight = periodData.reduce((sum, d) => sum + d.totalWeight, 0);
    const averageDailyWeight = totalWeight / bucketCount;

    const topTeams = Object.entries(teamPerformance)
      .map(([team, weight]) => ({ team, weight: Math.round(weight * 100) / 100 }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    const [qcPending, qcApproved, qcRejected] = await Promise.all([
      prisma.productionLog.count({
        where: { dateProcessed: { gte: startDate }, qcStatus: 'Pending Inspection' },
      }),
      prisma.productionLog.count({
        where: { dateProcessed: { gte: startDate }, qcStatus: 'Approved' },
      }),
      prisma.productionLog.count({
        where: { dateProcessed: { gte: startDate }, qcStatus: 'Rejected' },
      }),
    ]);

    return NextResponse.json({
      dailyProduction: periodData,
      totalWeightWeek: Math.round(totalWeight * 100) / 100,
      averageDailyWeight: Math.round(averageDailyWeight * 100) / 100,
      period,
      processBreakdown: Object.entries(processBreakdownMap).map(([process, weight]) => ({
        process,
        weight: Math.round(weight * 100) / 100,
      })),
      topTeams,
      qcStatus: {
        pending: qcPending,
        approved: qcApproved,
        rejected: qcRejected,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch production data' }, { status: 500 });
  }
}
