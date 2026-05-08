import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { HrMonthlyReportsClient } from '@/components/hr/hr-monthly-reports-client';

export const dynamic = 'force-dynamic';

export default async function HrReportsPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store      = await cookies();
  const token      = store.get(cookieName)?.value;
  const session    = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const [canView, canManage] = await Promise.all([
    checkPermission('hr.reports.view'),
    checkPermission('hr.reports.manage'),
  ]);
  if (!canView && !canManage) redirect('/unauthorized?from=/hr/reports');

  const reports = await prisma.hrMonthlyReport.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: {
      id:                    true,
      year:                  true,
      month:                 true,
      status:                true,
      newHires:              true,
      resignations:          true,
      terminations:          true,
      headcountAtEnd:        true,
      turnoverRate:          true,
      burnoutScore:          true,
      totalPayroll:          true,
      leaveRequestsTotal:    true,
      leaveRequestsApproved: true,
      iqamaExpiredCount:     true,
      iqamaDueSoonCount:     true,
      docRenewalsDueSoon:    true,
      filePath:              true,
      generatedAt:           true,
      errorMessage:          true,
      createdAt:             true,
      createdBy:             { select: { name: true } },
    },
  });

  // Prisma Decimal fields must be serialised to plain numbers before passing to client
  const serialised = reports.map((r) => ({
    ...r,
    turnoverRate: Number(r.turnoverRate),
    burnoutScore: Number(r.burnoutScore),
    totalPayroll: Number(r.totalPayroll),
    generatedAt:  r.generatedAt?.toISOString() ?? null,
    createdAt:    r.createdAt.toISOString(),
  }));

  return (
    <HrMonthlyReportsClient
      initialReports={serialised}
      canManage={canManage}
    />
  );
}
