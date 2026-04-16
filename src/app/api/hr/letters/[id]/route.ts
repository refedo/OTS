/**
 * GET    /api/hr/letters/[id]
 * PUT    /api/hr/letters/[id]
 * DELETE /api/hr/letters/[id]  — soft delete
 *
 * 18.16.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  content: z.string().max(50000).nullable().optional(),
  attachmentUrl: z.string().max(1000).nullable().optional(),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).nullable().optional(),
  letterType: z.enum([
    'QUESTIONING', 'ATTENTION', 'FIRST_WARNING', 'FINAL_WARNING',
    'NON_RENEWAL_NOTICE', 'DISMISSAL', 'CIRCULATION', 'WORK_COMMENCEMENT',
    'SALARY_CERTIFICATE', 'LEAVE_NOTICE', 'RETURN_FROM_LEAVE',
    'PROBATION_EVALUATION', 'PERFORMANCE_APPRAISAL', 'CLEARANCE_FORM',
    'SALARY_NON_DISCLOSURE', 'OTHER',
  ]).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withApiContext(async (_req: NextRequest, _session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const letter = await prisma.hrLetter.findFirst({
    where: { id, deletedAt: null },
    include: {
      employee: { select: { id: true, fullNameEn: true, employmentId: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(letter);
});

export const PUT = withApiContext(async (req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const letter = await prisma.hrLetter.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  try {
    const updated = await prisma.hrLetter.update({
      where: { id },
      data: {
        ...(d.subject !== undefined ? { subject: d.subject } : {}),
        ...(d.content !== undefined ? { content: d.content } : {}),
        ...(d.attachmentUrl !== undefined ? { attachmentUrl: d.attachmentUrl } : {}),
        ...(d.issuedAt !== undefined ? { issuedAt: new Date(d.issuedAt) } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        ...(d.letterType !== undefined ? { letterType: d.letterType } : {}),
        updatedById: session!.userId,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update HR letter');
    return NextResponse.json({ error: 'Failed to update letter' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (_req: NextRequest, session, ctx: RouteParams) => {
  const { id } = await ctx.params;
  const letter = await prisma.hrLetter.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!letter) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await prisma.hrLetter.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session!.userId },
    });
    logger.info({ id }, '[Letters] Deleted');
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete HR letter');
    return NextResponse.json({ error: 'Failed to delete letter' }, { status: 500 });
  }
});
