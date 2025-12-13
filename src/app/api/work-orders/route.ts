import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

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

    // Validate required fields
    if (!projectId || !buildingId || !selectedPartIds || selectedPartIds.length === 0 || !productionEngineerId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
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
        projectId,
        buildingId,
        selectedGroups: selectedGroups || [],
        productionEngineerId,
        processingLocation,
        processingTeam,
        totalWeight,
        weightPercentage,
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        status: 'Pending',
        progress: 0,
        createdById: session.userId,
        parts: {
          create: parts.map(part => ({
            assemblyPartId: part.id,
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
            name: true,
          },
        },
        parts: true,
      },
    });

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ 
      error: 'Failed to create work order', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
