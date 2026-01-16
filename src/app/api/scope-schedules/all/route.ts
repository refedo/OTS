import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// Calculate progress for each scope type
async function calculateProgress(schedule: any): Promise<number> {
  const { scopeType, buildingId, projectId } = schedule;

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

      // Calculate progress for each process
      const processes = ['Fit-up', 'Welding', 'Visualization'];
      const processProgress = processes.map(processType => {
        const processedQty = parts.reduce((sum, part) => {
          const logs = part.productionLogs.filter(log => log.processType === processType);
          const partProcessed = logs.reduce((s, log) => s + (log.processedQty || 0), 0);
          return sum + Math.min(partProcessed, part.quantity || 0);
        }, 0);
        return (processedQty / totalQuantity) * 100;
      });

      // Return average of the 3 processes
      return processProgress.reduce((sum, p) => sum + p, 0) / processes.length;
    }

    // For painting: check painting process in production logs
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

    // For galvanization: check galvanization process in production logs
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

    // For design and shop drawing: check document timeline
    if (scopeType === 'design' || scopeType === 'shopDrawing') {
      const documentType = scopeType === 'design' ? 'Design' : 'Shop Drawing';
      
      // Get all document submissions for this building and type
      const documents = await prisma.documentSubmission.findMany({
        where: {
          buildingId,
          documentType,
        },
        include: {
          revisions: {
            orderBy: { submissionDate: 'desc' },
            take: 1,
            select: {
              revision: true,
              clientResponse: true,
            }
          }
        }
      });

      if (documents.length === 0) return 0;

      // Count documents with approved latest revision
      const approvedDocs = documents.filter(doc => {
        const latestRevision = doc.revisions[0];
        return latestRevision && latestRevision.clientResponse === 'Approved';
      });

      return (approvedDocs.length / documents.length) * 100;
    }

    // For other scopes, return 0 for now
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get('buildingId');
    const projectId = searchParams.get('projectId');
    const scopeType = searchParams.get('scopeType');

    // Build where clause
    const whereClause: any = {};
    if (buildingId) {
      whereClause.buildingId = buildingId;
    }
    if (projectId) {
      whereClause.projectId = projectId;
    }
    if (scopeType) {
      whereClause.scopeType = scopeType;
    }

    const scopeSchedules = await prisma.scopeSchedule.findMany({
      where: whereClause,
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
        startDate: 'asc',
      },
    });

    // Calculate progress for each schedule
    const schedulesWithProgress = await Promise.all(
      scopeSchedules.map(async (schedule) => {
        const progress = await calculateProgress(schedule);
        return {
          ...schedule,
          progress: Math.round(progress * 10) / 10, // Round to 1 decimal place
        };
      })
    );

    return NextResponse.json(schedulesWithProgress);
  } catch (error) {
    console.error('Error fetching scope schedules:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch scope schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
