/**
 * GET    /api/hr/assets/[id]   — get single asset with assignments + maintenance
 * PUT    /api/hr/assets/[id]   — update asset
 * DELETE /api/hr/assets/[id]   — soft-delete asset
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  assetCode: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED', 'DAMAGED', 'LOST']).optional(),
  plateNumber: z.string().max(30).nullable().optional(),
  vehicleMake: z.string().max(100).nullable().optional(),
  vehicleModel: z.string().max(100).nullable().optional(),
  vehicleYear: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  vehicleColor: z.string().max(50).nullable().optional(),
  vin: z.string().max(50).nullable().optional(),
  currentOdometer: z.coerce.number().int().min(0).nullable().optional(),
  simNumber: z.string().max(30).nullable().optional(),
  mobileNumber: z.string().max(30).nullable().optional(),
  carrier: z.string().max(100).nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  make: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  purchasePrice: z.coerce.number().min(0).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  notes: z.string().nullable().optional(),
  licenseExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    uploadedAt: z.string(),
    label: z.string().optional(),
  })).nullable().optional(),
});

const deleteSchema = z.object({
  deleteReason: z.string().min(1).max(500),
});

export const GET = withApiContext(async (req: NextRequest, _session, ctx) => {
  const id = ctx?.params?.id as string;
  try {
    const asset = await prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignments: {
          where: { deletedAt: null },
          orderBy: { assignedDate: 'desc' },
          include: {
            employee: { select: { id: true, fullNameEn: true, employmentId: true, occupation: true } },
            createdBy: { select: { id: true, name: true } },
          },
        },
        maintenanceRecords: {
          where: { deletedAt: null },
          orderBy: { maintenanceDate: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        violations: {
          where: { deletedAt: null },
          orderBy: { violationDate: 'desc' },
          include: {
            employee: { select: { id: true, fullNameEn: true, employmentId: true } },
            createdBy: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    return NextResponse.json(asset);
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch asset');
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
});

export const PUT = withApiContext(async (req: NextRequest, session, ctx) => {
  const id = ctx?.params?.id as string;
  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const asset = await prisma.asset.findFirst({ where: { id, deletedAt: null } });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  const d = parsed.data;

  // If assetCode is changing, check uniqueness
  if (d.assetCode && d.assetCode !== asset.assetCode) {
    const conflict = await prisma.asset.findFirst({ where: { assetCode: d.assetCode, deletedAt: null, id: { not: id } } });
    if (conflict) return NextResponse.json({ error: `Asset code "${d.assetCode}" is already in use` }, { status: 409 });
  }

  try {
    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(d.assetCode !== undefined ? { assetCode: d.assetCode } : {}),
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.plateNumber !== undefined ? { plateNumber: d.plateNumber } : {}),
        ...(d.vehicleMake !== undefined ? { vehicleMake: d.vehicleMake } : {}),
        ...(d.vehicleModel !== undefined ? { vehicleModel: d.vehicleModel } : {}),
        ...(d.vehicleYear !== undefined ? { vehicleYear: d.vehicleYear } : {}),
        ...(d.vehicleColor !== undefined ? { vehicleColor: d.vehicleColor } : {}),
        ...(d.vin !== undefined ? { vin: d.vin } : {}),
        ...(d.currentOdometer !== undefined ? { currentOdometer: d.currentOdometer } : {}),
        ...(d.simNumber !== undefined ? { simNumber: d.simNumber } : {}),
        ...(d.mobileNumber !== undefined ? { mobileNumber: d.mobileNumber } : {}),
        ...(d.carrier !== undefined ? { carrier: d.carrier } : {}),
        ...(d.serialNumber !== undefined ? { serialNumber: d.serialNumber } : {}),
        ...(d.make !== undefined ? { make: d.make } : {}),
        ...(d.model !== undefined ? { model: d.model } : {}),
        ...(d.purchaseDate !== undefined ? { purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : null } : {}),
        ...(d.purchasePrice !== undefined ? { purchasePrice: d.purchasePrice != null ? d.purchasePrice.toString() : null } : {}),
        ...(d.location !== undefined ? { location: d.location } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        ...(d.licenseExpiryDate !== undefined ? { licenseExpiryDate: d.licenseExpiryDate ? new Date(d.licenseExpiryDate) : null } : {}),
        ...(d.attachments !== undefined ? { attachments: d.attachments } : {}),
        updatedById: session!.userId,
      },
    });
    logger.info({ assetId: id }, '[Assets] Updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update asset');
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, ctx) => {
  const id = ctx?.params?.id as string;
  const body: unknown = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const asset = await prisma.asset.findFirst({ where: { id, deletedAt: null } });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  const activeAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId: id, status: 'ACTIVE', deletedAt: null },
  });
  if (activeAssignment) {
    return NextResponse.json({ error: 'Cannot delete an asset that is currently assigned. Return it first.' }, { status: 409 });
  }

  try {
    await prisma.asset.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session!.userId,
        deleteReason: parsed.data.deleteReason,
      },
    });
    logger.info({ assetId: id }, '[Assets] Soft-deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete asset');
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
});
