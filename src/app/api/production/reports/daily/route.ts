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

    // Build where clause
    const where: any = {};
    
    if (startDate && endDate) {
      where.dateProcessed = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (projectId) {
      where.assemblyPart = {
        projectId: projectId,
      };
    }

    // Fetch production logs grouped by date and process
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
          },
        },
      },
      orderBy: {
        dateProcessed: 'asc',
      },
    });

    // Group by date and process type
    const dailyReport: Record<string, any> = {};

    productionLogs.forEach((log) => {
      const dateKey = log.dateProcessed.toISOString().split('T')[0];
      
      if (!dailyReport[dateKey]) {
        dailyReport[dateKey] = {
          date: dateKey,
          totalWeight: 0,
          processes: {},
        };
      }

      const processType = log.processType;
      
      if (!dailyReport[dateKey].processes[processType]) {
        dailyReport[dateKey].processes[processType] = {
          weight: 0,
          quantity: 0,
        };
      }

      // Calculate weight for this log
      const partWeight = log.assemblyPart.netWeightTotal || 0;
      const totalPartQty = log.assemblyPart.quantity || 1;
      const weightPerUnit = partWeight / totalPartQty;
      const logWeight = weightPerUnit * log.processedQty;

      dailyReport[dateKey].processes[processType].weight += logWeight;
      dailyReport[dateKey].processes[processType].quantity += log.processedQty;
      dailyReport[dateKey].totalWeight += logWeight;
    });

    // Convert to array and calculate daily averages
    const reportArray = Object.values(dailyReport).map((day: any) => {
      const processData: Record<string, number> = {};
      
      // All possible processes
      const allProcesses = [
        'Cutting',
        'Cut Pieces',
        'Fit-up Weight',
        'Fit-up Qty',
        'Welding Weight',
        'Welding Qty',
        'Visualization Weight',
        'Visualization Qty',
        'Dispatch to Sandblasting',
        'Dispatch to Galvanization',
        'Galvanization',
        'Dispatch to Painting',
        'Painting',
        'Dispatch to Customs',
        'Dispatch to Site',
      ];

      allProcesses.forEach((process) => {
        processData[process] = 0;
      });

      // Map process types to report columns
      Object.entries(day.processes).forEach(([processType, data]: [string, any]) => {
        switch (processType) {
          case 'Laser Cutting':
            processData['Cutting'] = data.weight;
            processData['Cut Pieces'] = data.quantity;
            break;
          case 'Fit-up':
            processData['Fit-up Weight'] = data.weight;
            processData['Fit-up Qty'] = data.quantity;
            break;
          case 'Welding':
            processData['Welding Weight'] = data.weight;
            processData['Welding Qty'] = data.quantity;
            break;
          case 'Visualization':
            processData['Visualization Weight'] = data.weight;
            processData['Visualization Qty'] = data.quantity;
            break;
          case 'Dispatch to Sandblasting':
            processData['Dispatch to Sandblasting'] = data.weight;
            break;
          case 'Dispatch to Galvanization':
            processData['Dispatch to Galvanization'] = data.weight;
            break;
          case 'Galvanization':
            processData['Galvanization'] = data.weight;
            break;
          case 'Dispatch to Painting':
            processData['Dispatch to Painting'] = data.weight;
            break;
          case 'Painting':
            processData['Painting'] = data.weight;
            break;
          case 'Dispatch to Customs':
            processData['Dispatch to Customs'] = data.weight;
            break;
          case 'Dispatch to Site':
            processData['Dispatch to Site'] = data.weight;
            break;
        }
      });

      return {
        date: day.date,
        dailyAverage: day.totalWeight,
        ...processData,
      };
    });

    return NextResponse.json(reportArray);
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily report' },
      { status: 500 }
    );
  }
}
