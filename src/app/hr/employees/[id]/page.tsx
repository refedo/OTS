import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { EmployeeForm } from '@/components/hr/employee-form';
import { EmployeeDetailTabs } from '@/components/hr/employee-detail-tabs';
import { UserCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const canViewAll = await checkPermission('hr.employee.view');
  const canViewOwn = !canViewAll ? await checkPermission('hr.employee.viewOwn') : false;
  if (!canViewAll && !canViewOwn) redirect('/unauthorized?from=/hr/employees');

  const { id } = await params;

  // Detect self-view: compare logged-in user's employeeId to the profile being viewed
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { employeeId: true },
  });
  const isSelfView = me?.employeeId === id;

  // If user only has viewOwn but is trying to view someone else's profile, block
  if (!canViewAll && canViewOwn && !isSelfView) {
    redirect('/unauthorized?from=/hr/employees');
  }

  const permissions = await getCurrentUserPermissions();
  const canViewCompensation = permissions.includes('hr.employee.viewCompensation');
  const canResetToDolibarr = permissions.includes('hr.employee.resetToDolibarr');
  const canViewPositionHistory = permissions.includes('hr.employee.positionHistory.view');
  const canViewSalaryHistory = permissions.includes('hr.employee.salaryHistory.view');
  const canManagePositionHistory = permissions.includes('hr.employee.positionHistory.manage');
  const canManageSalaryHistory = permissions.includes('hr.employee.salaryHistory.manage');
  const canApproveHr = permissions.includes('hr.employee.salaryHistory.approveHr');
  const canApproveCeo = permissions.includes('hr.employee.salaryHistory.approveCeo');

  // Include viewOwn checks for self-view tabs
  const canViewLoans = permissions.includes('hr.loans.view') || permissions.includes('hr.loans.manage')
    || (isSelfView && permissions.includes('hr.loans.viewOwn'));
  const canManageLoans = permissions.includes('hr.loans.manage');
  const canViewCustodies = permissions.includes('hr.custodies.view') || permissions.includes('hr.custodies.manage')
    || (isSelfView && permissions.includes('hr.custodies.viewOwn'));
  const canManageCustodies = permissions.includes('hr.custodies.manage');
  const canViewAssets = permissions.includes('hr.assets.view') || permissions.includes('hr.assets.manage')
    || (isSelfView && permissions.includes('hr.assets.viewOwn'));
  const canManageAssets = permissions.includes('hr.assets.manage');
  const canViewViolations = permissions.includes('hr.violations.view') || permissions.includes('hr.violations.manage')
    || (isSelfView && permissions.includes('hr.violations.viewOwn'));
  const canManageViolations = permissions.includes('hr.violations.manage');
  const canViewContracts = permissions.includes('hr.contracts.view') || permissions.includes('hr.contracts.manage')
    || (isSelfView && permissions.includes('hr.contracts.viewOwn'));
  const canViewLetters = permissions.includes('hr.letters.view') || permissions.includes('hr.letters.manage')
    || permissions.includes('hr.letters.approveCeo')
    || (isSelfView && permissions.includes('hr.letters.viewOwn'));
  const canViewPayslips = permissions.includes('hr.payroll.view') || permissions.includes('hr.payroll.calculate')
    || (isSelfView && permissions.includes('hr.payroll.viewOwn'));
  const canManageLeaves = permissions.includes('hr.leaves.manage') || permissions.includes('hr.leaves.viewAll');
  const canViewLeaves = isSelfView || canManageLeaves
    || permissions.includes('hr.leaves.viewAll') || permissions.includes('hr.leaves.approve');

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    include: {
      reportsTo: { select: { fullNameEn: true } },
      departmentRef: { select: { name: true } },
    },
  });
  if (!employee) notFound();

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  // Prev / next navigation (admin-only; not needed for self-view but kept for convenience)
  const allEmployeeIds = !isSelfView
    ? await prisma.employee.findMany({
        where: { deletedAt: null },
        select: { id: true },
        orderBy: { fullNameEn: 'asc' },
      })
    : [];
  const navIndex = allEmployeeIds.findIndex((e) => e.id === id);
  const prevEmployeeId = navIndex > 0 ? allEmployeeIds[navIndex - 1].id : null;
  const nextEmployeeId = navIndex < allEmployeeIds.length - 1 ? allEmployeeIds[navIndex + 1].id : null;
  const navPosition = navIndex >= 0 ? `${navIndex + 1} / ${allEmployeeIds.length}` : null;

  // Asset assignments check (for conditional tabs)
  const assetAssignmentCount = (canViewAssets || isSelfView)
    ? await prisma.assetAssignment.count({ where: { employeeId: id } })
    : 0;
  const hasAssets = assetAssignmentCount > 0;

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
    isGosiSubject: canViewCompensation ? employee.isGosiSubject : false,
    gosiSalary: canViewCompensation && employee.gosiSalary ? employee.gosiSalary.toString() : '',
    employeeNo: (employee as Record<string, unknown>).employeeNo as string ?? '',
    boarderNumber: (employee as Record<string, unknown>).boarderNumber as string ?? '',
    maritalStatus: (employee as Record<string, unknown>).maritalStatus as string ?? '',
    occupationAr: (employee as Record<string, unknown>).occupationAr as string ?? '',
    gosiSubscriptionNo: (employee as Record<string, unknown>).gosiSubscriptionNo as string ?? '',
    contractEndDate: (employee as Record<string, unknown>).contractEndDate
      ? new Date((employee as Record<string, unknown>).contractEndDate as string).toISOString().slice(0, 10)
      : '',
    contractDuration: (employee as Record<string, unknown>).contractDuration as string ?? '',
    passportNumber: (employee as Record<string, unknown>).passportNumber as string ?? '',
    iqamaUrl: (employee as Record<string, unknown>).iqamaUrl as string ?? '',
    passportUrl: (employee as Record<string, unknown>).passportUrl as string ?? '',
    sponsorNumber: (employee as Record<string, unknown>).sponsorNumber as string ?? '',
    contractType: (employee as Record<string, unknown>).contractType as string ?? '',
    workingLocation: (employee as Record<string, unknown>).workingLocation as string ?? '',
    transferType: (employee as Record<string, unknown>).transferType as string ?? '',
    manuallyEditedFields: Array.isArray(employee.manuallyEditedFields)
      ? (employee.manuallyEditedFields as string[])
      : [],
  };

  const statusConfig: Record<string, { label: string; cls: string }> = {
    ACTIVE:     { label: 'Active',     cls: 'bg-emerald-100/80 text-emerald-200 border-emerald-300/50' },
    ON_LEAVE:   { label: 'On Leave',   cls: 'bg-amber-100/80 text-amber-200 border-amber-300/50' },
    SUSPENDED:  { label: 'Suspended',  cls: 'bg-orange-100/80 text-orange-200 border-orange-300/50' },
    TERMINATED: { label: 'Terminated', cls: 'bg-rose-100/80 text-rose-200 border-rose-300/50' },
    RESIGNED:   { label: 'Resigned',   cls: 'bg-slate-100/80 text-slate-200 border-slate-300/50' },
  };
  const sc = statusConfig[employee.status] ?? { label: employee.status, cls: 'bg-slate-100/80 text-slate-200 border-slate-300/50' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
              <UserCircle2 className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-bold truncate">{employee.fullNameEn}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.cls}`}>
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-sky-100 text-sm">
                <span className="font-mono">{employee.employmentId}</span>
                {employee.department && <span>· {employee.department}</span>}
                {employee.occupation && <span>· {employee.occupation}</span>}
              </div>
              {!isSelfView && (
                <p className="text-sky-200 text-xs mt-2">
                  Last synced:{' '}
                  {employee.lastSyncedFromDolibarrAt
                    ? new Date(employee.lastSyncedFromDolibarrAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'never'}
                </p>
              )}
            </div>
            {/* Prev / Next navigation (admin view only) */}
            {!isSelfView && (
              <div className="flex items-center gap-1 shrink-0">
                {prevEmployeeId ? (
                  <Link
                    href={`/hr/employees/${prevEmployeeId}`}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                    title="Previous employee"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Link>
                ) : (
                  <span className="p-2 bg-white/10 rounded-lg opacity-40 cursor-not-allowed">
                    <ChevronLeft className="h-5 w-5" />
                  </span>
                )}
                {navPosition && (
                  <span className="text-xs text-sky-200 font-mono px-1 tabular-nums">{navPosition}</span>
                )}
                {nextEmployeeId ? (
                  <Link
                    href={`/hr/employees/${nextEmployeeId}`}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                    title="Next employee"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                ) : (
                  <span className="p-2 bg-white/10 rounded-lg opacity-40 cursor-not-allowed">
                    <ChevronRight className="h-5 w-5" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <EmployeeDetailTabs
          isSelfView={isSelfView}
          showHistory={!isSelfView && (canViewPositionHistory || canViewSalaryHistory)}
          showFinance={canViewLoans || canViewCustodies}
          showAssets={(canViewAssets || canViewViolations) && hasAssets}
          showLetters={canViewLetters}
          showPayslips={canViewPayslips}
          showContracts={!isSelfView && canViewContracts}
          showCarMaintenance={!isSelfView && (canViewAssets || canViewViolations) && hasAssets}
          recordTab={
            <EmployeeForm
              initial={initial}
              canViewCompensation={canViewCompensation}
              canResetToDolibarr={canResetToDolibarr}
              departments={departments}
            />
          }
          employeeId={employee.id}
          departments={departments}
          canManagePosition={canManagePositionHistory}
          canManageSalary={canManageSalaryHistory}
          canApproveHr={canApproveHr}
          canApproveCeo={canApproveCeo}
          canViewLoans={canViewLoans}
          canManageLoans={canManageLoans}
          canViewCustodies={canViewCustodies}
          canManageCustodies={canManageCustodies}
          canManageAssets={canManageAssets}
          canManageViolations={canManageViolations}
          canViewContracts={canViewContracts}
          canManageLeaves={canManageLeaves}
          canViewLeaves={canViewLeaves}
          employee={{
            fullNameEn: employee.fullNameEn,
            fullNameAr: employee.fullNameAr,
            dateOfJoining: employee.dateOfJoining.toISOString().slice(0, 10),
            dateOfLeaving: employee.dateOfLeaving ? employee.dateOfLeaving.toISOString().slice(0, 10) : null,
            status: employee.status,
            occupation: employee.occupation,
            department: employee.department,
            nationalId: employee.nationalId,
            nationality: employee.nationality,
            dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString().slice(0, 10) : null,
            maritalStatus: (employee as Record<string, unknown>).maritalStatus as string ?? null,
            employeeNo: (employee as Record<string, unknown>).employeeNo as string ?? null,
            reportsTo: employee.reportsTo?.fullNameEn ?? null,
            jobTitleEn: employee.jobTitleEn,
            jobTitleAr: employee.jobTitleAr,
            contractEndDate: (employee as Record<string, unknown>).contractEndDate
              ? new Date((employee as Record<string, unknown>).contractEndDate as string).toISOString().slice(0, 10)
              : null,
            contractType: (employee as Record<string, unknown>).contractType as string ?? null,
            workingLocation: (employee as Record<string, unknown>).workingLocation as string ?? null,
            section: employee.section,
            division: employee.division,
          }}
        />
      </div>
    </div>
  );
}
