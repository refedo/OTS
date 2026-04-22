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
      boarderNumber: true,
      passportNumber: true,
      sponsorNumber: true,
      contractEndDate: true,
      contractType: true,
      workingLocation: true,
      nationality: true,
      dateOfBirth: true,
      maritalStatus: true,
      employeeNo: true,
      jobTitleEn: true,
      jobTitleAr: true,
      gosiSubscriptionNo: true,
      contractDuration: true,
      transferType: true,
      bankName: true,
      bankIban: true,
      isGosiSubject: true,
      gosiSalary: true,
      standardDailyHours: true,
      workWeekDaysCount: true,
      status: true,
      department: true,
      section: true,
      division: true,
      occupation: true,
      dateOfJoining: true,
      dateOfLeaving: true,
      basicSalary: true,
      housingAllowance: true,
      transportAllowance: true,
      mobileAllowance: true,
      foodAllowance: true,
      otherAllowances: true,
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
    contractEndDate: e.contractEndDate ? e.contractEndDate.toISOString() : null,
    dateOfBirth: e.dateOfBirth ? e.dateOfBirth.toISOString() : null,
    nationality: e.nationality,
    maritalStatus: e.maritalStatus,
    employeeNo: e.employeeNo,
    jobTitleEn: e.jobTitleEn,
    jobTitleAr: e.jobTitleAr,
    gosiSubscriptionNo: e.gosiSubscriptionNo,
    contractDuration: e.contractDuration,
    transferType: e.transferType,
    bankName: canViewCompensation ? e.bankName : null,
    bankIban: canViewCompensation ? e.bankIban : null,
    isGosiSubject: canViewCompensation ? e.isGosiSubject : null,
    gosiSalary: canViewCompensation && e.gosiSalary ? e.gosiSalary.toString() : null,
    standardDailyHours: e.standardDailyHours,
    workWeekDaysCount: e.workWeekDaysCount,
    lastSyncedFromDolibarrAt: e.lastSyncedFromDolibarrAt
      ? e.lastSyncedFromDolibarrAt.toISOString()
      : null,
    basicSalary: canViewCompensation ? e.basicSalary.toString() : null,
    housingAllowance: canViewCompensation ? e.housingAllowance.toString() : null,
    transportAllowance: canViewCompensation ? e.transportAllowance.toString() : null,
    mobileAllowance: canViewCompensation ? e.mobileAllowance.toString() : null,
    foodAllowance: canViewCompensation ? e.foodAllowance.toString() : null,
    otherAllowances: canViewCompensation ? e.otherAllowances.toString() : null,
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
