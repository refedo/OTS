import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { HrSetupClient } from '@/components/hr/hr-setup-client';

export const metadata: Metadata = { title: 'HR Setup' };

export default async function HrSetupPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canManageDepartments =
    permissions.includes('departments.create') || permissions.includes('departments.edit');
  const canManageSections = permissions.includes('hr.section.manage');
  const canManageLeaveTypes = permissions.includes('hr.leaves.manageTypes');
  const canManagePayrollSettings = permissions.includes('hr.payroll.settings');

  if (!canManageDepartments && !canManageSections && !canManageLeaveTypes && !canManagePayrollSettings) {
    redirect('/unauthorized?from=/hr/setup');
  }

  const [departments, sections, divisions, occupations, leaveTypes] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.hrSection.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.hrDivision.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.hrOccupation.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.leaveType.findMany({ orderBy: [{ displayOrder: 'asc' }, { nameEn: 'asc' }] }),
  ]);

  const serializedLeaveTypes = leaveTypes.map((lt) => ({
    id: lt.id,
    code: lt.code,
    nameEn: lt.nameEn,
    nameAr: lt.nameAr,
    payType: lt.payType,
    monthlyAccrualDays: Number(lt.monthlyAccrualDays),
    annualAccrualDays: Number(lt.annualAccrualDays),
    maxCarryOverDays: Number(lt.maxCarryOverDays),
    requiresMedicalCertificate: lt.requiresMedicalCertificate,
    allowNegativeBalance: lt.allowNegativeBalance,
    countPublicHolidays: lt.countPublicHolidays,
    displayOrder: lt.displayOrder,
    archivedAt: lt.archivedAt ? lt.archivedAt.toISOString() : null,
  }));

  const serializedDepartments = departments.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    archivedAt: d.archivedAt ? d.archivedAt.toISOString() : null,
  }));

  const serializedSections = sections.map((s) => ({
    id: s.id,
    name: s.name,
    displayOrder: s.displayOrder,
    archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
  }));

  const serializedDivisions = divisions.map((d) => ({
    id: d.id,
    name: d.name,
    displayOrder: d.displayOrder,
    archivedAt: d.archivedAt ? d.archivedAt.toISOString() : null,
  }));

  const serializedOccupations = occupations.map((o) => ({
    id: o.id,
    name: o.name,
    displayOrder: o.displayOrder,
    archivedAt: o.archivedAt ? o.archivedAt.toISOString() : null,
  }));

  return (
    <HrSetupClient
      initialDepartments={serializedDepartments}
      initialSections={serializedSections}
      initialDivisions={serializedDivisions}
      initialOccupations={serializedOccupations}
      initialLeaveTypes={serializedLeaveTypes}
      canManageDepartments={canManageDepartments}
      canCreateDepartment={permissions.includes('departments.create')}
      canDeleteDepartment={permissions.includes('departments.delete')}
      canManageSections={canManageSections}
      canManageLeaveTypes={canManageLeaveTypes}
      canManagePayrollSettings={canManagePayrollSettings}
    />
  );
}
