/**
 * POST /api/hr/letters/[id]/cancel  — CEO cancels/voids an issued letter
 *
 * 22.6.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withApiContext(async (req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;

  const permissions = await resolveUserPermissions(session!.userId);
  if (!permissions.includes('hr.letters.approveCeo') && !permissions.includes('ALL')) {
    return NextResponse.json({ error: 'Forbidden — CEO permission required' }, { status: 403 });
  }

  const letter = await prisma.hrLetter.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true, letterNumber: true },
  });
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (letter.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Letter is already cancelled' }, { status: 422 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await prisma.hrLetter.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: parsed.data.reason
          ? `[Cancelled] ${parsed.data.reason}`
          : '[Cancelled by CEO]',
        updatedById: session!.userId,
      },
    });

    logger.info({ letterId: id, letterNumber: letter.letterNumber, cancelledBy: session!.userId }, '[Letters] Cancelled');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to cancel HR letter');
    return NextResponse.json({ error: 'Failed to cancel letter' }, { status: 500 });
  }
});
