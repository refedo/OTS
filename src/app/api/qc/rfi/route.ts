import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';

// Get process-to-inspection type mapping
function getInspectionType(processType: string): string {
  const mapping: { [key: string]: string } = {
    'Fit-up': 'Dimension Check',
    'Welding': 'NDT',
    'Visualization': 'Visual Check',
    'Sandblasting': 'Surface Preparation Check',
    'Painting': 'Paint Thickness & Quality Check',
    'Galvanization': 'Coating Thickness Check',
  };
  return mapping[processType] || 'General Inspection';
}

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const buildingId = searchParams.get('buildingId');
    const status = searchParams.get('status');
    const inspectionType = searchParams.get('inspectionType');

    const whereClause: any = {};
    
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }
    
    if (buildingId && buildingId !== 'all') {
      whereClause.buildingId = buildingId;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (inspectionType) {
      whereClause.inspectionType = inspectionType;
    }

    const rfis = await prisma.rFIRequest.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        building: {
          select: { id: true, designation: true, name: true },
        },
        productionLogs: {
          include: {
            productionLog: {
              include: {
                assemblyPart: {
                  select: {
                    partDesignation: true,
                    name: true,
                    assemblyMark: true,
                    quantity: true,
                  },
                },
              },
            },
          },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        ncrReports: {
          select: { id: true, ncrNumber: true, status: true },
        },
      },
      orderBy: { requestDate: 'desc' },
    });

    return NextResponse.json(rfis);
  } catch (error) {
    console.error('Error fetching RFIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RFIs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productionLogIds, assignedToId, rectificationRemarks } = body;

    if (!productionLogIds || !Array.isArray(productionLogIds) || productionLogIds.length === 0) {
      return NextResponse.json(
        { error: 'Production log IDs are required' },
        { status: 400 }
      );
    }

    // Fetch production logs with assembly part details
    const productionLogs = await prisma.productionLog.findMany({
      where: {
        id: { in: productionLogIds },
      },
      include: {
        assemblyPart: {
          include: {
            project: true,
            building: true,
          },
        },
      },
    });

    if (productionLogs.length === 0) {
      return NextResponse.json(
        { error: 'No valid production logs found' },
        { status: 404 }
      );
    }

    // Group production logs by project and process type
    const groupedLogs = productionLogs.reduce((acc, log) => {
      const key = `${log.assemblyPart.projectId}-${log.processType}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(log);
      return acc;
    }, {} as Record<string, typeof productionLogs>);

    console.log(`Grouped ${productionLogs.length} logs into ${Object.keys(groupedLogs).length} RFI(s)`);

    // Create one RFI per group (project + process type)
    const rfis = [];
    let rfiCounter = 0;

    for (const [groupKey, logs] of Object.entries(groupedLogs)) {
      const firstLog = logs[0];
      const inspectionType = getInspectionType(firstLog.processType);
      
      // Generate RFI number: RFI-YYMM-NNNN
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
      const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero
      const yearMonth = `${year}${month}`; // e.g., "2510" for October 2025
      
      const lastRFI = await prisma.rFIRequest.findFirst({
        where: {
          rfiNumber: {
            not: null,
            startsWith: `RFI-${yearMonth}-`,
          },
        },
        orderBy: {
          rfiNumber: 'desc',
        },
      });
      
      let nextNumber = 1;
      if (lastRFI && lastRFI.rfiNumber) {
        const lastNumber = parseInt(lastRFI.rfiNumber.split('-')[2]);
        nextNumber = lastNumber + 1 + rfiCounter;
      } else {
        nextNumber = 1 + rfiCounter;
      }
      
      const rfiNumber = `RFI-${yearMonth}-${nextNumber.toString().padStart(4, '0')}`;
      
      // Create RFI with all production logs in the group
      const rfi = await prisma.rFIRequest.create({
        data: {
          rfiNumber,
          projectId: firstLog.assemblyPart.projectId,
          buildingId: firstLog.assemblyPart.buildingId,
          processType: firstLog.processType,
          inspectionType,
          requestedById: session.sub,
          assignedToId: assignedToId || null,
          status: 'Waiting for Inspection',
          qcComments: rectificationRemarks 
            ? `RECTIFICATION: ${rectificationRemarks}`
            : null,
          productionLogs: {
            create: logs.map(log => ({
              productionLogId: log.id,
            })),
          },
        },
        include: {
          project: {
            select: { projectNumber: true, name: true },
          },
          building: {
            select: { designation: true, name: true },
          },
          productionLogs: {
            include: {
              productionLog: {
                include: {
                  assemblyPart: {
                    select: {
                      partDesignation: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Update all production logs in this group
      await prisma.productionLog.updateMany({
        where: { id: { in: logs.map(l => l.id) } },
        data: {
          qcRequired: true,
          qcStatus: 'Pending Inspection',
        },
      });

      rfis.push(rfi);
      rfiCounter++;

      // Sync to WorkUnit for Operations Control (non-blocking)
      WorkUnitSyncService.syncFromRFI({
        id: rfi.id,
        projectId: rfi.projectId,
        requestedById: session.sub,
        assignedToId: rfi.assignedToId,
        requestDate: rfi.requestDate,
        status: rfi.status,
      }).catch((err) => {
        console.error('WorkUnit sync failed:', err);
      });
    }

    return NextResponse.json({
      message: `${rfis.length} RFI(s) created successfully`,
      rfis,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating RFIs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to create RFIs',
        details: errorMessage,
        hint: 'Make sure to run: npx prisma migrate dev'
      },
      { status: 500 }
    );
  }
}
