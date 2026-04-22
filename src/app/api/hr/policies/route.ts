import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  titleEn: z.string().min(1),
  titleAr: z.string().optional(),
  contentEn: z.string().optional(),
  contentAr: z.string().optional(),
  category: z.string().min(1),
  version: z.string().default('v1.0'),
  effectiveDate: z.string().min(1),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  attachmentUrl: z.string().max(1000).optional(),
});

export const GET = withApiContext(async (_req: NextRequest, session) => {
  const policies = await prisma.hrPolicy.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, titleEn: true, titleAr: true, contentEn: true, contentAr: true,
      category: true, version: true, effectiveDate: true, status: true,
      attachmentUrl: true,
      createdAt: true, updatedAt: true,
    },
  });
  const serialized = policies.map(p => ({
    ...p,
    effectiveDate: p.effectiveDate.toISOString().slice(0, 10),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
  return NextResponse.json(serialized);
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const policy = await prisma.hrPolicy.create({
    data: {
      titleEn: d.titleEn,
      titleAr: d.titleAr || null,
      contentEn: d.contentEn || null,
      contentAr: d.contentAr || null,
      category: d.category,
      version: d.version,
      effectiveDate: new Date(d.effectiveDate),
      status: d.status,
      attachmentUrl: d.attachmentUrl || null,
      createdById: session!.userId,
    },
  });
  logger.info({ id: policy.id }, '[HR] Policy created');
  return NextResponse.json({ id: policy.id }, { status: 201 });
});
