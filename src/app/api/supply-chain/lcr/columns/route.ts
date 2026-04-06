import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { DEFAULT_LCR_COL_MAP, type LcrColKey } from '@/lib/sync/lcrSync';

const mappingSchema = z.record(z.string(), z.number().int().min(0).max(99));

export const GET = withApiContext(async (_req, _session) => {
  try {
    const settings = await prisma.systemSettings.findFirst({ select: { lcrColumnMapping: true } });
    const saved = (settings?.lcrColumnMapping ?? {}) as Record<string, number>;
    // Merge saved over defaults so the response always has all keys
    const mapping: Record<LcrColKey, number> = { ...DEFAULT_LCR_COL_MAP, ...saved } as Record<LcrColKey, number>;
    return NextResponse.json({ mapping, defaults: DEFAULT_LCR_COL_MAP });
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
  const parsed = mappingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid mapping', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    let settings = await prisma.systemSettings.findFirst({ select: { id: true } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: {} });
    }
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { lcrColumnMapping: parsed.data },
    });
    logger.info({ updatedBy: session.userId }, 'LCR column mapping updated');
    return NextResponse.json({ success: true, mapping: parsed.data });
  } catch (error) {
    logger.error({ error }, 'Failed to save LCR column mapping');
    return NextResponse.json({ error: 'Failed to save mapping' }, { status: 500 });
  }
});
