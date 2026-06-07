import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

async function generateInspectionNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const count = await prisma.dimensionalInspection.count({
    where: {
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `DIM-${year}${month}-${sequence}`;
}

const assemblyPartSelect = {
  partDesignation: true,
  name: true,
  assemblyMark: true,
  profile: true,
  lengthMm: true,
  quantity: true,
};

const userSelect = { id: true, name: true, email: true };

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
    const rfiRequestId = searchParams.get('rfiRequestId');
    const approvalStatus = searchParams.get('approvalStatus');

    const whereClause: Record<string, unknown> = {};

    if (projectId && projectId !== 'all') whereClause.projectId = projectId;
    if (buildingId && buildingId !== 'all') whereClause.buildingId = buildingId;
    if (result && result !== 'all') whereClause.result = result;
    if (rfiRequestId) whereClause.rfiRequestId = rfiRequestId;
    if (approvalStatus && approvalStatus !== 'all') whereClause.approvalStatus = approvalStatus;

    const inspections = await prisma.dimensionalInspection.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        building: { select: { id: true, designation: true, name: true } },
        productionLog: {
          include: { assemblyPart: { select: assemblyPartSelect } },
        },
        inspector: { select: userSelect },
        checkedBy: { select: userSelect },
        approvedBy: { select: userSelect },
        rfiRequest: { select: { id: true, rfiNumber: true, status: true } },
      },
      orderBy: { inspectionDate: 'desc' },
    });

    return NextResponse.json(inspections);
  } catch (error) {
    logger.error({ error }, 'Error fetching dimensional inspections');
    return NextResponse.json(
      { error: 'Failed to fetch dimensional inspections' },
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

    // Batch creation mode: items[] array
    if (Array.isArray(body.items) && body.items.length > 0) {
      const {
        projectId,
        buildingId,
        rfiRequestId,
        inspectionDate,
        checkedById,
        items,
      } = body as {
        projectId: string;
        buildingId?: string;
        rfiRequestId?: string;
        inspectionDate?: string;
        checkedById?: string;
        items: {
          productionLogId: string;
          partDesignation: string;
          drawingLength?: number;
          actualLength?: number;
          toleranceMm?: number;
          remarks?: string;
        }[];
      };

      if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
      }

      const created = [];
      for (const item of items) {
        const { productionLogId, partDesignation, drawingLength, actualLength, toleranceMm, remarks } = item;

        if (!productionLogId || !partDesignation) continue;

        const inspectionNumber = await generateInspectionNumber();

        const tolerance = toleranceMm ?? 2;
        let toleranceCheck = 'Pending';
        let result = 'Pending';

        if (actualLength !== undefined && actualLength !== null && drawingLength !== undefined && drawingLength !== null) {
          const diff = Math.abs(actualLength - drawingLength);
          toleranceCheck = diff <= tolerance ? 'Within' : 'Out of Tolerance';
          result = toleranceCheck === 'Within' ? 'Accepted' : 'Rejected';
        }

        const record = await prisma.dimensionalInspection.create({
          data: {
            inspectionNumber,
            projectId,
            buildingId: buildingId || null,
            productionLogId,
            rfiRequestId: rfiRequestId || null,
            partDesignation,
            drawingReference: null,
            requiredLength: drawingLength ?? null,
            measuredLength: actualLength ?? null,
            lengthTolerance: tolerance,
            inspectorId: session.sub,
            checkedById: checkedById || null,
            inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
            toleranceCheck,
            result,
            approvalStatus: 'Draft',
            remarks: remarks || null,
          },
          include: {
            project: { select: { id: true, projectNumber: true, name: true } },
            productionLog: {
              include: { assemblyPart: { select: assemblyPartSelect } },
            },
            checkedBy: { select: userSelect },
          },
        });

        created.push(record);
      }

      return NextResponse.json(created, { status: 201 });
    }

    // Single creation (legacy)
    const {
      projectId,
      buildingId,
      productionLogId,
      partDesignation,
      drawingReference,
      measuredLength,
      requiredLength,
      lengthTolerance,
      measuredWidth,
      requiredWidth,
      widthTolerance,
      measuredHeight,
      requiredHeight,
      heightTolerance,
      measuredThickness,
      requiredThickness,
      thicknessTolerance,
      straightness,
      flatness,
      squareness,
      inspectionDate,
      toleranceCheck,
      result,
      remarks,
      attachments,
      rfiRequestId,
      checkedById,
    } = body;

    if (!projectId || !productionLogId || !partDesignation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const inspectionNumber = await generateInspectionNumber();

    const inspection = await prisma.dimensionalInspection.create({
      data: {
        inspectionNumber,
        projectId,
        buildingId: buildingId || null,
        productionLogId,
        rfiRequestId: rfiRequestId || null,
        partDesignation,
        drawingReference: drawingReference || null,
        measuredLength: measuredLength ? parseFloat(measuredLength) : null,
        requiredLength: requiredLength ? parseFloat(requiredLength) : null,
        lengthTolerance: lengthTolerance ? parseFloat(lengthTolerance) : null,
        measuredWidth: measuredWidth ? parseFloat(measuredWidth) : null,
        requiredWidth: requiredWidth ? parseFloat(requiredWidth) : null,
        widthTolerance: widthTolerance ? parseFloat(widthTolerance) : null,
        measuredHeight: measuredHeight ? parseFloat(measuredHeight) : null,
        requiredHeight: requiredHeight ? parseFloat(requiredHeight) : null,
        heightTolerance: heightTolerance ? parseFloat(heightTolerance) : null,
        measuredThickness: measuredThickness ? parseFloat(measuredThickness) : null,
        requiredThickness: requiredThickness ? parseFloat(requiredThickness) : null,
        thicknessTolerance: thicknessTolerance ? parseFloat(thicknessTolerance) : null,
        straightness: straightness || null,
        flatness: flatness || null,
        squareness: squareness || null,
        inspectorId: session.sub,
        checkedById: checkedById || null,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
        toleranceCheck: toleranceCheck || 'Pending',
        result: result || 'Pending',
        approvalStatus: 'Draft',
        remarks: remarks || null,
        attachments: attachments || null,
      },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        building: { select: { id: true, designation: true, name: true } },
        productionLog: {
          include: { assemblyPart: { select: assemblyPartSelect } },
        },
        inspector: { select: userSelect },
        checkedBy: { select: userSelect },
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Error creating dimensional inspection');
    return NextResponse.json(
      { error: 'Failed to create dimensional inspection' },
      { status: 500 }
    );
  }
}
