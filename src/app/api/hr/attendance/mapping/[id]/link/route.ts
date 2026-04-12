/**
 * POST /api/hr/attendance/mapping/[id]/link — link a mapping candidate to
 * an existing Employee.
 *
 * On success the candidate row moves from UNMAPPED → RESOLVED, and the
 * next attendance sync will treat the sheet identifier as belonging to
 * `employeeId` (via the RESOLVED short-circuit in parseWorkerColumns).
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

const linkSchema = z.object({
  employeeId: z.string().uuid(),
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

  const body = await req.json().catch(() => null);
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { employeeId } = parsed.data;

  try {
    const candidate = await prisma.attendanceMappingCandidate.findUnique({
      where: { id },
    });
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: { id: true, fullNameEn: true, employmentId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updated = await prisma.attendanceMappingCandidate.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedEmployeeId: employeeId,
        resolvedById: session.sub,
        resolvedAt: new Date(),
        // Clear any ignore state if the candidate had been ignored before.
        ignoredAt: null,
        ignoredById: null,
        ignoreReason: null,
      },
      include: {
        resolvedEmployee: {
          select: {
            id: true,
            employmentId: true,
            fullNameEn: true,
            fullNameAr: true,
          },
        },
      },
    });

    logger.info(
      {
        candidateId: id,
        identifier: candidate.identifier,
        workerType: candidate.workerType,
        employeeId,
        userId: session.sub,
      },
      '[HR Mapping] Candidate linked to employee',
    );

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, candidateId: id }, '[HR Mapping] Link failed');
    return NextResponse.json({ error: 'Failed to link candidate' }, { status: 500 });
  }
}
