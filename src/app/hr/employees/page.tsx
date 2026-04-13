import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { EmployeesClient } from '@/components/hr/employees-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HR — Employees',
};

export default async function EmployeesPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.view');
  if (!canView) redirect('/unauthorized?from=/hr/employees');

  const permissions = await getCurrentUserPermissions();
  const canViewCompensation = permissions.includes('hr.employee.viewCompensation');
  const canCreate = permissions.includes('hr.employee.create');
  const canEdit = permissions.includes('hr.employee.edit');
  const canDelete = permissions.includes('hr.employee.delete');

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    orderBy: { fullNameEn: 'asc' },
    select: {
      id: true,
      employmentId: true,
      fullNameEn: true,
      fullNameAr: true,
      nationalId: true,
      status: true,
      department: true,
      section: true,
      division: true,
      occupation: true,
      dateOfJoining: true,
      dateOfLeaving: true,
      basicSalary: true,
      lastSyncedFromDolibarrAt: true,
      manuallyEditedFields: true,
    },
  });

  const gate = await prisma.systemConfig.findUnique({
    where: { key: 'identityReconciliationComplete' },
  });

  const serialized = employees.map((e) => ({
    ...e,
    dateOfJoining: e.dateOfJoining.toISOString(),
    dateOfLeaving: e.dateOfLeaving ? e.dateOfLeaving.toISOString() : null,
    lastSyncedFromDolibarrAt: e.lastSyncedFromDolibarrAt
      ? e.lastSyncedFromDolibarrAt.toISOString()
      : null,
    basicSalary: canViewCompensation ? e.basicSalary.toString() : null,
    manuallyEditedFields: Array.isArray(e.manuallyEditedFields)
      ? (e.manuallyEditedFields as string[])
      : [],
  }));

  return (
    <EmployeesClient
      employees={serialized}
      canViewCompensation={canViewCompensation}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      reconciliationComplete={gate?.value === 'true'}
    />
  );
}
