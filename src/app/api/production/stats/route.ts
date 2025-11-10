import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const buildingId = searchParams.get('buildingId');
    const period = searchParams.get('period') || 'all';

    // Build where clause for filters
    const whereClause: any = {};
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }
    if (buildingId && buildingId !== 'all') {
      whereClause.buildingId = buildingId;
    }

    // Get parts stats
    const totalParts = await prisma.assemblyPart.count({ where: whereClause });
    const completedParts = await prisma.assemblyPart.count({
      where: { ...whereClause, status: 'Completed' },
    });
    const inProgressParts = await prisma.assemblyPart.count({
      where: { ...whereClause, status: 'In Progress' },
    });
    const pendingParts = await prisma.assemblyPart.count({
      where: { ...whereClause, status: 'Pending' },
    });

    // Build date filter for logs
    let dateFilter: any = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        dateFilter = { gte: startOfDay };
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        dateFilter = { gte: startOfWeek };
        break;
      case 'month':
        const startOfMonth = new Date(now);
        startOfMonth.setDate(now.getDate() - 30);
        dateFilter = { gte: startOfMonth };
        break;
      case 'year':
        const startOfYear = new Date(now);
        startOfYear.setFullYear(now.getFullYear() - 1);
        dateFilter = { gte: startOfYear };
        break;
      default:
        dateFilter = {};
    }

    // Get logs with filters
    const logsWhereClause: any = {};
    if (Object.keys(dateFilter).length > 0) {
      logsWhereClause.createdAt = dateFilter;
    }
    if (projectId && projectId !== 'all') {
      logsWhereClause.assemblyPart = { projectId };
    }
    if (buildingId && buildingId !== 'all') {
      logsWhereClause.assemblyPart = { 
        ...logsWhereClause.assemblyPart,
        buildingId 
      };
    }

    const totalLogs = await prisma.productionLog.count({ where: logsWhereClause });
    
    const totalProcessedQty = await prisma.productionLog.aggregate({
      where: logsWhereClause,
      _sum: {
        processedQty: true,
      },
    });

    // Get contractual tonnage and planned dates from projects
    let contractualTonnage = 0;
    let projectPlanning: any = null;

    if (projectId && projectId !== 'all') {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          contractualTonnage: true,
          plannedStartDate: true,
          plannedEndDate: true,
        },
      });
      if (project) {
        contractualTonnage = Number(project.contractualTonnage) || 0;
        projectPlanning = {
          plannedStartDate: project.plannedStartDate,
          plannedEndDate: project.plannedEndDate,
        };
      }

      // Get phase-specific planning from ProjectPlan
      const phasePlans = await prisma.projectPlan.findMany({
        where: { projectId },
        select: {
          phase: true,
          plannedStart: true,
          plannedEnd: true,
          status: true,
          progress: true,
        },
        orderBy: { plannedStart: 'asc' },
      });

      if (phasePlans.length > 0) {
        projectPlanning.phases = phasePlans;
      }

      // Get actual start date (first production log date)
      const firstLog = await prisma.productionLog.findFirst({
        where: logsWhereClause,
        orderBy: { dateProcessed: 'asc' },
        select: { dateProcessed: true },
      });
      
      if (firstLog) {
        projectPlanning.actualStartDate = firstLog.dateProcessed;
      }

      // Get actual end date (when completion reaches 100%)
      // Check if all parts are completed
      const allCompleted = totalParts > 0 && completedParts === totalParts;
      if (allCompleted) {
        // Get the date of the last production log
        const lastLog = await prisma.productionLog.findFirst({
          where: logsWhereClause,
          orderBy: { dateProcessed: 'desc' },
          select: { dateProcessed: true },
        });
        
        if (lastLog) {
          projectPlanning.actualEndDate = lastLog.dateProcessed;
        }
      }
    } else {
      // Sum all projects if no specific project selected
      const allProjects = await prisma.project.findMany({
        select: {
          contractualTonnage: true,
        },
      });
      contractualTonnage = allProjects.reduce((sum, proj) => 
        sum + (Number(proj.contractualTonnage) || 0), 0
      );
    }

    // Calculate engineering tonnage from assembly parts (sum of netWeightTotal)
    const engineeringTonnageResult = await prisma.assemblyPart.aggregate({
      where: whereClause,
      _sum: {
        netWeightTotal: true,
      },
    });
    const engineeringTonnage = (Number(engineeringTonnageResult._sum.netWeightTotal) || 0) / 1000; // Convert kg to tons

    // Get process breakdown with tonnage
    const processCounts = await prisma.productionLog.groupBy({
      by: ['processType'],
      where: logsWhereClause,
      _count: {
        id: true,
      },
      _sum: {
        processedQty: true,
      },
    });

    // Calculate processed tonnage per process
    // We need to get the weight for each processed part
    const processLogsWithWeight = await prisma.productionLog.findMany({
      where: logsWhereClause,
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

    // Group by process and calculate tonnage
    const processTonnage = processLogsWithWeight.reduce((acc: any, log) => {
      const processType = log.processType;
      const weight = Number(log.assemblyPart.singlePartWeight) || 0;
      const tonnage = (weight * log.processedQty) / 1000; // Convert kg to tons

      if (!acc[processType]) {
        acc[processType] = 0;
      }
      acc[processType] += tonnage;

      return acc;
    }, {});

    // Calculate total tonnage available (from parts)
    const totalAvailableTonnage = await prisma.assemblyPart.aggregate({
      where: whereClause,
      _sum: {
        netWeightTotal: true,
      },
    });
    const totalTonnage = (Number(totalAvailableTonnage._sum.netWeightTotal) || 0) / 1000; // Convert kg to tons

    // Merge process counts with tonnage and completion %
    const processData = processCounts.map(process => {
      const processedTonnage = processTonnage[process.processType] || 0;
      const completionPercentage = totalTonnage > 0 ? ((processedTonnage / totalTonnage) * 100).toFixed(1) : '0';
      
      return {
        processType: process.processType,
        count: process._count.id,
        totalQty: process._sum.processedQty || 0,
        tonnage: processedTonnage,
        completionPercentage,
      };
    });

    // Calculate production benchmarks
    let benchmarks: any = null;
    
    if (projectId && projectId !== 'all') {
      // Get production logs for the three main processes
      const productionProcesses = ['Fit-up', 'Welding', 'Visualization'];
      const productionLogs = await prisma.productionLog.findMany({
        where: {
          ...logsWhereClause,
          processType: { in: productionProcesses },
        },
        select: {
          dateProcessed: true,
          processType: true,
          assemblyPart: {
            select: {
              netWeightTotal: true,
            },
          },
        },
      });

      if (productionLogs.length > 0) {
        // Calculate daily production rates
        const dailyProduction: { [key: string]: number } = {};
        productionLogs.forEach(log => {
          const dateKey = log.dateProcessed.toISOString().split('T')[0];
          const weight = Number(log.assemblyPart.netWeightTotal) || 0;
          dailyProduction[dateKey] = (dailyProduction[dateKey] || 0) + (weight / 1000); // Convert to tons
        });

        const dailyRates = Object.values(dailyProduction);
        const totalDaysWorked = dailyRates.length;
        const totalProduced = dailyRates.reduce((sum, rate) => sum + rate, 0);
        
        // Average Production Rate (APR) - tons per day
        const avgProductionRate = totalDaysWorked > 0 ? totalProduced / totalDaysWorked : 0;
        
        // Max Productivity per Day
        const maxProductivityPerDay = dailyRates.length > 0 ? Math.max(...dailyRates) : 0;
        
        // Balance tonnage (not produced yet)
        const avgTonnage = processData
          .filter((p: any) => productionProcesses.includes(p.processType))
          .reduce((sum: number, p: any) => sum + p.tonnage, 0) / productionProcesses.length;
        const balanceTonnage = engineeringTonnage - avgTonnage;
        
        // Expected Finish Date and Days Left
        let expectedFinishDate = null;
        let daysLeftToEnd = null;
        
        if (avgProductionRate > 0 && balanceTonnage > 0) {
          const daysNeeded = Math.ceil(balanceTonnage / avgProductionRate);
          daysLeftToEnd = daysNeeded;
          
          // Calculate expected finish date from today
          const today = new Date();
          expectedFinishDate = new Date(today);
          expectedFinishDate.setDate(today.getDate() + daysNeeded);
        }
        
        benchmarks = {
          avgProductionRate: avgProductionRate.toFixed(2),
          maxProductivityPerDay: maxProductivityPerDay.toFixed(2),
          balanceTonnage: balanceTonnage.toFixed(2),
          expectedFinishDate,
          daysLeftToEnd,
        };
      }
    }

    // Get recent activity
    const recentLogs = await prisma.productionLog.findMany({
      take: 10,
      where: logsWhereClause,
      include: {
        assemblyPart: {
          select: {
            partDesignation: true,
            name: true,
          },
        },
        createdBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      stats: {
        totalParts,
        completedParts,
        inProgressParts,
        pendingParts,
        totalLogs,
        totalProcessedQty: totalProcessedQty._sum.processedQty || 0,
        completionRate: totalParts > 0 ? ((completedParts / totalParts) * 100).toFixed(1) : '0',
        contractualTonnage: contractualTonnage,
        engineeringTonnage: engineeringTonnage,
      },
      processData,
      recentActivity: recentLogs,
      projectPlanning,
      benchmarks,
    });
  } catch (error) {
    console.error('Error fetching production stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch production stats', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
