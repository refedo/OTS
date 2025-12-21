import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { recalculateProductionKPIs } from '@/lib/kpi/hooks';
import { WorkTrackingValidatorService } from '@/lib/services/work-tracking-validator.service';

const productionLogSchema = z.object({
  assemblyPartId: z.string().uuid(),
  processType: z.enum([
    'Preparation',
    'Fit-up',
    'Welding',
    'Visualization',
    'Sandblasting',
    'Painting',
    'Galvanization',
    'Dispatched to Sandblasting',
    'Dispatched to Galvanization',
    'Dispatched to Painting',
    'Dispatched to Site',
    'Dispatched to Customer',
    'Erection',
  ]),
  dateProcessed: z.string(),
  processedQty: z.number().int().min(1),
  processingTeam: z.string().optional().nullable(),
  processingLocation: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  reportNumber: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const processFilter = searchParams.get('process');
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (processFilter && processFilter !== 'all') {
      where.processType = processFilter;
    }

    if (projectId && projectId !== 'all') {
      where.assemblyPart = { projectId };
    }

    if (search) {
      where.OR = [
        { assemblyPart: { partDesignation: { contains: search } } },
        { assemblyPart: { assemblyMark: { contains: search } } },
        { assemblyPart: { name: { contains: search } } },
        { processingTeam: { contains: search } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.productionLog.count({ where });

    const logs = await prisma.productionLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        assemblyPart: {
          select: {
            id: true,
            partDesignation: true,
            assemblyMark: true,
            partMark: true,
            name: true,
            quantity: true,
            netWeightTotal: true,
            netAreaTotal: true,
            source: true,
            project: {
              select: {
                id: true,
                name: true,
                projectNumber: true,
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
        },
        rfiProductionLogs: {
          include: {
            rfiRequest: {
              select: {
                rfiNumber: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching production logs:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch production logs', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = productionLogSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: parsed.error.format() 
      }, { status: 400 });
    }

    const { assemblyPartId, processedQty, dateProcessed, ...logData } = parsed.data;

    // Validate work tracking ("No Silent Work" rule)
    const validation = await WorkTrackingValidatorService.validateProductionLogCreation(
      assemblyPartId,
      logData.processType
    );

    // Log warnings for tracking (non-blocking)
    if (validation.warnings.length > 0) {
      console.log('[ProductionLog] Tracking warnings:', validation.warnings);
    }

    // Get the assembly part
    const assemblyPart = await prisma.assemblyPart.findUnique({
      where: { id: assemblyPartId },
      include: {
        productionLogs: true,
      },
    });

    if (!assemblyPart) {
      return NextResponse.json({ error: 'Assembly part not found' }, { status: 404 });
    }

    // Define sequential process order for production phases
    const processOrder = ['Fit-up', 'Welding', 'Visualization'];
    const currentProcessIndex = processOrder.indexOf(logData.processType);

    // Only enforce sequential order for the main production processes
    if (currentProcessIndex > 0) {
      const previousProcess = processOrder[currentProcessIndex - 1];
      
      // Check if previous process is completed
      const previousProcessLogs = assemblyPart.productionLogs.filter(
        (log: any) => log.processType === previousProcess
      );
      
      const totalProcessedPrevious = previousProcessLogs.reduce(
        (sum: number, log: any) => sum + log.processedQty,
        0
      );

      if (totalProcessedPrevious < assemblyPart.quantity) {
        return NextResponse.json({ 
          error: `Cannot log ${logData.processType} before completing ${previousProcess}`,
          message: `You must complete ${previousProcess} (${totalProcessedPrevious}/${assemblyPart.quantity} done) before logging ${logData.processType}`,
          requiredProcess: previousProcess,
          completed: totalProcessedPrevious,
          required: assemblyPart.quantity,
        }, { status: 400 });
      }
    }

    // Calculate total processed for THIS SPECIFIC process type
    const totalProcessedForThisProcess = assemblyPart.productionLogs
      .filter((log: any) => log.processType === logData.processType)
      .reduce((sum: number, log: any) => sum + log.processedQty, 0);

    // Each part can be processed up to its quantity for EACH process
    const remainingQty = assemblyPart.quantity - totalProcessedForThisProcess - processedQty;

    if (remainingQty < 0) {
      return NextResponse.json({ 
        error: `Processed quantity exceeds available quantity for ${logData.processType}`,
        available: assemblyPart.quantity - totalProcessedForThisProcess,
        processType: logData.processType,
      }, { status: 400 });
    }

    // Create production log
    const productionLog = await prisma.productionLog.create({
      data: {
        ...logData,
        assemblyPartId,
        processedQty,
        remainingQty,
        dateProcessed: new Date(dateProcessed),
        createdById: session.sub,
      },
      include: {
        assemblyPart: {
          select: {
            id: true,
            assemblyMark: true,
            partMark: true,
            name: true,
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Update assembly part current process
    // Status is now based on whether all required processes are complete
    await prisma.assemblyPart.update({
      where: { id: assemblyPartId },
      data: {
        status: 'In Progress', // Keep as In Progress since parts go through multiple processes
        currentProcess: logData.processType,
        updatedById: session.sub,
      },
    });

    // Trigger KPI recalculation (async, don't wait)
    recalculateProductionKPIs(assemblyPart.projectId).catch(error => {
      console.error('KPI recalculation failed:', error);
    });

    // Return production log with any warnings
    return NextResponse.json({
      ...productionLog,
      _warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating production log:', error);
    return NextResponse.json({ 
      error: 'Failed to create production log', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json({ error: 'No log IDs provided' }, { status: 400 });
    }

    const ids = idsParam.split(',');

    // Delete the production logs
    const result = await prisma.productionLog.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} production log(s)` 
    });
  } catch (error) {
    console.error('Error deleting production logs:', error);
    return NextResponse.json({ 
      error: 'Failed to delete production logs', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
