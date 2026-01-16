import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

// Generate Material Inspection Number
async function generateInspectionNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Count existing inspections this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const count = await prisma.materialInspection.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `MAT-${year}${month}-${sequence}`;
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
    const result = searchParams.get('result');

    const whereClause: any = {};
    
    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }
    
    if (result && result !== 'all') {
      whereClause.result = result;
    }

    const inspections = await prisma.materialInspection.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { inspectionDate: 'desc' },
    });

    return NextResponse.json(inspections);
  } catch (error) {
    console.error('Error fetching material inspections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material inspections' },
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
      materialType,
      grade,
      specification,
      supplier,
      heatNumber,
      millCertNumber,
      quantity,
      unit,
      inspectionDate,
      result,
      chemicalComposition,
      mechanicalProperties,
      visualInspection,
      dimensionalCheck,
      remarks,
      attachments,
    } = body;

    if (!projectId || !materialType || !grade || !specification || !quantity || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate inspection number
    const inspectionNumber = await generateInspectionNumber();

    // Create material inspection
    const inspection = await prisma.materialInspection.create({
      data: {
        inspectionNumber,
        projectId,
        materialType,
        grade,
        specification,
        supplier: supplier || null,
        heatNumber: heatNumber || null,
        millCertNumber: millCertNumber || null,
        quantity: parseFloat(quantity),
        unit,
        inspectorId: session.sub,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
        result: result || 'Pending',
        chemicalComposition: chemicalComposition || null,
        mechanicalProperties: mechanicalProperties || null,
        visualInspection: visualInspection || null,
        dimensionalCheck: dimensionalCheck || null,
        remarks: remarks || null,
        attachments: attachments || null,
      },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    console.error('Error creating material inspection:', error);
    return NextResponse.json(
      { error: 'Failed to create material inspection' },
      { status: 500 }
    );
  }
}
