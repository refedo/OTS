/**
 * POST /api/hr/payroll-periods/[id]/calculate — run the calculator for a period
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { calculatePayrollPeriod } from '@/lib/services/hr/payroll-calculator';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canCalc = await checkPermission('hr.payroll.calculate');
  if (!canCalc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  try {
    const result = await calculatePayrollPeriod(id, session.sub);
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, id }, '[Payroll] Calculation failed');
    const msg = error instanceof Error ? error.message : 'Failed to calculate';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
