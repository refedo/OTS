import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  labelEn: z.string().min(1).optional(),
  labelAr: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const PUT = withApiContext(async (req: NextRequest, _session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const task = await prisma.hrOnboardingTask.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await prisma.hrOnboardingTask.update({ where: { id }, data: parsed.data });
  logger.info({ id }, '[HR] Onboarding task updated');
  return NextResponse.json(updated);
});

export const DELETE = withApiContext(async (_req: NextRequest, _session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const task = await prisma.hrOnboardingTask.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.hrOnboardingTask.delete({ where: { id } });
  logger.info({ id }, '[HR] Onboarding task deleted');
  return NextResponse.json({ success: true });
});
