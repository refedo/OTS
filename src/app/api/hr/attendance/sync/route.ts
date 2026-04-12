/**
 * POST /api/hr/attendance/sync — trigger Google Sheet → OTS attendance sync
 * GET  /api/hr/attendance/sync — fetch recent sync logs
 *
 * Gated by `hr.attendance.sync`. Phase 2 of OTS-MSS-HR-PAYROLL-v1.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { runAttendanceSync } from '@/lib/services/hr/sync-attendance-from-sheet';

export async function POST() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canSync = await checkPermission('hr.attendance.sync');
  if (!canSync) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await runAttendanceSync({ triggeredById: session.sub });
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[Attendance Sync API] Sync failed');
    const msg = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.attendance.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const logs = await prisma.googleSheetAttendanceSyncLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
    include: { triggeredBy: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json(logs);
}
