import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  isApplicable: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const PUT = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/building-activities/')[1]?.split('?')[0];
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const activity = await prisma.buildingActivity.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(activity);
  } catch (error) {
    logger.error({ error }, 'Failed to update building activity');
    return NextResponse.json({ error: 'Failed to update building activity' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/building-activities/')[1]?.split('?')[0];
    await prisma.buildingActivity.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete building activity');
    return NextResponse.json({ error: 'Failed to delete building activity' }, { status: 500 });
  }
});
