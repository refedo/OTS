import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  scopeLabel: z.string().min(1).optional(),
  customLabel: z.string().optional().nullable(),
  specification: z.string().optional().nullable(),
});

export const GET = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/scope-of-work/')[1]?.split('?')[0];
    const scope = await prisma.scopeOfWork.findUnique({
      where: { id },
      include: {
        building: { select: { id: true, name: true, designation: true } },
        activities: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!scope) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(scope);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch scope of work');
    return NextResponse.json({ error: 'Failed to fetch scope of work' }, { status: 500 });
  }
});

export const PUT = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/scope-of-work/')[1]?.split('?')[0];
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const scope = await prisma.scopeOfWork.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(scope);
  } catch (error) {
    logger.error({ error }, 'Failed to update scope of work');
    return NextResponse.json({ error: 'Failed to update scope of work' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/scope-of-work/')[1]?.split('?')[0];

    // Delete associated activities first (cascades), then the scope
    await prisma.scopeOfWork.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete scope of work');
    return NextResponse.json({ error: 'Failed to delete scope of work' }, { status: 500 });
  }
});
