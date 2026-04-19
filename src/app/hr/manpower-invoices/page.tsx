import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { ManpowerInvoicesClient } from '@/components/hr/manpower-invoices-client';

export default async function ManpowerInvoicesPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.billing.view');
  if (!canView) redirect('/unauthorized?from=/hr/manpower-invoices');

  const permissions = await getCurrentUserPermissions();
  const canManage = permissions.includes('hr.billing.manage');
  const canPush = permissions.includes('hr.billing.push');

  const drafts = await prisma.manpowerInvoiceDraft.findMany({
    where: { deletedAt: null },
    orderBy: [
      { payrollPeriod: { year: 'desc' } },
      { payrollPeriod: { month: 'desc' } },
      { agency: { nameEn: 'asc' } },
    ],
    include: {
      agency: { select: { id: true, nameEn: true, nameAr: true, dolibarrThirdPartyId: true } },
      payrollPeriod: { select: { id: true, year: true, month: true } },
      lines: { select: { id: true, totalHours: true, lineTotal: true } },
      createdBy: { select: { name: true } },
    },
  });

  const periods = await prisma.payrollPeriod.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: { id: true, year: true, month: true, status: true },
  });

  const serialized = drafts.map(d => ({
    id: d.id,
    agencyId: d.agencyId,
    agencyNameEn: d.agency.nameEn,
    agencyNameAr: d.agency.nameAr,
    dolibarrThirdPartyId: d.agency.dolibarrThirdPartyId,
    payrollPeriodId: d.payrollPeriodId,
    periodYear: d.payrollPeriod.year,
    periodMonth: d.payrollPeriod.month,
    periodStart: d.periodStart.toISOString(),
    periodEnd: d.periodEnd.toISOString(),
    status: d.status,
    totalHours: Number(d.totalHours),
    totalAmount: Number(d.totalAmount),
    lineCount: d.lines.length,
    dolibarrInvoiceId: d.dolibarrInvoiceId,
    dolibarrInvoiceRef: d.dolibarrInvoiceRef,
    pushedAt: d.pushedAt ? d.pushedAt.toISOString() : null,
    createdByName: d.createdBy.name,
    createdAt: d.createdAt.toISOString(),
  }));

  const kpi = {
    total: drafts.length,
    draft: drafts.filter(d => d.status === 'DRAFT').length,
    confirmed: drafts.filter(d => d.status === 'CONFIRMED').length,
    pushed: drafts.filter(d => d.status === 'PUSHED').length,
    paid: drafts.filter(d => d.status === 'PAID').length,
    totalAmount: drafts.reduce((s, d) => s + Number(d.totalAmount), 0),
  };

  return (
    <ManpowerInvoicesClient
      drafts={serialized}
      periods={periods}
      kpi={kpi}
      canManage={canManage}
      canPush={canPush}
    />
  );
}
