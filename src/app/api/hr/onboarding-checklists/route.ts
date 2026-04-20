import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  forPositions: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const GET = withApiContext(async (_req: NextRequest, _session) => {
  const checklists = await prisma.hrOnboardingChecklist.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      tasks: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  return NextResponse.json(checklists);
});

export const POST = withApiContext(async (req: NextRequest, _session) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const checklist = await prisma.hrOnboardingChecklist.create({ data: parsed.data });
  logger.info({ id: checklist.id }, '[HR] Onboarding checklist created');
  return NextResponse.json(checklist, { status: 201 });
});
