import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { WorkUnitSyncService } from '@/lib/services/work-unit-sync.service';

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
    const { status, qcComments, inspectionDate, assignedToId } = body;

    // Fetch the RFI with production logs
    const existingRFI = await prisma.rFIRequest.findUnique({
      where: { id },
      include: {
        productionLogs: {
          select: {
            productionLogId: true,
          },
        },
      },
    });

    if (!existingRFI) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 });
    }

    // Update RFI
    const updatedRFI = await prisma.rFIRequest.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(qcComments !== undefined && { qcComments }),
        ...(inspectionDate && { inspectionDate: new Date(inspectionDate) }),
        ...(assignedToId !== undefined && { assignedToId }),
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

    // Update production log QC status based on RFI status
    if (status && existingRFI.productionLogs.length > 0) {
      let qcStatus = 'Pending Inspection';
      if (status === 'QC Checked') {
        qcStatus = 'Approved';
      } else if (status === 'Rejected') {
        qcStatus = 'Rejected';
      }

      await prisma.productionLog.updateMany({
        where: {
          id: {
            in: existingRFI.productionLogs.map(pl => pl.productionLogId),
          },
        },
        data: { qcStatus },
      });

      // Sync WorkUnit status (non-blocking)
      WorkUnitSyncService.syncRFIStatusUpdate(id, status).catch((err) => {
        console.error('WorkUnit status sync failed:', err);
      });
    }

    return NextResponse.json(updatedRFI);
  } catch (error) {
    console.error('Error updating RFI:', error);
    return NextResponse.json(
      { error: 'Failed to update RFI' },
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

    const rfi = await prisma.rFIRequest.findUnique({
      where: { id },
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
                    assemblyMark: true,
                    profile: true,
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
          include: {
            raisedBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!rfi) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 });
    }

    return NextResponse.json(rfi);
  } catch (error) {
    console.error('Error fetching RFI:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RFI' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Fetch the RFI with production logs
    const existingRFI = await prisma.rFIRequest.findUnique({
      where: { id },
      include: {
        productionLogs: {
          select: {
            productionLogId: true,
          },
        },
      },
    });

    if (!existingRFI) {
      return NextResponse.json({ error: 'RFI not found' }, { status: 404 });
    }

    // Reset QC status for all linked production logs
    if (existingRFI.productionLogs.length > 0) {
      await prisma.productionLog.updateMany({
        where: {
          id: {
            in: existingRFI.productionLogs.map(pl => pl.productionLogId),
          },
        },
        data: {
          qcStatus: 'Not Required',
          qcRequired: false,
        },
      });
    }

    // Delete the RFI (cascade will delete junction table entries)
    await prisma.rFIRequest.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'RFI deleted successfully' });
  } catch (error) {
    console.error('Error deleting RFI:', error);
    return NextResponse.json(
      { error: 'Failed to delete RFI' },
      { status: 500 }
    );
  }
}
