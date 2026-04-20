import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  titleEn: z.string().min(1).optional(),
  titleAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  category: z.string().optional(),
  durationHours: z.number().int().min(0).optional(),
  targetAudience: z.string().optional(),
  scheduledDate: z.string().nullable().optional(),
  status: z.enum(['PLANNED', 'UPCOMING', 'ONGOING', 'COMPLETED']).optional(),
  notes: z.string().optional(),
});

export const PUT = withApiContext(async (req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const program = await prisma.hrTrainingProgram.findFirst({ where: { id, deletedAt: null } });
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  await prisma.hrTrainingProgram.update({
    where: { id },
    data: {
      ...(d.titleEn !== undefined && { titleEn: d.titleEn }),
      ...(d.titleAr !== undefined && { titleAr: d.titleAr || null }),
      ...(d.descriptionEn !== undefined && { descriptionEn: d.descriptionEn || null }),
      ...(d.descriptionAr !== undefined && { descriptionAr: d.descriptionAr || null }),
      ...(d.category !== undefined && { category: d.category }),
      ...(d.durationHours !== undefined && { durationHours: d.durationHours }),
      ...(d.targetAudience !== undefined && { targetAudience: d.targetAudience || null }),
      ...(d.scheduledDate !== undefined && { scheduledDate: d.scheduledDate ? new Date(d.scheduledDate) : null }),
      ...(d.status !== undefined && { status: d.status }),
      ...(d.notes !== undefined && { notes: d.notes || null }),
    },
  });
  logger.info({ id }, '[HR] Training program updated');
  return NextResponse.json({ success: true });
});

export const DELETE = withApiContext(async (_req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const program = await prisma.hrTrainingProgram.findFirst({ where: { id, deletedAt: null } });
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.hrTrainingProgram.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: session!.userId },
  });
  logger.info({ id }, '[HR] Training program deleted');
  return NextResponse.json({ success: true });
});
