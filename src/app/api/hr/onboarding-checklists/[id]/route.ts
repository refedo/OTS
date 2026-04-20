import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  nameEn: z.string().min(1).optional(),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  forPositions: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const PUT = withApiContext(async (req: NextRequest, _session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const checklist = await prisma.hrOnboardingChecklist.findUnique({ where: { id } });
  if (!checklist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await prisma.hrOnboardingChecklist.update({ where: { id }, data: parsed.data });
  logger.info({ id }, '[HR] Onboarding checklist updated');
  return NextResponse.json(updated);
});

export const DELETE = withApiContext(async (_req: NextRequest, _session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const checklist = await prisma.hrOnboardingChecklist.findUnique({ where: { id } });
  if (!checklist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.hrOnboardingTask.deleteMany({ where: { checklistId: id } });
  await prisma.hrOnboardingChecklist.delete({ where: { id } });
  logger.info({ id }, '[HR] Onboarding checklist deleted');
  return NextResponse.json({ success: true });
});
