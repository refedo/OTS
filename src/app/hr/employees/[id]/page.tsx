import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { EmployeeForm } from '@/components/hr/employee-form';

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.view');
  if (!canView) redirect('/unauthorized?from=/hr/employees');

  const permissions = await getCurrentUserPermissions();
  const canViewCompensation = permissions.includes('hr.employee.viewCompensation');
  const canResetToDolibarr = permissions.includes('hr.employee.resetToDolibarr');

  const { id } = await params;
  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
  });
  if (!employee) notFound();

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const initial = {
    id: employee.id,
    employmentId: employee.employmentId,
    fullNameEn: employee.fullNameEn,
    fullNameAr: employee.fullNameAr ?? '',
    nationalId: employee.nationalId ?? '',
    nationality: employee.nationality ?? '',
    dateOfBirth: employee.dateOfBirth
      ? employee.dateOfBirth.toISOString().slice(0, 10)
      : '',
    dateOfJoining: employee.dateOfJoining.toISOString().slice(0, 10),
    dateOfLeaving: employee.dateOfLeaving
      ? employee.dateOfLeaving.toISOString().slice(0, 10)
      : '',
    status: employee.status,
    trade: employee.trade ?? '',
    department: employee.department ?? '',
    departmentId: employee.departmentId ?? '',
    occupation: employee.occupation ?? '',
    section: employee.section ?? '',
    division: employee.division ?? '',
    jobTitleEn: employee.jobTitleEn ?? '',
    jobTitleAr: employee.jobTitleAr ?? '',
    basicSalary: canViewCompensation ? employee.basicSalary.toString() : '',
    housingAllowance: canViewCompensation ? employee.housingAllowance.toString() : '',
    transportAllowance: canViewCompensation ? employee.transportAllowance.toString() : '',
    mobileAllowance: canViewCompensation ? employee.mobileAllowance.toString() : '',
    foodAllowance: canViewCompensation ? employee.foodAllowance.toString() : '',
    otherAllowances: canViewCompensation ? employee.otherAllowances.toString() : '',
    standardDailyHours: employee.standardDailyHours,
    workWeekDaysCount: employee.workWeekDaysCount,
    bankName: canViewCompensation ? (employee.bankName ?? '') : '',
    bankIban: canViewCompensation ? (employee.bankIban ?? '') : '',
    manuallyEditedFields: Array.isArray(employee.manuallyEditedFields)
      ? (employee.manuallyEditedFields as string[])
      : [],
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{employee.fullNameEn}</h1>
        <p className="text-sm text-muted-foreground">
          {employee.employmentId} · Last synced{' '}
          {employee.lastSyncedFromDolibarrAt
            ? new Date(employee.lastSyncedFromDolibarrAt).toLocaleString()
            : 'never'}
        </p>
      </div>
      <EmployeeForm
        initial={initial}
        canViewCompensation={canViewCompensation}
        canResetToDolibarr={canResetToDolibarr}
        departments={departments}
      />
    </div>
  );
}
