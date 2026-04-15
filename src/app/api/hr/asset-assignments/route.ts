/**
 * GET /api/hr/asset-assignments  — list assignment events (unified log or per-employee)
 *
 * Query params (all optional):
 *   employeeId  — filter to a specific employee (used by employee detail Assets tab)
 *   status      — ACTIVE | RETURNED
 *   category    — CAR | LAPTOP | SIM_CARD | …
 *   search      — matches employee name, employmentId, asset code, asset name
 *
 * 18.12.0 / updated 18.14.0 — removed hard employeeId requirement; added filters
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AssetCategory, AssetAssignmentStatus } from '@prisma/client';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  try {
    const assignments = await prisma.assetAssignment.findMany({
      where: {
        deletedAt: null,
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status: status as AssetAssignmentStatus } : {}),
        ...(category ? { asset: { category: category as AssetCategory } } : {}),
        ...(search
          ? {
              OR: [
                { employee: { fullNameEn: { contains: search } } },
                { employee: { employmentId: { contains: search } } },
                { asset: { assetCode: { contains: search } } },
                { asset: { name: { contains: search } } },
              ],
            }
          : {}),
      },
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
        employee: {
          select: {
            id: true,
            fullNameEn: true,
            employmentId: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(assignments);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch asset assignments');
    return NextResponse.json({ error: 'Failed to fetch asset assignments' }, { status: 500 });
  }
});
