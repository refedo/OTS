import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// Helper function to get days in a month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Helper function to calculate days in a date range within a specific month
function getDaysInMonthForRange(startDate: Date, endDate: Date, year: number, month: number): number {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  const rangeStart = startDate > monthStart ? startDate : monthStart;
  const rangeEnd = endDate < monthEnd ? endDate : monthEnd;
  
  if (rangeStart > monthEnd || rangeEnd < monthStart) {
    return 0;
  }
  
  const diffTime = rangeEnd.getTime() - rangeStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return diffDays;
}

// Helper function to get total days between two dates
function getTotalDays(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // Format: YYYY-MM
    const projectId = searchParams.get('projectId');

    if (!monthParam) {
      return NextResponse.json({ error: 'Month parameter is required (format: YYYY-MM)' }, { status: 400 });
    }

    const [year, month] = monthParam.split('-').map(Number);
    const targetMonth = month - 1; // JavaScript months are 0-indexed

    // Calculate month boundaries for filtering
    const monthStart = new Date(year, targetMonth, 1);
    const monthEnd = new Date(year, targetMonth + 1, 0); // Last day of the month

    // Build where clause - filter buildings with fabrication schedules that overlap with selected month
    const whereClause: any = {
      scopeSchedules: {
        some: {
          scopeType: 'fabrication',
          // Fabrication schedule must overlap with the selected month
          startDate: { lte: monthEnd },
          endDate: { gte: monthStart },
        },
      },
    };
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }

    // Get buildings with fabrication schedules that fall within the selected month
    const buildings = await prisma.building.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        scopeSchedules: {
          where: {
            scopeType: 'fabrication',
            // Only include schedules that overlap with the selected month
            startDate: { lte: monthEnd },
            endDate: { gte: monthStart },
          },
          select: {
            startDate: true,
            endDate: true,
          },
        },
        assemblyParts: {
          select: {
            netWeightTotal: true,
          },
        },
      },
    });

    // Calculate production data for each building
    const reportData: any[] = [];
    let monthlyTarget = 0;
    let monthlyTargetWithBL = 0;

    for (const building of buildings) {
      const fabricationSchedule = building.scopeSchedules[0];
      
      if (!fabricationSchedule) {
        continue; // Skip buildings without fabrication schedule
      }

      const startDate = new Date(fabricationSchedule.startDate);
      const endDate = new Date(fabricationSchedule.endDate);

      // Calculate building weight (total tonnage from assembly parts)
      const buildingWeight = building.assemblyParts.reduce((sum, part) => {
        return sum + (Number(part.netWeightTotal) || 0);
      }, 0) / 1000; // Convert kg to tons

      if (buildingWeight === 0) {
        continue; // Skip buildings with no weight
      }

      // Get produced tonnage (average of Fit-up, Welding, Visualization)
      const productionProcesses = ['Fit-up', 'Welding', 'Visualization'];
      const productionLogs = await prisma.productionLog.findMany({
        where: {
          processType: { in: productionProcesses },
          assemblyPart: {
            buildingId: building.id,
          },
        },
        select: {
          processType: true,
          processedQty: true,
          assemblyPart: {
            select: {
              singlePartWeight: true,
            },
          },
        },
      });

      // Calculate tonnage per process
      const processTonnage: { [key: string]: number } = {};
      productionLogs.forEach(log => {
        const weight = Number(log.assemblyPart.singlePartWeight) || 0;
        const tonnage = (weight * log.processedQty) / 1000;
        processTonnage[log.processType] = (processTonnage[log.processType] || 0) + tonnage;
      });

      // Average of the three processes
      const producedTonnage = productionProcesses.reduce((sum, process) => {
        return sum + (processTonnage[process] || 0);
      }, 0) / productionProcesses.length;

      // Calculate planned progress based on time elapsed
      const now = new Date();
      const totalDays = getTotalDays(startDate, endDate);
      let elapsedDays = 0;
      
      if (now >= endDate) {
        elapsedDays = totalDays;
      } else if (now > startDate) {
        elapsedDays = getTotalDays(startDate, now);
      }
      
      const plannedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;

      // Calculate declared progress (actual production)
      const declaredProgress = buildingWeight > 0 ? (producedTonnage / buildingWeight) * 100 : 0;

      // Calculate quota for the selected month
      const daysInSelectedMonth = getDaysInMonthForRange(startDate, endDate, year, targetMonth);
      const quota = totalDays > 0 ? (daysInSelectedMonth / totalDays) * buildingWeight : 0;

      // Calculate back log (accumulated shortfall from previous months)
      let backLog = 0;
      
      // Only calculate backlog if the selected month is after the start date
      const selectedMonthStart = new Date(year, targetMonth, 1);
      if (selectedMonthStart > startDate) {
        // Calculate total quota up to the end of the previous month
        let totalQuotaUpToPrevMonth = 0;
        
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();
        
        // Iterate through all months from start to the month before selected
        let currentYear = startYear;
        let currentMonth = startMonth;
        
        while (currentYear < year || (currentYear === year && currentMonth < targetMonth)) {
          const daysInMonth = getDaysInMonthForRange(startDate, endDate, currentYear, currentMonth);
          const monthQuota = totalDays > 0 ? (daysInMonth / totalDays) * buildingWeight : 0;
          totalQuotaUpToPrevMonth += monthQuota;
          
          currentMonth++;
          if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
          }
        }
        
        // Back log = Total quota up to previous month - Produced tonnage
        backLog = Math.max(0, totalQuotaUpToPrevMonth - producedTonnage);
      }

      const quotaWithBackLog = quota + backLog;

      // Add to monthly targets
      monthlyTarget += quota;
      monthlyTargetWithBL += quotaWithBackLog;

      reportData.push({
        projectNumber: building.project.projectNumber,
        projectName: building.project.name,
        buildingDesignation: building.designation,
        buildingName: building.name,
        buildingWeight: Number(buildingWeight.toFixed(2)),
        produced: Number(producedTonnage.toFixed(2)),
        plannedProgress: Number(plannedProgress.toFixed(1)),
        declaredProgress: Number(declaredProgress.toFixed(1)),
        quota: Number(quota.toFixed(2)),
        quotaWithBackLog: Number(quotaWithBackLog.toFixed(2)),
        startDate: fabricationSchedule.startDate,
        endDate: fabricationSchedule.endDate,
      });
    }

    // Sort by project number and building designation
    reportData.sort((a, b) => {
      const projectCompare = a.projectNumber.localeCompare(b.projectNumber);
      if (projectCompare !== 0) return projectCompare;
      return a.buildingDesignation.localeCompare(b.buildingDesignation);
    });

    return NextResponse.json({
      month: monthParam,
      monthlyTarget: Number(monthlyTarget.toFixed(1)),
      monthlyTargetWithBL: Number(monthlyTargetWithBL.toFixed(1)),
      data: reportData,
    });
  } catch (error) {
    console.error('Error generating production plan report:', error);
    return NextResponse.json({ 
      error: 'Failed to generate production plan report', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
