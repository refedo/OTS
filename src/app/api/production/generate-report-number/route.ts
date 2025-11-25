import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assemblyPartId, dispatchType } = await req.json();

    // Get the assembly part with project and building info
    const assemblyPart = await prisma.assemblyPart.findUnique({
      where: { id: assemblyPartId },
      include: {
        project: {
          select: {
            projectNumber: true,
          },
        },
        building: {
          select: {
            designation: true,
          },
        },
      },
    });

    if (!assemblyPart) {
      return NextResponse.json({ error: 'Assembly part not found' }, { status: 404 });
    }

    const projectNumber = assemblyPart.project.projectNumber;
    const buildingDesignation = assemblyPart.building?.designation || 'XX';

    // Find the last report number for this project, building, and dispatch type
    const lastLog = await prisma.productionLog.findFirst({
      where: {
        processType: {
          contains: dispatchType.replace('D', 'Dispatched to '),
        },
        assemblyPart: {
          projectId: assemblyPart.projectId,
          buildingId: assemblyPart.buildingId,
        },
        reportNumber: {
          startsWith: `${projectNumber}-${buildingDesignation}-${dispatchType}-`,
        },
      },
      orderBy: {
        reportNumber: 'desc',
      },
      select: {
        reportNumber: true,
      },
    });

    let serial = 1;
    if (lastLog && lastLog.reportNumber) {
      // Extract the serial number from the last report number
      const parts = lastLog.reportNumber.split('-');
      const lastSerial = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSerial)) {
        serial = lastSerial + 1;
      }
    }

    // Format serial with leading zeros (e.g., 001, 002, etc.)
    const serialFormatted = serial.toString().padStart(3, '0');
    const reportNumber = `${projectNumber}-${buildingDesignation}-${dispatchType}-${serialFormatted}`;

    return NextResponse.json({ reportNumber });
  } catch (error) {
    console.error('Error generating report number:', error);
    return NextResponse.json({ 
      error: 'Failed to generate report number', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
