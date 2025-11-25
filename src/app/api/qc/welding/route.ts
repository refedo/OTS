import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// Generate Welding Inspection Number
async function generateInspectionNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const count = await prisma.weldingInspection.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `WELD-${year}${month}-${sequence}`;
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
    const result = searchParams.get('result');

    const whereClause: any = {};
    
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }
    
    if (buildingId && buildingId !== 'all') {
      whereClause.buildingId = buildingId;
    }
    
    if (result && result !== 'all') {
      whereClause.result = result;
    }

    const inspections = await prisma.weldingInspection.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        building: {
          select: { id: true, designation: true, name: true },
        },
        productionLog: {
          include: {
            assemblyPart: {
              select: {
                partDesignation: true,
                name: true,
                assemblyMark: true,
              },
            },
          },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { inspectionDate: 'desc' },
    });

    return NextResponse.json(inspections);
  } catch (error) {
    console.error('Error fetching welding inspections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch welding inspections' },
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
    const {
      projectId,
      buildingId,
      productionLogId,
      wpsNumber,
      welderCode,
      jointType,
      jointLocation,
      weldingProcess,
      inspectionDate,
      visualResult,
      defects,
      defectDescription,
      repairRequired,
      repairCompleted,
      result,
      remarks,
      attachments,
    } = body;

    if (!projectId || !productionLogId || !jointType || !jointLocation || !weldingProcess) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate inspection number
    const inspectionNumber = await generateInspectionNumber();

    // Create welding inspection
    const inspection = await prisma.weldingInspection.create({
      data: {
        inspectionNumber,
        projectId,
        buildingId: buildingId || null,
        productionLogId,
        wpsNumber: wpsNumber || null,
        welderCode: welderCode || null,
        jointType,
        jointLocation,
        weldingProcess,
        inspectorId: session.sub,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
        visualResult: visualResult || 'Pending',
        defects: defects || null,
        defectDescription: defectDescription || null,
        repairRequired: repairRequired || false,
        repairCompleted: repairCompleted || false,
        result: result || 'Pending',
        remarks: remarks || null,
        attachments: attachments || null,
      },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        building: {
          select: { id: true, designation: true, name: true },
        },
        productionLog: {
          include: {
            assemblyPart: {
              select: {
                partDesignation: true,
                name: true,
                assemblyMark: true,
              },
            },
          },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    console.error('Error creating welding inspection:', error);
    return NextResponse.json(
      { error: 'Failed to create welding inspection' },
      { status: 500 }
    );
  }
}
