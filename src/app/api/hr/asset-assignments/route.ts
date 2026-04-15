/**
 * GET /api/hr/asset-assignments?employeeId=…  — list assignments for one employee
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId query param required' }, { status: 400 });
  }

  try {
    const assignments = await prisma.assetAssignment.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { assignedDate: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            category: true,
            status: true,
            plateNumber: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleColor: true,
            simNumber: true,
            mobileNumber: true,
            serialNumber: true,
            make: true,
            model: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(assignments);
  } catch (error) {
    logger.error({ error, employeeId }, 'Failed to fetch asset assignments');
    return NextResponse.json({ error: 'Failed to fetch asset assignments' }, { status: 500 });
  }
});
