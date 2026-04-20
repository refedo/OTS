import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

type RouteParams = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  titleEn: z.string().min(1).optional(),
  titleAr: z.string().optional(),
  contentEn: z.string().optional(),
  contentAr: z.string().optional(),
  category: z.string().min(1).optional(),
  version: z.string().optional(),
  effectiveDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export const PUT = withApiContext(async (req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const policy = await prisma.hrPolicy.findFirst({ where: { id, deletedAt: null } });
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  await prisma.hrPolicy.update({
    where: { id },
    data: {
      ...(d.titleEn !== undefined && { titleEn: d.titleEn }),
      ...(d.titleAr !== undefined && { titleAr: d.titleAr || null }),
      ...(d.contentEn !== undefined && { contentEn: d.contentEn || null }),
      ...(d.contentAr !== undefined && { contentAr: d.contentAr || null }),
      ...(d.category !== undefined && { category: d.category }),
      ...(d.version !== undefined && { version: d.version }),
      ...(d.effectiveDate !== undefined && { effectiveDate: new Date(d.effectiveDate) }),
      ...(d.status !== undefined && { status: d.status }),
      updatedById: session!.userId,
    },
  });
  logger.info({ id }, '[HR] Policy updated');
  return NextResponse.json({ success: true });
});

export const DELETE = withApiContext(async (_req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const policy = await prisma.hrPolicy.findFirst({ where: { id, deletedAt: null } });
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.hrPolicy.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: session!.userId },
  });
  logger.info({ id }, '[HR] Policy deleted');
  return NextResponse.json({ success: true });
});
