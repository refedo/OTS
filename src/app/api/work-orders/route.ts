import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';
import { WorkTrackingValidatorService } from '@/lib/services/work-tracking-validator.service';

// Generate work order number
async function generateWorkOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;
  
  const lastWorkOrder = await prisma.workOrder.findFirst({
    where: {
      workOrderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      workOrderNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastWorkOrder) {
    const lastNumber = parseInt(lastWorkOrder.workOrderNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

// GET - List all work orders
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
    const status = searchParams.get('status');

    const whereClause: any = {};
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }
    if (buildingId && buildingId !== 'all') {
      whereClause.buildingId = buildingId;
    }
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const workOrders = await prisma.workOrder.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            projectNumber: true,
            name: true,
          },
        },
        building: {
          select: {
            designation: true,
            name: true,
          },
        },
        productionEngineer: {
          select: {
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        parts: {
          select: {
            id: true,
            partDesignation: true,
            status: true,
            processedQuantity: true,
            quantity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate progress for each work order
    const workOrdersWithProgress = workOrders.map(wo => {
      const totalParts = wo.parts.length;
      const completedParts = wo.parts.filter(p => p.status === 'Completed').length;
      const progress = totalParts > 0 ? (completedParts / totalParts) * 100 : 0;

      return {
        ...wo,
        progress: Number(progress.toFixed(2)),
      };
    });

    return NextResponse.json(workOrdersWithProgress);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch work orders', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST - Create new work order
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Work Order Request Body:', JSON.stringify(body, null, 2));
    
    const {
      projectId,
      buildingId,
      selectedGroups,
      selectedPartIds,
      productionEngineerId,
      processingLocation,
      processingTeam,
      description,
      plannedStartDate,
      plannedEndDate,
    } = body;

    console.log('Parsed values:', {
      projectId,
      buildingId,
      selectedGroups,
      selectedPartIdsCount: selectedPartIds?.length,
      productionEngineerId,
      plannedStartDate,
      plannedEndDate,
    });

    // Validate required fields
    if (!projectId || !buildingId || !selectedPartIds || selectedPartIds.length === 0 || !productionEngineerId) {
      console.log('Validation failed:', { projectId, buildingId, selectedPartIdsLength: selectedPartIds?.length, productionEngineerId });
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: { projectId: !!projectId, buildingId: !!buildingId, selectedPartIds: selectedPartIds?.length || 0, productionEngineerId: !!productionEngineerId }
      }, { status: 400 });
    }

    // Validate work tracking ("No Silent Work" rule)
    const validation = await WorkTrackingValidatorService.validateWorkOrderCreation(
      projectId,
      buildingId,
      selectedPartIds
    );

    // Log warnings for tracking
    if (validation.warnings.length > 0) {
      console.log('[WorkOrder] Tracking warnings:', validation.warnings);
    }

    // Block if critical validation issues
    if (!validation.isValid) {
      const criticalWarnings = validation.warnings.filter(w => w.severity === 'critical');
      return NextResponse.json({
        error: 'Work order validation failed',
        warnings: criticalWarnings,
        message: criticalWarnings[0]?.message || 'Critical validation issues detected',
      }, { status: 400 });
    }

    // Use provided dates or get from fabrication schedule
    let startDate: Date;
    let endDate: Date;

    if (plannedStartDate && plannedEndDate) {
      startDate = new Date(plannedStartDate);
      endDate = new Date(plannedEndDate);
    } else {
      // Fallback to fabrication schedule
      const fabricationSchedule = await prisma.scopeSchedule.findUnique({
        where: {
          buildingId_scopeType: {
            buildingId,
            scopeType: 'fabrication',
          },
        },
      });

      if (!fabricationSchedule) {
        return NextResponse.json({ 
          error: 'No fabrication schedule found and no dates provided. Please create a production plan first.' 
        }, { status: 400 });
      }

      startDate = fabricationSchedule.startDate;
      endDate = fabricationSchedule.endDate;
    }

    // Get selected parts with details
    const parts = await prisma.assemblyPart.findMany({
      where: {
        id: { in: selectedPartIds },
      },
    });

    // Calculate total weight
    const totalWeight = parts.reduce((sum, part) => {
      return sum + (Number(part.netWeightTotal) || 0);
    }, 0);

    // Get building total weight for percentage calculation
    const buildingParts = await prisma.assemblyPart.findMany({
      where: { buildingId },
      select: { netWeightTotal: true },
    });

    const buildingTotalWeight = buildingParts.reduce((sum, part) => {
      return sum + (Number(part.netWeightTotal) || 0);
    }, 0);

    const weightPercentage = buildingTotalWeight > 0 
      ? (totalWeight / buildingTotalWeight) * 100 
      : 0;

    // Generate work order name based on groups
    const groupNames = selectedGroups && selectedGroups.length > 0 
      ? selectedGroups.join(', ')
      : 'Mixed Parts';
    
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { designation: true },
    });

    const workOrderName = `${building?.designation} - ${groupNames} (${weightPercentage.toFixed(1)}%)`;

    // Generate work order number
    const workOrderNumber = await generateWorkOrderNumber();

    // Create work order
    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        name: workOrderName,
        description,
        project: { connect: { id: projectId } },
        building: { connect: { id: buildingId } },
        selectedGroups: selectedGroups || [],
        productionEngineer: { connect: { id: productionEngineerId } },
        processingLocation,
        processingTeam,
        totalWeight,
        weightPercentage,
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        status: 'Pending',
        progress: 0,
        createdBy: { connect: { id: session.sub } },
        parts: {
          create: parts.map(part => ({
            assemblyPart: { connect: { id: part.id } },
            partDesignation: part.partDesignation,
            assemblyMark: part.assemblyMark,
            partMark: part.partMark,
            quantity: part.quantity,
            weight: Number(part.netWeightTotal) || 0,
            processedQuantity: 0,
            status: 'Pending',
          })),
        },
      },
      include: {
        project: {
          select: {
            projectNumber: true,
            name: true,
          },
        },
        building: {
          select: {
            designation: true,
            name: true,
          },
        },
        productionEngineer: {
          select: {
            id: true,
            name: true,
          },
        },
        parts: true,
      },
    });

    // Create notification for assigned production engineer
    await prisma.notification.create({
      data: {
        type: 'TASK_ASSIGNED',
        title: `New Work Order Assigned: ${workOrderNumber}`,
        message: `You have been assigned to work order ${workOrderNumber} for ${workOrder.project.projectNumber} - ${workOrder.building.designation}. ${parts.length} part(s) included.`,
        userId: productionEngineerId,
        relatedEntityType: 'WorkOrder',
        relatedEntityId: workOrder.id,
        actionUrl: `/production/work-orders/${workOrder.id}`,
        isRead: false,
        isArchived: false,
      },
    });

    // Sync to WorkUnit for Operations Control (non-blocking)
    WorkUnitSyncService.syncFromWorkOrder({
      id: workOrder.id,
      projectId: projectId,
      productionEngineerId: productionEngineerId,
      plannedStartDate: startDate,
      plannedEndDate: endDate,
      status: workOrder.status,
      totalWeight: workOrder.totalWeight ? Number(workOrder.totalWeight) : null,
    }).catch((err) => {
      console.error('WorkUnit sync failed:', err);
    });

    // Return work order with any non-critical warnings
    // Convert Decimal fields to numbers for JSON serialization
    const nonCriticalWarnings = validation.warnings.filter(w => w.severity !== 'critical');
    const serializedWorkOrder = {
      ...workOrder,
      totalWeight: workOrder.totalWeight ? Number(workOrder.totalWeight) : null,
      weightPercentage: workOrder.weightPercentage ? Number(workOrder.weightPercentage) : null,
      progress: workOrder.progress ? Number(workOrder.progress) : 0,
      parts: workOrder.parts?.map(p => ({
        ...p,
        weight: p.weight ? Number(p.weight) : 0,
      })),
      _warnings: nonCriticalWarnings.length > 0 ? nonCriticalWarnings : undefined,
    };
    return NextResponse.json(serializedWorkOrder);
  } catch (error: any) {
    console.error('Error creating work order:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error code:', error?.code);
    console.error('Error meta:', error?.meta);
    
    // Build a meaningful error message
    let errorMessage = 'Unknown error';
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (error?.code) {
      errorDetails = { code: error.code, meta: error.meta };
    }
    
    return NextResponse.json({ 
      error: 'Failed to create work order', 
      message: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}

// DELETE - Delete work orders (single or bulk)
export async function DELETE(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No work order IDs provided' }, { status: 400 });
    }

    // First delete related WorkOrderParts
    await prisma.workOrderPart.deleteMany({
      where: {
        workOrderId: { in: ids },
      },
    });

    // Delete related WorkUnits (Operations Control)
    await prisma.workUnit.deleteMany({
      where: {
        referenceModule: 'WorkOrder',
        referenceId: { in: ids },
      },
    });

    // Delete the work orders
    const result = await prisma.workOrder.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({ 
      message: `${result.count} work order(s) deleted successfully`,
      deletedCount: result.count,
    });
  } catch (error: any) {
    console.error('Error deleting work orders:', error);
    return NextResponse.json({ 
      error: 'Failed to delete work orders', 
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
