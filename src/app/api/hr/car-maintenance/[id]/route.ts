/**
 * GET    /api/hr/car-maintenance/[id]  — get single maintenance record
 * PUT    /api/hr/car-maintenance/[id]  — update maintenance record
 * DELETE /api/hr/car-maintenance/[id]  — soft-delete
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  maintenanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maintenanceType: z
    .enum([
      'OIL_CHANGE', 'BRAKE_SERVICE', 'TIRE_ROTATION', 'TIRE_REPLACEMENT',
      'BATTERY_REPLACEMENT', 'AC_SERVICE', 'GENERAL_SERVICE', 'INSPECTION',
      'REPAIR', 'ACCIDENT_REPAIR', 'FILTER_REPLACEMENT', 'SPARK_PLUGS',
      'TRANSMISSION_SERVICE', 'COOLANT_FLUSH', 'OTHER',
    ])
    .optional(),
  description: z.string().min(1).max(500).optional(),
  serviceCenter: z.string().max(200).nullable().optional(),
  odometer: z.coerce.number().int().min(0).nullable().optional(),
  cost: z.coerce.number().min(0).nullable().optional(),
  nextServiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  nextServiceOdometer: z.coerce.number().int().min(0).nullable().optional(),
  partsReplaced: z.string().max(500).nullable().optional(),
  invoiceNumber: z.string().max(100).nullable().optional(),
  technician: z.string().max(200).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const deleteSchema = z.object({
  deleteReason: z.string().min(1).max(500),
});

export const GET = withApiContext(async (req: NextRequest, _session, ctx) => {
  const id = ctx?.params?.id as string;
  try {
    const record = await prisma.carMaintenanceRecord.findFirst({
      where: { id, deletedAt: null },
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
            vehicleColor: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch maintenance record');
    return NextResponse.json({ error: 'Failed to fetch maintenance record' }, { status: 500 });
  }
});

export const PUT = withApiContext(async (req: NextRequest, session, ctx) => {
  const id = ctx?.params?.id as string;
  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const record = await prisma.carMaintenanceRecord.findFirst({ where: { id, deletedAt: null } });
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  const d = parsed.data;
  try {
    const updated = await prisma.carMaintenanceRecord.update({
      where: { id },
      data: {
        ...(d.maintenanceDate !== undefined ? { maintenanceDate: new Date(d.maintenanceDate) } : {}),
        ...(d.maintenanceType !== undefined ? { maintenanceType: d.maintenanceType } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.serviceCenter !== undefined ? { serviceCenter: d.serviceCenter } : {}),
        ...(d.odometer !== undefined ? { odometer: d.odometer } : {}),
        ...(d.cost !== undefined ? { cost: d.cost != null ? d.cost.toString() : null } : {}),
        ...(d.nextServiceDate !== undefined ? { nextServiceDate: d.nextServiceDate ? new Date(d.nextServiceDate) : null } : {}),
        ...(d.nextServiceOdometer !== undefined ? { nextServiceOdometer: d.nextServiceOdometer } : {}),
        ...(d.partsReplaced !== undefined ? { partsReplaced: d.partsReplaced } : {}),
        ...(d.invoiceNumber !== undefined ? { invoiceNumber: d.invoiceNumber } : {}),
        ...(d.technician !== undefined ? { technician: d.technician } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedById: session!.userId,
      },
    });
    logger.info({ recordId: id }, '[CarMaintenance] Updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update maintenance record');
    return NextResponse.json({ error: 'Failed to update maintenance record' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, ctx) => {
  const id = ctx?.params?.id as string;
  const body: unknown = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'deleteReason is required' }, { status: 400 });
  }

  const record = await prisma.carMaintenanceRecord.findFirst({ where: { id, deletedAt: null } });
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  try {
    await prisma.carMaintenanceRecord.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session!.userId,
        deleteReason: parsed.data.deleteReason,
      },
    });
    logger.info({ recordId: id }, '[CarMaintenance] Soft-deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete maintenance record');
    return NextResponse.json({ error: 'Failed to delete maintenance record' }, { status: 500 });
  }
});
