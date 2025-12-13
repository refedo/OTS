import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// Process types in order of production flow
const PROCESS_ORDER = [
  'Preparation',
  'Fit-up', 
  'Welding',
  'Visualization',
  'Sandblasting',
  'Painting',
  'Galvanization',
  'Dispatch',
  'Erection'
];

// Calculate part status based on production logs
async function calculatePartStatus(assemblyPartId: string, quantity: number) {
  const logs = await prisma.productionLog.findMany({
    where: { assemblyPartId },
    orderBy: { dateProcessed: 'desc' },
  });

  if (logs.length === 0) {
    return { status: 'Pending', processedQuantity: 0, currentProcess: null, processes: [] };
  }

  // Group logs by process type and sum quantities
  const processMap: Record<string, number> = {};
  logs.forEach(log => {
    if (!processMap[log.processType]) {
      processMap[log.processType] = 0;
    }
    processMap[log.processType] += log.processedQty;
  });

  // Find the latest process with full quantity
  let currentProcess = null;
  let maxProcessIndex = -1;
  
  for (const [processType, qty] of Object.entries(processMap)) {
    const processIndex = PROCESS_ORDER.indexOf(processType);
    if (processIndex > maxProcessIndex && qty >= quantity) {
      maxProcessIndex = processIndex;
      currentProcess = processType;
    }
  }

  // Determine status based on fabrication completion
  // A part is "Completed" when Visualization (final inspection) is done for full quantity
  // Or when Dispatch/Erection is logged
  let status = 'Pending';
  let processedQuantity = 0;

  const hasVisualization = (processMap['Visualization'] || 0) >= quantity;
  const hasDispatch = (processMap['Dispatch'] || 0) >= quantity;
  const hasErection = (processMap['Erection'] || 0) >= quantity;

  if (hasDispatch || hasErection || hasVisualization) {
    status = 'Completed';
    processedQuantity = quantity;
  } else if (Object.keys(processMap).length > 0) {
    status = 'In Progress';
    // Use the max processed quantity from any process
    processedQuantity = Math.min(Math.max(...Object.values(processMap)), quantity);
  }

  return { 
    status, 
    processedQuantity, 
    currentProcess,
    processes: Object.entries(processMap).map(([type, qty]) => ({ type, qty }))
  };
}

// GET - Get single work order with synced status from production logs
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

    const { id } = await params;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
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
            email: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        parts: {
          include: {
            assemblyPart: {
              select: {
                id: true,
                name: true,
                profile: true,
                grade: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Sync part statuses from production logs
    const partsWithStatus = await Promise.all(
      workOrder.parts.map(async (part) => {
        const statusInfo = await calculatePartStatus(part.assemblyPartId, part.quantity);
        return {
          ...part,
          status: statusInfo.status,
          processedQuantity: statusInfo.processedQuantity,
          currentProcess: statusInfo.currentProcess,
          processes: statusInfo.processes,
        };
      })
    );

    // Calculate overall work order progress
    const totalParts = partsWithStatus.length;
    const completedParts = partsWithStatus.filter(p => p.status === 'Completed').length;
    const inProgressParts = partsWithStatus.filter(p => p.status === 'In Progress').length;
    
    const progress = totalParts > 0 ? (completedParts / totalParts) * 100 : 0;
    
    // Determine overall work order status
    let woStatus = 'Pending';
    if (completedParts === totalParts && totalParts > 0) {
      woStatus = 'Completed';
    } else if (inProgressParts > 0 || completedParts > 0) {
      woStatus = 'In Progress';
    }

    // Update work order status in database if changed
    if (woStatus !== workOrder.status || progress !== Number(workOrder.progress)) {
      await prisma.workOrder.update({
        where: { id },
        data: { 
          status: woStatus, 
          progress,
          actualStartDate: woStatus !== 'Pending' && !workOrder.actualStartDate ? new Date() : workOrder.actualStartDate,
          actualEndDate: woStatus === 'Completed' && !workOrder.actualEndDate ? new Date() : workOrder.actualEndDate,
        },
      });
    }

    return NextResponse.json({
      ...workOrder,
      parts: partsWithStatus,
      status: woStatus,
      progress,
    });
  } catch (error) {
    console.error('Error fetching work order:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch work order', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// PATCH - Update work order
export async function PATCH(
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

    const { id } = await params;
    const body = await req.json();

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: body,
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
    console.error('Error updating work order:', error);
    return NextResponse.json({ 
      error: 'Failed to update work order', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE - Delete work order
export async function DELETE(
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

    const { id } = await params;

    await prisma.workOrder.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json({ 
      error: 'Failed to delete work order', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
