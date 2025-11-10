import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const store = await cookies();
    const token = store.get(cookieName)?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const projectId = searchParams.get('projectId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      dateProcessed: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (projectId && projectId !== 'all') {
      where.assemblyPart = {
        projectId: projectId,
      };
    }

    // Fetch production logs
    const productionLogs = await prisma.productionLog.findMany({
      where,
      include: {
        assemblyPart: {
          select: {
            netWeightTotal: true,
            quantity: true,
            project: {
              select: {
                id: true,
                projectNumber: true,
                name: true,
              },
            },
            building: {
              select: {
                id: true,
                designation: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Group by project, building, and process type
    const periodReport: Record<string, any> = {};

    productionLogs.forEach((log) => {
      const projectKey = log.assemblyPart.project.projectNumber;
      const buildingKey = log.assemblyPart.building?.designation || 'No Building';
      const key = `${projectKey}-${buildingKey}`;

      if (!periodReport[key]) {
        periodReport[key] = {
          projectNumber: log.assemblyPart.project.projectNumber,
          projectName: log.assemblyPart.project.name,
          buildingDesignation: log.assemblyPart.building?.designation || null,
          buildingName: log.assemblyPart.building?.name || null,
          processes: {},
          totalTonnage: 0,
        };
      }

      const processType = log.processType;

      if (!periodReport[key].processes[processType]) {
        periodReport[key].processes[processType] = 0;
      }

      // Calculate weight for this log (in tons)
      const partWeight = log.assemblyPart.netWeightTotal || 0;
      const totalPartQty = log.assemblyPart.quantity || 1;
      const weightPerUnit = partWeight / totalPartQty;
      const logWeight = (weightPerUnit * log.processedQty) / 1000; // Convert kg to tons

      periodReport[key].processes[processType] += logWeight;
      periodReport[key].totalTonnage += logWeight;
    });

    // Convert to array format
    const reportArray = Object.values(periodReport).map((item: any) => {
      const processData: Record<string, number> = {
        'Laser Cutting': 0,
        'Fit-up': 0,
        'Welding': 0,
        'Visualization': 0,
      };

      Object.entries(item.processes).forEach(([processType, tonnage]: [string, any]) => {
        if (processData.hasOwnProperty(processType)) {
          processData[processType] = tonnage;
        }
      });

      // Calculate Period Tonnage as average of Fit-up, Welding, and Visualization
      const productionProcesses = [processData['Fit-up'], processData['Welding'], processData['Visualization']];
      const periodTonnage = productionProcesses.reduce((sum, val) => sum + val, 0) / 3;

      return {
        projectNumber: item.projectNumber,
        projectName: item.projectName,
        buildingDesignation: item.buildingDesignation,
        buildingName: item.buildingName,
        periodTonnage: periodTonnage,
        ...processData,
      };
    });

    // Sort by project number and building
    reportArray.sort((a, b) => {
      if (a.projectNumber !== b.projectNumber) {
        return a.projectNumber.localeCompare(b.projectNumber);
      }
      return (a.buildingDesignation || '').localeCompare(b.buildingDesignation || '');
    });

    // Calculate totals
    const totals = {
      periodTonnage: reportArray.reduce((sum, item) => sum + item.periodTonnage, 0),
      'Laser Cutting': reportArray.reduce((sum, item) => sum + item['Laser Cutting'], 0),
      'Fit-up': reportArray.reduce((sum, item) => sum + item['Fit-up'], 0),
      'Welding': reportArray.reduce((sum, item) => sum + item['Welding'], 0),
      'Visualization': reportArray.reduce((sum, item) => sum + item['Visualization'], 0),
    };

    return NextResponse.json({
      data: reportArray,
      totals,
      period: {
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('Error generating period report:', error);
    return NextResponse.json(
      { error: 'Failed to generate period report' },
      { status: 500 }
    );
  }
}
