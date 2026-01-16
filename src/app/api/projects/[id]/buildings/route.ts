import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:projectId/buildings
 * Returns all buildings with their production, QC, and dispatch status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all buildings for the project
    const buildings = await prisma.building.findMany({
      where: { projectId },
      include: {
        assemblyParts: {
          select: {
            id: true,
            netWeightTotal: true,
            quantity: true,
            productionLogs: {
              select: {
                processType: true,
                processedQty: true,
                remainingQty: true,
              },
            },
          },
        },
        weldingInspections: {
          select: {
            id: true,
            result: true,
          },
        },
        dimensionalInspections: {
          select: {
            id: true,
            result: true,
          },
        },
        ndtInspections: {
          select: {
            id: true,
            result: true,
          },
        },
      },
      orderBy: {
        designation: 'asc',
      },
    });

    // Map buildings to response format
    const buildingsData = buildings.map(building => {
      // Calculate required weight (in tons)
      const requiredWeight = building.assemblyParts.reduce(
        (sum, part) => sum + (Number(part.netWeightTotal) || 0),
        0
      ) / 1000;

      // Calculate produced weight
      let producedWeight = 0;
      building.assemblyParts.forEach(part => {
        const partWeight = (Number(part.netWeightTotal) || 0) / 1000;
        const partQty = part.quantity || 1;

        if (part.productionLogs.length > 0) {
          const latestLog = part.productionLogs[part.productionLogs.length - 1];
          if (latestLog.remainingQty === 0) {
            producedWeight += partWeight;
          } else {
            const processedRatio = latestLog.processedQty / partQty;
            producedWeight += partWeight * processedRatio;
          }
        }
      });

      const productionProgress = requiredWeight > 0 
        ? (producedWeight / requiredWeight) * 100 
        : 0;

      // Calculate QC status
      const allInspections = [
        ...building.weldingInspections,
        ...building.dimensionalInspections,
        ...building.ndtInspections,
      ];

      const totalQC = allInspections.length;
      const completedQC = allInspections.filter(
        i => i.result === 'Accepted' || i.result === 'Pass'
      ).length;
      const rejectedQC = allInspections.filter(
        i => i.result === 'Rejected' || i.result === 'Fail'
      ).length;

      // Calculate dispatch status
      const dispatchLogs = building.assemblyParts.flatMap(part =>
        part.productionLogs.filter(log => log.processType === 'Dispatch')
      );

      const totalParts = building.assemblyParts.length;
      const dispatchedParts = building.assemblyParts.filter(part =>
        part.productionLogs.some(
          log => log.processType === 'Dispatch' && log.remainingQty === 0
        )
      ).length;

      const dispatchPercentage = totalParts > 0 
        ? (dispatchedParts / totalParts) * 100 
        : 0;

      return {
        id: building.id,
        designation: building.designation,
        name: building.name,
        requiredWeight: Math.round(requiredWeight * 100) / 100,
        producedWeight: Math.round(producedWeight * 100) / 100,
        productionProgress: Math.round(productionProgress * 100) / 100,
        qcStatus: {
          total: totalQC,
          completed: completedQC,
          rejected: rejectedQC,
        },
        dispatchStatus: {
          total: totalParts,
          dispatched: dispatchedParts,
          percentage: Math.round(dispatchPercentage * 100) / 100,
        },
      };
    });

    return NextResponse.json(buildingsData);
  } catch (error) {
    console.error('Error fetching buildings data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buildings data' },
      { status: 500 }
    );
  }
}
