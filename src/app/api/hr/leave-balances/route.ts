/**
 * GET /api/hr/leave-balances?employeeId=<uuid>&year=YYYY
 *   Returns a balance snapshot per active leave type for the given employee.
 *   Callers can only query their own balance unless they have hr.leaves.viewAll.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { computeLeaveBalance } from '@/lib/services/hr/leave-balance-calculator';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { employeeId: true } });
  const requestedEmployeeId = req.nextUrl.searchParams.get('employeeId') ?? me?.employeeId ?? null;
  if (!requestedEmployeeId) return NextResponse.json([], { status: 200 });

  if (requestedEmployeeId !== me?.employeeId) {
    const canViewAll = await checkPermission('hr.leaves.viewAll');
    if (!canViewAll) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()), 10);

  const types = await prisma.leaveType.findMany({
    where: { archivedAt: null },
    orderBy: { displayOrder: 'asc' },
  });

  const snapshots = await Promise.all(
    types.map(async (t) => {
      const snap = await computeLeaveBalance(requestedEmployeeId, t.id, year);
      return {
        ...snap,
        leaveType: {
          id: t.id,
          code: t.code,
          nameEn: t.nameEn,
          nameAr: t.nameAr,
          payType: t.payType,
        },
      };
    }),
  );

  return NextResponse.json(snapshots);
}
