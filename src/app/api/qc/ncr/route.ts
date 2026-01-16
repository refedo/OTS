import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { recalculateQCKPIs } from '@/lib/kpi/hooks';

// Generate NCR Number
async function generateNCRNumber(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { projectNumber: true },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Count existing NCRs for this project
  const count = await prisma.nCRReport.count({
    where: { projectId },
  });

  const sequence = (count + 1).toString().padStart(3, '0');
  return `${project.projectNumber}-NCR-${sequence}`;
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
    const severity = searchParams.get('severity');

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
    
    if (severity) {
      whereClause.severity = severity;
    }

    // Check for overdue NCRs and update status
    const now = new Date();
    await prisma.nCRReport.updateMany({
      where: {
        status: { in: ['Open', 'In Progress'] },
        deadline: { lt: now },
      },
      data: { status: 'Overdue' },
    });

    const ncrs = await prisma.nCRReport.findMany({
      where: whereClause,
      include: {
        project: {
          select: { projectNumber: true, name: true },
        },
        building: {
          select: { designation: true, name: true },
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
        rfiRequest: {
          select: {
            id: true,
            inspectionType: true,
            status: true,
          },
        },
        raisedBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        closedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(ncrs);
  } catch (error) {
    console.error('Error fetching NCRs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NCRs' },
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
      rfiRequestId,
      description,
      correctiveAction,
      rootCause,
      preventiveAction,
      deadline,
      severity,
      assignedToId,
    } = body;

    if (!projectId || !productionLogId || !description || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate NCR number
    const ncrNumber = await generateNCRNumber(projectId);

    // Create NCR
    const ncr = await prisma.nCRReport.create({
      data: {
        ncrNumber,
        projectId,
        buildingId: buildingId || null,
        productionLogId,
        rfiRequestId: rfiRequestId || null,
        description,
        correctiveAction: correctiveAction || null,
        rootCause: rootCause || null,
        preventiveAction: preventiveAction || null,
        deadline: new Date(deadline),
        severity: severity || 'Medium',
        raisedById: session.sub,
        assignedToId: assignedToId || null,
        status: 'Open',
      },
      include: {
        project: {
          select: { projectNumber: true, name: true },
        },
        building: {
          select: { designation: true, name: true },
        },
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
        rfiRequest: {
          select: {
            id: true,
            inspectionType: true,
          },
        },
        raisedBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Update production log QC status to Rejected
    await prisma.productionLog.update({
      where: { id: productionLogId },
      data: { qcStatus: 'Rejected' },
    });

    // Trigger KPI recalculation (async, don't wait)
    recalculateQCKPIs(projectId).catch(error => {
      console.error('KPI recalculation failed:', error);
    });

    return NextResponse.json(ncr, { status: 201 });
  } catch (error) {
    console.error('Error creating NCR:', error);
    return NextResponse.json(
      { error: 'Failed to create NCR' },
      { status: 500 }
    );
  }
}
