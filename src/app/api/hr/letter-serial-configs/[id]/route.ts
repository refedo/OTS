/**
 * PUT    /api/hr/letter-serial-configs/[id]  — update prefix / mask / resetYearly
 * DELETE /api/hr/letter-serial-configs/[id]  — delete config (reverts to INT/EXT default)
 *
 * 19.1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  prefix: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'Prefix must be uppercase letters/digits only').optional(),
  mask: z.string().min(1).max(100).optional(),
  resetYearly: z.boolean().optional(),
  resetSeq: z.boolean().optional(), // if true, resets currentSeq to 0
});

type RouteParams = { params: Promise<{ id: string }> };

export const PUT = withApiContext(async (req: NextRequest, _session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const config = await prisma.hrLetterSerialConfig.findUnique({ where: { id } });
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  try {
    const updated = await prisma.hrLetterSerialConfig.update({
      where: { id },
      data: {
        ...(d.prefix !== undefined ? { prefix: d.prefix.toUpperCase() } : {}),
        ...(d.mask !== undefined ? { mask: d.mask } : {}),
        ...(d.resetYearly !== undefined ? { resetYearly: d.resetYearly } : {}),
        ...(d.resetSeq ? { currentSeq: 0, lastResetYear: null } : {}),
      },
    });
    logger.info({ id }, '[LetterSerial] Config updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update letter serial config');
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (_req: NextRequest, _session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const config = await prisma.hrLetterSerialConfig.findUnique({ where: { id } });
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await prisma.hrLetterSerialConfig.delete({ where: { id } });
    logger.info({ id, letterType: config.letterType }, '[LetterSerial] Config deleted');
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete letter serial config');
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 });
  }
});
