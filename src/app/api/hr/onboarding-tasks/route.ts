import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  labelEn: z.string().min(1),
  labelAr: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const GET = withApiContext(async (_req: NextRequest, _session) => {
  const tasks = await prisma.hrOnboardingTask.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(tasks);
});

export const POST = withApiContext(async (req: NextRequest, _session) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const task = await prisma.hrOnboardingTask.create({ data: parsed.data });
  logger.info({ id: task.id }, '[HR] Onboarding task created');
  return NextResponse.json(task, { status: 201 });
});
