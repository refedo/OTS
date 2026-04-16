/**
 * GET  /api/hr/assets          — list all assets (filterable by category, status, search)
 * POST /api/hr/assets          — create a new asset
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AssetCategory, AssetStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  assetCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.enum(['CAR', 'SIM_CARD', 'LAPTOP', 'TABLET', 'PHONE', 'KEY', 'TOOL', 'EQUIPMENT', 'OTHER']),
  // Car-specific
  plateNumber: z.string().max(30).nullish(),
  vehicleMake: z.string().max(100).nullish(),
  vehicleModel: z.string().max(100).nullish(),
  vehicleYear: z.preprocess(v => v == null ? undefined : v, z.coerce.number().int().min(1900).max(2100)).optional(),
  vehicleColor: z.string().max(50).nullish(),
  vin: z.string().max(50).nullish(),
  currentOdometer: z.preprocess(v => v == null ? undefined : v, z.coerce.number().int().min(0)).optional(),
  // SIM-specific
  simNumber: z.string().max(30).nullish(),
  mobileNumber: z.string().max(30).nullish(),
  carrier: z.string().max(100).nullish(),
  // General
  serialNumber: z.string().max(100).nullish(),
  make: z.string().max(100).nullish(),
  model: z.string().max(100).nullish(),
  purchaseDate: z.preprocess(v => v == null ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  purchasePrice: z.preprocess(v => v == null ? undefined : v, z.coerce.number().min(0)).optional(),
  location: z.string().max(200).nullish(),
  notes: z.string().nullish(),
  licenseExpiryDate: z.preprocess(v => v == null ? undefined : v, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    filePath: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    uploadedAt: z.string(),
    label: z.string().optional(),
  })).optional(),
});

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  try {
    const assets = await prisma.asset.findMany({
      where: {
        deletedAt: null,
        ...(category ? { category: category as AssetCategory } : {}),
        ...(status ? { status: status as AssetStatus } : {}),
        ...(search
          ? {
              OR: [
                { assetCode: { contains: search } },
                { name: { contains: search } },
                { plateNumber: { contains: search } },
                { serialNumber: { contains: search } },
                { vehicleMake: { contains: search } },
                { vehicleModel: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        assetSn: true,
        assetCode: true,
        name: true,
        category: true,
        status: true,
        plateNumber: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehicleColor: true,
        vin: true,
        currentOdometer: true,
        simNumber: true,
        mobileNumber: true,
        carrier: true,
        serialNumber: true,
        make: true,
        model: true,
        purchaseDate: true,
        purchasePrice: true,
        location: true,
        notes: true,
        licenseExpiryDate: true,
        attachments: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
        assignments: {
          where: { status: 'ACTIVE', deletedAt: null },
          select: {
            id: true,
            assignedDate: true,
            employee: { select: { id: true, fullNameEn: true, employmentId: true } },
          },
          take: 1,
        },
      },
    });
    return NextResponse.json(assets);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch assets');
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const existing = await prisma.asset.findFirst({ where: { assetCode: d.assetCode, deletedAt: null } });
  if (existing) {
    return NextResponse.json({ error: `Asset code "${d.assetCode}" is already in use` }, { status: 409 });
  }

  // Auto-assign sequential SN (continuous across all asset types)
  const maxSnRow = await prisma.asset.findFirst({
    where: { assetSn: { not: null } },
    orderBy: { assetSn: 'desc' },
    select: { assetSn: true },
  });
  const nextSn = (maxSnRow?.assetSn ?? 0) + 1;

  try {
    const asset = await prisma.asset.create({
      data: {
        assetSn: nextSn,
        assetCode: d.assetCode,
        name: d.name,
        category: d.category,
        status: 'AVAILABLE',
        plateNumber: d.plateNumber ?? null,
        vehicleMake: d.vehicleMake ?? null,
        vehicleModel: d.vehicleModel ?? null,
        vehicleYear: d.vehicleYear ?? null,
        vehicleColor: d.vehicleColor ?? null,
        vin: d.vin ?? null,
        currentOdometer: d.currentOdometer ?? null,
        simNumber: d.simNumber ?? null,
        mobileNumber: d.mobileNumber ?? null,
        carrier: d.carrier ?? null,
        serialNumber: d.serialNumber ?? null,
        make: d.make ?? null,
        model: d.model ?? null,
        purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : null,
        purchasePrice: d.purchasePrice != null ? d.purchasePrice.toString() : null,
        location: d.location ?? null,
        notes: d.notes ?? null,
        licenseExpiryDate: d.licenseExpiryDate ? new Date(d.licenseExpiryDate) : null,
        attachments: d.attachments ?? null,
        createdById: session!.userId,
      },
    });
    logger.info({ assetId: asset.id, assetCode: d.assetCode }, '[Assets] Created');
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create asset');
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
});
