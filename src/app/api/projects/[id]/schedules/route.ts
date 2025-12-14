import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// Calculate progress for each scope type
async function calculateProgress(buildingId: string, scopeType: string): Promise<number> {
  try {
    // For fabrication: average of fit-up, welding, visualization
    if (scopeType === 'fabrication') {
      const parts = await prisma.assemblyPart.findMany({
        where: { buildingId },
        select: { 
          id: true, 
          quantity: true,
          productionLogs: {
            select: {
              processType: true,
              processedQty: true,
            }
          }
        },
      });

      if (parts.length === 0) return 0;

      const totalQuantity = parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
      if (totalQuantity === 0) return 0;

      const processes = ['Fit-up', 'Welding', 'Visualization'];
      const processProgress = processes.map(processType => {
        const processedQty = parts.reduce((sum, part) => {
          const logs = part.productionLogs.filter(log => log.processType === processType);
          const partProcessed = logs.reduce((s, log) => s + (log.processedQty || 0), 0);
          return sum + Math.min(partProcessed, part.quantity || 0);
        }, 0);
        return (processedQty / totalQuantity) * 100;
      });

      return processProgress.reduce((sum, p) => sum + p, 0) / processes.length;
    }

    // For painting
    if (scopeType === 'painting') {
      const parts = await prisma.assemblyPart.findMany({
        where: { buildingId },
        select: { 
          id: true, 
          quantity: true,
          productionLogs: {
            where: { processType: 'Painting' },
            select: { processedQty: true }
          }
        },
      });

      if (parts.length === 0) return 0;

      const totalQuantity = parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
      if (totalQuantity === 0) return 0;

      const processedQty = parts.reduce((sum, part) => {
        const partProcessed = part.productionLogs.reduce((s, log) => s + (log.processedQty || 0), 0);
        return sum + Math.min(partProcessed, part.quantity || 0);
      }, 0);

      return (processedQty / totalQuantity) * 100;
    }

    // For galvanization
    if (scopeType === 'galvanization') {
      const parts = await prisma.assemblyPart.findMany({
        where: { buildingId },
        select: { 
          id: true, 
          quantity: true,
          productionLogs: {
            where: { processType: 'Galvanization' },
            select: { processedQty: true }
          }
        },
      });

      if (parts.length === 0) return 0;

      const totalQuantity = parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
      if (totalQuantity === 0) return 0;

      const processedQty = parts.reduce((sum, part) => {
        const partProcessed = part.productionLogs.reduce((s, log) => s + (log.processedQty || 0), 0);
        return sum + Math.min(partProcessed, part.quantity || 0);
      }, 0);

      return (processedQty / totalQuantity) * 100;
    }

    // For design and shop drawing - use DocumentSubmission model
    if (scopeType === 'design' || scopeType === 'shopDrawing') {
      const documentType = scopeType === 'design' ? 'Design' : 'Shop Drawing';
      
      const submissions = await prisma.documentSubmission.findMany({
        where: {
          buildingId,
          documentType,
        },
        include: {
          revisions: {
            orderBy: { revision: 'desc' },
            take: 1,
            select: {
              revision: true,
              clientResponse: true,
            }
          }
        }
      });

      if (submissions.length === 0) return 0;

      const approvedDocs = submissions.filter(doc => {
        const latestRevision = doc.revisions[0];
        const response = latestRevision?.clientResponse || doc.clientResponse;
        return response === 'Approved' || response === 'Approved with Comments';
      });

      return (approvedDocs.length / submissions.length) * 100;
    }

    return 0;
  } catch (error) {
    console.error(`Error calculating progress for ${scopeType}:`, error);
    return 0;
  }
}

