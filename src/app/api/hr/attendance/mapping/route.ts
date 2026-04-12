/**
 * GET /api/hr/attendance/mapping — list attendance mapping candidates.
 *
 * Returns every row from AttendanceMappingCandidate along with resolver
 * metadata, grouped client-side by status (UNMAPPED / RESOLVED / IGNORED).
 * Used by /hr/attendance/mapping to let operators link unknown sheet
 * identifiers to an existing Employee or permanently ignore false-positive
 * rows (removed workers that still appear in the sheet).
 *
 * Gated by `hr.attendance.sync` (same permission that already gates the
 * sync-run button — anyone allowed to trigger a sync is allowed to
 * resolve its orphans).
 *
 * Phase 2.5 of OTS-MSS-HR-PAYROLL-v1.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.attendance.sync');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const candidates = await prisma.attendanceMappingCandidate.findMany({
      orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
      include: {
        resolvedEmployee: {
          select: {
            id: true,
            employmentId: true,
            fullNameEn: true,
            fullNameAr: true,
          },
        },
        resolvedBy: { select: { id: true, name: true } },
        ignoredBy: { select: { id: true, name: true } },
      },
    });

    const counts = {
      unmapped: candidates.filter((c) => c.status === 'UNMAPPED').length,
      resolved: candidates.filter((c) => c.status === 'RESOLVED').length,
      ignored: candidates.filter((c) => c.status === 'IGNORED').length,
      total: candidates.length,
    };

    return NextResponse.json({ candidates, counts });
  } catch (error) {
    logger.error({ error }, '[HR Mapping] Failed to list candidates');
    return NextResponse.json(
      { error: 'Failed to list mapping candidates' },
      { status: 500 },
    );
  }
}
