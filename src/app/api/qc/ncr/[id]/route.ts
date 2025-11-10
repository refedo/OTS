import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function PATCH(
  request: Request,
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
    const body = await request.json();
    const {
      status,
      description,
      correctiveAction,
      rootCause,
      preventiveAction,
      deadline,
      severity,
      assignedToId,
    } = body;

    const updateData: any = {};

    if (status) {
      updateData.status = status;
      if (status === 'Closed') {
        updateData.closedDate = new Date();
        updateData.closedById = session.sub;
      }
    }
    if (description !== undefined) updateData.description = description;
    if (correctiveAction !== undefined) updateData.correctiveAction = correctiveAction;
    if (rootCause !== undefined) updateData.rootCause = rootCause;
    if (preventiveAction !== undefined) updateData.preventiveAction = preventiveAction;
    if (deadline) updateData.deadline = new Date(deadline);
    if (severity) updateData.severity = severity;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    const updatedNCR = await prisma.nCRReport.update({
      where: { id },
      data: updateData,
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
        closedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // If NCR is closed, update production log QC status
    if (status === 'Closed') {
      await prisma.productionLog.update({
        where: { id: updatedNCR.productionLogId },
        data: { qcStatus: 'Approved' },
      });
    }

    return NextResponse.json(updatedNCR);
  } catch (error) {
    console.error('Error updating NCR:', error);
    return NextResponse.json(
      { error: 'Failed to update NCR' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
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

    const ncr = await prisma.nCRReport.findUnique({
      where: { id },
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
                profile: true,
                quantity: true,
              },
            },
          },
        },
        rfiRequest: {
          include: {
            requestedBy: {
              select: { id: true, name: true },
            },
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
    });

    if (!ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    return NextResponse.json(ncr);
  } catch (error) {
    console.error('Error fetching NCR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NCR' },
      { status: 500 }
    );
  }
}
