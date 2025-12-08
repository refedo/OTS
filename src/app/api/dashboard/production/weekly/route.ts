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
    const userRole = session.role;

    // Fetch user with role permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get last 7 days of production data
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get production logs for the last 7 days
    const productionLogs = await prisma.productionLog.findMany({
      where: {
        dateProcessed: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        assemblyPart: {
          select: {
            singlePartWeight: true,
            netWeightTotal: true,
          },
        },
      },
      orderBy: {
        dateProcessed: 'asc',
      },
    });

    // Group by date and calculate total weight per day
    const dailyProduction: { [key: string]: number } = {};
    const dailyProcesses: { [key: string]: { [process: string]: number } } = {};

    productionLogs.forEach(log => {
      const dateKey = log.dateProcessed.toISOString().split('T')[0];
      const weight = log.assemblyPart.singlePartWeight 
        ? Number(log.assemblyPart.singlePartWeight) * log.processedQty 
        : 0;

      // Total weight per day
      if (!dailyProduction[dateKey]) {
        dailyProduction[dateKey] = 0;
      }
      dailyProduction[dateKey] += weight;

      // Weight per process per day
      if (!dailyProcesses[dateKey]) {
        dailyProcesses[dateKey] = {};
      }
      if (!dailyProcesses[dateKey][log.processType]) {
        dailyProcesses[dateKey][log.processType] = 0;
      }
      dailyProcesses[dateKey][log.processType] += weight;
    });

    // Create array for last 7 days with data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      last7Days.push({
        date: dateKey,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        totalWeight: Math.round((dailyProduction[dateKey] || 0) * 100) / 100,
        processes: dailyProcesses[dateKey] || {},
      });
    }

    // Calculate totals
    const totalWeightWeek = last7Days.reduce((sum, day) => sum + day.totalWeight, 0);
    const averageDailyWeight = totalWeightWeek / 7;

    // Get process breakdown for the week
    const processBreakdown: { [process: string]: number } = {};
    productionLogs.forEach(log => {
      const weight = log.assemblyPart.singlePartWeight 
        ? Number(log.assemblyPart.singlePartWeight) * log.processedQty 
        : 0;
      
      if (!processBreakdown[log.processType]) {
        processBreakdown[log.processType] = 0;
      }
      processBreakdown[log.processType] += weight;
    });

    // Get top performing teams
    const teamPerformance: { [team: string]: number } = {};
    productionLogs.forEach(log => {
      if (log.processingTeam) {
        const weight = log.assemblyPart.singlePartWeight 
          ? Number(log.assemblyPart.singlePartWeight) * log.processedQty 
          : 0;
        
        if (!teamPerformance[log.processingTeam]) {
          teamPerformance[log.processingTeam] = 0;
        }
        teamPerformance[log.processingTeam] += weight;
      }
    });

    const topTeams = Object.entries(teamPerformance)
      .map(([team, weight]) => ({ team, weight: Math.round(weight * 100) / 100 }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    // Get QC status summary
    const qcPending = await prisma.productionLog.count({
      where: {
        dateProcessed: {
          gte: sevenDaysAgo,
        },
        qcStatus: 'Pending Inspection',
      },
    });

    const qcApproved = await prisma.productionLog.count({
      where: {
        dateProcessed: {
          gte: sevenDaysAgo,
        },
        qcStatus: 'Approved',
      },
    });

    const qcRejected = await prisma.productionLog.count({
      where: {
        dateProcessed: {
          gte: sevenDaysAgo,
        },
        qcStatus: 'Rejected',
      },
    });

    return NextResponse.json({
      dailyProduction: last7Days,
      totalWeightWeek: Math.round(totalWeightWeek * 100) / 100,
      averageDailyWeight: Math.round(averageDailyWeight * 100) / 100,
      processBreakdown: Object.entries(processBreakdown).map(([process, weight]) => ({
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

  } catch (error) {
    console.error('Error fetching weekly production:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly production' },
      { status: 500 }
    );
  }
}
