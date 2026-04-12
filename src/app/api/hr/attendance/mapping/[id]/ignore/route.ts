/**
 * POST /api/hr/attendance/mapping/[id]/ignore — permanently ignore a
 * mapping candidate (false-positive row: e.g. a removed worker who still
 * appears in the sheet header, a typo, a totals column mistaken for a
 * worker, etc.).
 *
 * Subsequent attendance syncs will drop every column for this identifier
 * entirely — no attendance rows, no orphan report, no new candidate row.
 *
 * DELETE on the same route un-ignores the candidate by flipping status
 * back to UNMAPPED. Used by the "restore" action in the mapping UI.
 *
 * Phase 2.5 of OTS-MSS-HR-PAYROLL-v1. Gated by `hr.attendance.sync`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

const ignoreSchema = z.object({
  reason: z.string().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canResolve = await checkPermission('hr.attendance.sync');
  if (!canResolve) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const parsed = ignoreSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const candidate = await prisma.attendanceMappingCandidate.findUnique({
      where: { id },
    });
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const updated = await prisma.attendanceMappingCandidate.update({
      where: { id },
      data: {
        status: 'IGNORED',
        ignoredById: session.sub,
        ignoredAt: new Date(),
        ignoreReason: parsed.data.reason ?? null,
        // Un-link any existing resolution — a candidate is either mapped
        // to an employee or ignored, never both.
        resolvedEmployeeId: null,
        resolvedById: null,
        resolvedAt: null,
      },
    });

    logger.info(
      {
        candidateId: id,
        identifier: candidate.identifier,
        workerType: candidate.workerType,
        reason: parsed.data.reason ?? null,
        userId: session.sub,
      },
      '[HR Mapping] Candidate ignored',
    );

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, candidateId: id }, '[HR Mapping] Ignore failed');
    return NextResponse.json({ error: 'Failed to ignore candidate' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canResolve = await checkPermission('hr.attendance.sync');
  if (!canResolve) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;

  try {
    const updated = await prisma.attendanceMappingCandidate.update({
      where: { id },
      data: {
        status: 'UNMAPPED',
        ignoredAt: null,
        ignoredById: null,
        ignoreReason: null,
      },
    });

    logger.info(
      { candidateId: id, userId: session.sub },
      '[HR Mapping] Candidate un-ignored (restored to UNMAPPED)',
    );

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, candidateId: id }, '[HR Mapping] Un-ignore failed');
    return NextResponse.json({ error: 'Failed to restore candidate' }, { status: 500 });
  }
}
