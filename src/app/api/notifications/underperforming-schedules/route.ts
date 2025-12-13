import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// Calculate progress for each scope type
async function calculateProgress(schedule: any): Promise<number> {
  const { scopeType, buildingId } = schedule;

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

    // For design and shop drawing - use DocumentSubmission model which has buildingId
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
        // Check latest revision or the submission's own clientResponse
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

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Get all scope schedules
    const scopeSchedules = await prisma.scopeSchedule.findMany({
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        building: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });

    // Calculate progress and filter underperforming schedules
    const underperformingSchedules = [];

    for (const schedule of scopeSchedules) {
      const progress = await calculateProgress(schedule);
      
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      
      // Calculate time elapsed percentage
      const totalDuration = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      const timeElapsedPercent = (elapsed / totalDuration) * 100;
      
      // Calculate expected progress
      const progressGap = timeElapsedPercent - progress;
      
      let status: 'critical' | 'at-risk' | null = null;
      
      // If past deadline and not 100% complete
      if (now > end && progress < 100) {
        status = 'critical';
      }
      // If progress is significantly behind schedule (>20% gap)
      else if (progressGap > 20) {
        status = 'critical';
      }
      // If progress is moderately behind schedule (10-20% gap)
      else if (progressGap > 10) {
        status = 'at-risk';
      }
      
      // Only include underperforming schedules
      if (status) {
        const daysOverdue = now > end ? Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        underperformingSchedules.push({
          id: schedule.id,
          scopeType: schedule.scopeType,
          scopeLabel: schedule.scopeLabel,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          progress: Math.round(progress * 10) / 10,
          expectedProgress: Math.round(Math.max(0, Math.min(100, timeElapsedPercent)) * 10) / 10,
          progressGap: Math.round(progressGap * 10) / 10,
          status,
          daysOverdue,
          project: schedule.project,
          building: schedule.building,
        });
      }
    }

    return NextResponse.json({
      schedules: underperformingSchedules,
      total: underperformingSchedules.length,
      critical: underperformingSchedules.filter(s => s.status === 'critical').length,
      atRisk: underperformingSchedules.filter(s => s.status === 'at-risk').length,
    });
  } catch (error) {
    console.error('Error fetching underperforming schedules:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch underperforming schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
