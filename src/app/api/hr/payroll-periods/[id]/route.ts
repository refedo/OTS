/**
 * GET    /api/hr/payroll-periods/[id] — fetch period with its lines
 * DELETE /api/hr/payroll-periods/[id] — delete a DRAFT period (cascades lines)
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

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.payroll.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          employee: { select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true } },
        },
        orderBy: { employee: { employmentId: 'asc' } },
      },
      adjustments: {
        include: {
          employee: { select: { id: true, employmentId: true, fullNameEn: true } },
        },
      },
      wpsExports: { orderBy: { generatedAt: 'desc' } },
    },
  });
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(period);
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canCalc = await checkPermission('hr.payroll.calculate');
  if (!canCalc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const period = await prisma.payrollPeriod.findUnique({ where: { id } });
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (period.status !== 'DRAFT' && period.status !== 'CALCULATED') {
    return NextResponse.json({ error: 'Only DRAFT or CALCULATED periods can be deleted' }, { status: 400 });
  }

  // ManpowerInvoiceDraft has no onDelete: Cascade so we delete those first,
  // then the period (PayrollLine/Adjustment/WpsExport cascade automatically).
  await prisma.manpowerInvoiceDraft.deleteMany({ where: { payrollPeriodId: id } });
  await prisma.payrollPeriod.delete({ where: { id } });
  logger.info({ id }, '[Payroll] Period deleted');
  return NextResponse.json({ success: true });
}
