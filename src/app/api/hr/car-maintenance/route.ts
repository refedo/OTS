/**
 * GET  /api/hr/car-maintenance?assetId=…  — list maintenance records for a vehicle
 * POST /api/hr/car-maintenance            — create a maintenance record
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import type { MaintenanceType } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  assetId: z.string().uuid(),
  maintenanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maintenanceType: z.enum([
    'OIL_CHANGE', 'BRAKE_SERVICE', 'TIRE_ROTATION', 'TIRE_REPLACEMENT',
    'BATTERY_REPLACEMENT', 'AC_SERVICE', 'GENERAL_SERVICE', 'INSPECTION',
    'REPAIR', 'ACCIDENT_REPAIR', 'FILTER_REPLACEMENT', 'SPARK_PLUGS',
    'TRANSMISSION_SERVICE', 'COOLANT_FLUSH', 'OTHER',
  ]),
  description: z.string().min(1).max(500),
  serviceCenter: z.string().max(200).optional(),
  odometer: z.coerce.number().int().min(0).optional(),
  cost: z.coerce.number().min(0).optional(),
  nextServiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nextServiceOdometer: z.coerce.number().int().min(0).optional(),
  partsReplaced: z.string().max(500).optional(),
  invoiceNumber: z.string().max(100).optional(),
  technician: z.string().max(200).optional(),
  notes: z.string().optional(),
});

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get('assetId');
  const type = searchParams.get('type');

  try {
    const records = await prisma.carMaintenanceRecord.findMany({
      where: {
        deletedAt: null,
        ...(assetId ? { assetId } : {}),
        ...(type ? { maintenanceType: type as MaintenanceType } : {}),
      },
      orderBy: { maintenanceDate: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            plateNumber: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch maintenance records');
    return NextResponse.json({ error: 'Failed to fetch maintenance records' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const asset = await prisma.asset.findFirst({
    where: { id: d.assetId, deletedAt: null },
    select: { id: true, category: true },
  });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  if (asset.category !== 'CAR') {
    return NextResponse.json({ error: 'Maintenance records are only for CAR assets' }, { status: 400 });
  }

  try {
    const record = await prisma.$transaction(async (tx) => {
      const r = await tx.carMaintenanceRecord.create({
        data: {
          assetId: d.assetId,
          maintenanceDate: new Date(d.maintenanceDate),
          maintenanceType: d.maintenanceType,
          description: d.description,
          serviceCenter: d.serviceCenter ?? null,
          odometer: d.odometer ?? null,
          cost: d.cost != null ? d.cost.toString() : null,
          nextServiceDate: d.nextServiceDate ? new Date(d.nextServiceDate) : null,
          nextServiceOdometer: d.nextServiceOdometer ?? null,
          partsReplaced: d.partsReplaced ?? null,
          invoiceNumber: d.invoiceNumber ?? null,
          technician: d.technician ?? null,
          notes: d.notes ?? null,
          createdById: session!.userId,
        },
      });
      if (d.odometer != null) {
        await tx.asset.update({
          where: { id: d.assetId },
          data: { currentOdometer: d.odometer, updatedById: session!.userId },
        });
      }
      return r;
    });

    logger.info({ recordId: record.id, assetId: d.assetId }, '[CarMaintenance] Created');
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create maintenance record');
    return NextResponse.json({ error: 'Failed to create maintenance record' }, { status: 500 });
  }
});
