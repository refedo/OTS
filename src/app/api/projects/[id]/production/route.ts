import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:projectId/production
 * Returns production progress including weight produced vs required and weekly trends
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all assembly parts for the project
    const assemblyParts = await prisma.assemblyPart.findMany({
      where: { projectId },
      select: {
        id: true,
        netWeightTotal: true,
        quantity: true,
        productionLogs: {
          select: {
            processType: true,
            processedQty: true,
            remainingQty: true,
            dateProcessed: true,
          },
          orderBy: {
            dateProcessed: 'asc',
          },
        },
      },
    });

    // Calculate total required weight (in tons)
    const requiredWeight = assemblyParts.reduce(
      (sum, part) => sum + (Number(part.netWeightTotal) || 0),
      0
    ) / 1000;

    // Calculate produced weight by process type
    const processProgress = new Map<string, number>();
    const processTypes = ['Preparation', 'Fit-up', 'Welding', 'Visualization', 'Sandblasting', 'Painting', 'Galvanization', 'Dispatch'];
    
    processTypes.forEach(type => {
      processProgress.set(type, 0);
    });

    let totalProducedWeight = 0;

    // Track weekly production for trend
    const weeklyProduction = new Map<string, number>();

    assemblyParts.forEach(part => {
      const partWeight = (Number(part.netWeightTotal) || 0) / 1000; // Convert to tons
      const partQty = part.quantity || 1;

      part.productionLogs.forEach(log => {
        const processType = log.processType;
        const current = processProgress.get(processType) || 0;

        // Calculate weight for this process
        let processedWeight = 0;
        if (log.remainingQty === 0) {
          processedWeight = partWeight;
        } else {
          const processedRatio = log.processedQty / partQty;
          processedWeight = partWeight * processedRatio;
        }

        processProgress.set(processType, current + processedWeight);

        // Track weekly production
        const weekKey = getWeekKey(log.dateProcessed);
        weeklyProduction.set(weekKey, (weeklyProduction.get(weekKey) || 0) + processedWeight);
      });

      // Get overall production (based on latest log)
      if (part.productionLogs.length > 0) {
        const latestLog = part.productionLogs[part.productionLogs.length - 1];
        if (latestLog.remainingQty === 0) {
          totalProducedWeight += partWeight;
        } else {
          const processedRatio = latestLog.processedQty / partQty;
          totalProducedWeight += partWeight * processedRatio;
        }
      }
    });

    const progressPercentage = requiredWeight > 0 ? (totalProducedWeight / requiredWeight) * 100 : 0;

    // Format weekly trend (last 12 weeks)
    const weeklyTrend = Array.from(weeklyProduction.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([week, produced]) => ({
        week,
        produced: Math.round(produced * 100) / 100,
      }));

    // Format by process
    const byProcess = processTypes.map(processType => {
      const weight = processProgress.get(processType) || 0;
      const percentage = requiredWeight > 0 ? (weight / requiredWeight) * 100 : 0;
      return {
        processType,
        weight: Math.round(weight * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
      };
    }).filter(p => p.weight > 0); // Only show processes with production

    return NextResponse.json({
      requiredWeight: Math.round(requiredWeight * 100) / 100,
      producedWeight: Math.round(totalProducedWeight * 100) / 100,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      weeklyTrend,
      byProcess,
    });
  } catch (error) {
    console.error('Error fetching production data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production data' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get week key in format YYYY-Www
 */
function getWeekKey(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}
