/**
 * POST /api/hr/payroll-periods/[id]/lock — move APPROVED|PAID → LOCKED (terminal)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canLock = await checkPermission('hr.payroll.lock');
  if (!canLock) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const period = await prisma.payrollPeriod.findUnique({ where: { id } });
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (period.status !== 'APPROVED' && period.status !== 'PAID') {
    return NextResponse.json({ error: 'Only APPROVED or PAID periods can be locked' }, { status: 400 });
  }

  const updated = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: 'LOCKED', lockedAt: new Date(), lockedById: session.sub },
  });
  logger.info({ id }, '[Payroll] Period locked');
  return NextResponse.json(updated);
}
