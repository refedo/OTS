import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { HrSetupClient } from '@/components/hr/hr-setup-client';

export const dynamic = 'force-dynamic';
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
  const canAttendanceSync = permissions.includes('hr.attendance.sync');
  const canAttendanceProbe = permissions.includes('hr.attendance.probe');
  const canEmployeeSync = permissions.includes('hr.employee.sync');
  const canIdentityReconcile = permissions.includes('admin.identity.reconcile');

  const canViewAny =
    canManageDepartments ||
    canManageSections ||
    canManageLeaveTypes ||
    canManagePayrollSettings ||
    canAttendanceSync ||
    canAttendanceProbe ||
    canEmployeeSync ||
    canIdentityReconcile;

  if (!canViewAny) {
    redirect('/unauthorized?from=/hr/setup');
  }

  const [
    departments,
    sections,
    divisions,
    occupations,
    leaveTypes,
    attendanceLogs,
    employeeSyncLogs,
    identityUsersRaw,
    reconciliationGate,
  ] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.hrSection.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.hrDivision.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.hrOccupation.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.leaveType.findMany({ orderBy: [{ displayOrder: 'asc' }, { nameEn: 'asc' }] }),
    prisma.googleSheetAttendanceSyncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { triggeredBy: { select: { id: true, name: true, email: true } } },
    }),
    prisma.dolibarrEmployeeSyncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { triggeredBy: { select: { id: true, name: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        dolibarrUserId: true,
        employeeId: true,
        reconciledAt: true,
        role: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.systemConfig.findUnique({ where: { key: 'identityReconciliationComplete' } }),
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

  const serializedAttendanceLogs = attendanceLogs.map((l) => ({
    id: l.id,
    startedAt: l.startedAt.toISOString(),
    finishedAt: l.finishedAt ? l.finishedAt.toISOString() : null,
    status: l.status,
    spreadsheetId: l.spreadsheetId,
    tabName: l.tabName,
    rowsRead: l.rowsRead,
    rowsCreated: l.rowsCreated,
    rowsUpdated: l.rowsUpdated,
    rowsUnchanged: l.rowsUnchanged,
    employeeOrphans: l.employeeOrphans,
    slotOrphans: l.slotOrphans,
    hardErrors: l.hardErrors,
    softWarnings: l.softWarnings,
    durationMs: l.durationMs,
    triggeredBy: l.triggeredBy,
  }));

  const serializedEmployeeSyncLogs = employeeSyncLogs.map((l) => ({
    id: l.id,
    startedAt: l.startedAt.toISOString(),
    finishedAt: l.finishedAt ? l.finishedAt.toISOString() : null,
    status: l.status,
    rowsRead: l.rowsRead,
    rowsCreated: l.rowsCreated,
    rowsUpdated: l.rowsUpdated,
    rowsSkipped: l.rowsSkipped,
    fieldsPreserved: l.fieldsPreserved,
    linksEstablished: l.linksEstablished,
    hardErrors: l.hardErrors,
    softWarnings: l.softWarnings,
    apiResponseMs: l.apiResponseMs,
    triggeredBy: l.triggeredBy,
  }));

  const serializedIdentityUsers = identityUsersRaw.map((u) => ({
    ...u,
    reconciledAt: u.reconciledAt ? u.reconciledAt.toISOString() : null,
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
      attendanceLogs={serializedAttendanceLogs}
      canAttendanceSync={canAttendanceSync}
      canAttendanceProbe={canAttendanceProbe}
      employeeSyncLogs={serializedEmployeeSyncLogs}
      canEmployeeSync={canEmployeeSync}
      reconciliationComplete={reconciliationGate?.value === 'true'}
      identityUsers={serializedIdentityUsers}
      canIdentityReconcile={canIdentityReconcile}
    />
  );
}
