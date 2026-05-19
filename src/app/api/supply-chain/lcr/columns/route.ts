import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { DEFAULT_LCR_COL_MAP, loadColMap } from '@/lib/sync/lcrSync';

export const dynamic = 'force-dynamic';

const mappingSchema = z.record(z.string(), z.number().int().min(0).max(499));

export const GET = withApiContext(async (_req, _session) => {
  try {
    const [mapping, settings] = await Promise.all([
      loadColMap(),
      prisma.systemSettings.findFirst({
        select: { lcrMinProjectNumber: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return NextResponse.json({
      mapping,
      defaults: DEFAULT_LCR_COL_MAP,
      minProjectNumber: settings?.lcrMinProjectNumber ?? null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch LCR column mapping');
    return NextResponse.json({ error: 'Failed to fetch mapping' }, { status: 500 });
  }
});

export const PATCH = withApiContext(async (req: NextRequest, session) => {
  if (!session || !['Admin', 'CEO'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Support both { mapping: {...}, minProjectNumber: N } and bare mapping objects
  let rawMapping: unknown;
  let minProjectNumber: number | null | undefined;

  if (body && typeof body === 'object' && ('mapping' in body || 'minProjectNumber' in body)) {
    rawMapping = body.mapping;
    minProjectNumber = body.minProjectNumber;
  } else {
    rawMapping = body;
  }

  const parsed = mappingSchema.safeParse(rawMapping ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid mapping', details: parsed.error.flatten() }, { status: 400 });
  }

  const minSchema = z.number().int().min(0).nullable().optional();
  const parsedMin = minSchema.safeParse(minProjectNumber);
  if (!parsedMin.success) {
    return NextResponse.json({ error: 'Invalid minProjectNumber' }, { status: 400 });
  }

  try {
    let settings = await prisma.systemSettings.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: {} });
    }

    const updateData: Record<string, unknown> = { lcrColumnMapping: parsed.data };
    if (parsedMin.data !== undefined) {
      updateData.lcrMinProjectNumber = parsedMin.data ?? null;
    }

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: updateData,
    });
    logger.info({ updatedBy: session.userId }, 'LCR column mapping updated');
    return NextResponse.json({ success: true, mapping: parsed.data, minProjectNumber: parsedMin.data });
  } catch (error) {
    logger.error({ error }, 'Failed to save LCR column mapping');
    return NextResponse.json({ error: 'Failed to save mapping' }, { status: 500 });
  }
});