// GET - Get all scope schedules for a project with calculated progress
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const now = new Date();

    // Get all scope schedules for the project
    const scopeSchedules = await prisma.scopeSchedule.findMany({
      where: { projectId },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
      orderBy: [
        { scopeType: 'asc' },
        { startDate: 'asc' },
      ],
    });

    // Calculate progress for each schedule
    const schedulesWithProgress = await Promise.all(
      scopeSchedules.map(async (schedule) => {
        const progress = await calculateProgress(schedule.buildingId, schedule.scopeType);
        
        const start = new Date(schedule.startDate);
        const end = new Date(schedule.endDate);
        
        // Calculate time elapsed percentage
        const totalDuration = end.getTime() - start.getTime();
        const elapsed = Math.max(0, now.getTime() - start.getTime());
        const timeElapsedPercent = Math.min(100, (elapsed / totalDuration) * 100);
        
        // Determine status
        let status: 'not-started' | 'on-track' | 'at-risk' | 'critical' | 'completed' = 'not-started';
        
        if (progress >= 100) {
          status = 'completed';
        } else if (now < start) {
          status = 'not-started';
        } else if (now > end && progress < 100) {
          status = 'critical';
        } else {
          const progressGap = timeElapsedPercent - progress;
          if (progressGap > 20) {
            status = 'critical';
          } else if (progressGap > 10) {
            status = 'at-risk';
          } else {
            status = 'on-track';
          }
        }

        const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const daysOverdue = now > end ? Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          id: schedule.id,
          scopeType: schedule.scopeType,
          scopeLabel: schedule.scopeLabel,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          building: schedule.building,
          progress: Math.round(progress * 10) / 10,
          expectedProgress: Math.round(Math.max(0, Math.min(100, timeElapsedPercent)) * 10) / 10,
          status,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          daysOverdue,
        };
      })
    );

    // Group by scope type for summary
    const scopeTypes = [...new Set(schedulesWithProgress.map(s => s.scopeType))];
    const summary = scopeTypes.map(scopeType => {
      const typeSchedules = schedulesWithProgress.filter(s => s.scopeType === scopeType);
      const avgProgress = typeSchedules.reduce((sum, s) => sum + s.progress, 0) / typeSchedules.length;
      const avgExpected = typeSchedules.reduce((sum, s) => sum + s.expectedProgress, 0) / typeSchedules.length;
      
      // Determine overall status for this scope type
      const hasCompleted = typeSchedules.every(s => s.status === 'completed');
      const hasCritical = typeSchedules.some(s => s.status === 'critical');
      const hasAtRisk = typeSchedules.some(s => s.status === 'at-risk');
      
      let overallStatus: 'completed' | 'critical' | 'at-risk' | 'on-track' | 'not-started' = 'on-track';
      if (hasCompleted) overallStatus = 'completed';
      else if (hasCritical) overallStatus = 'critical';
      else if (hasAtRisk) overallStatus = 'at-risk';
      else if (typeSchedules.every(s => s.status === 'not-started')) overallStatus = 'not-started';

      return {
        scopeType,
        scopeLabel: typeSchedules[0]?.scopeLabel || scopeType,
        buildingCount: typeSchedules.length,
        avgProgress: Math.round(avgProgress * 10) / 10,
        avgExpectedProgress: Math.round(avgExpected * 10) / 10,
        status: overallStatus,
        buildings: typeSchedules.map(s => ({
          id: s.building.id,
          name: s.building.name,
          designation: s.building.designation,
          progress: s.progress,
          expectedProgress: s.expectedProgress,
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate,
          daysRemaining: s.daysRemaining,
          daysOverdue: s.daysOverdue,
        })),
      };
    });

    // Calculate overall project progress
    const totalSchedules = schedulesWithProgress.length;
    const overallProgress = totalSchedules > 0 
      ? Math.round((schedulesWithProgress.reduce((sum, s) => sum + s.progress, 0) / totalSchedules) * 10) / 10
      : 0;

    return NextResponse.json({
      schedules: schedulesWithProgress,
      summary,
      stats: {
        totalActivities: totalSchedules,
        completed: schedulesWithProgress.filter(s => s.status === 'completed').length,
        onTrack: schedulesWithProgress.filter(s => s.status === 'on-track').length,
        atRisk: schedulesWithProgress.filter(s => s.status === 'at-risk').length,
        critical: schedulesWithProgress.filter(s => s.status === 'critical').length,
        notStarted: schedulesWithProgress.filter(s => s.status === 'not-started').length,
        overallProgress,
      },
    });
  } catch (error) {
    console.error('Error fetching project schedules:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch project schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
