import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission } from '@/lib/permission-checker';
import { EmployeeSelfProfile } from '@/components/hr/employee-self-profile';
import { UserCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Profile' };
export const dynamic = 'force-dynamic';

export default async function MyProfilePage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.viewOwn');
  if (!canView) redirect('/unauthorized?from=/hr/employees/me');

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { employeeId: true },
  });

  if (!user?.employeeId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-sky-100 rounded-full">
              <UserCircle2 className="h-12 w-12 text-sky-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Account Not Linked</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your OTS account is not yet linked to an employee record.
            Please contact HR to have your account linked to your employee profile.
          </p>
          <p className="text-xs text-slate-400">
            Account: <span className="font-medium text-slate-600">{session.name}</span>
          </p>
        </div>
      </div>
    );
  }

  const empId = user.employeeId;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [
    employee,
    assignments,
    loans,
    custodies,
    violations,
    letters,
    payrollLines,
    leaveRequests,
  ] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: empId },
      select: {
        id: true,
        fullNameEn: true,
        fullNameAr: true,
        occupation: true,
        section: true,
        division: true,
        departmentId: true,
        departmentRef: { select: { name: true } },
        nationalId: true,
        nationality: true,
        dateOfBirth: true,
        dateOfJoining: true,
        dateOfLeaving: true,
        contractEndDate: true,
        contractType: true,
        workingLocation: true,
        maritalStatus: true,
        employeeNo: true,
        status: true,
        jobTitleEn: true,
        jobTitleAr: true,
        reportsTo: { select: { fullNameEn: true } },
      },
    }),
    prisma.assetAssignment.findMany({
      where: { employeeId: empId, deletedAt: null },
      select: {
        id: true,
        assignedDate: true,
        returnedDate: true,
        status: true,
        asset: { select: { id: true, assetCode: true, name: true, category: true } },
      },
      orderBy: { assignedDate: 'desc' },
    }).catch(() => []),
    prisma.loan.findMany({
      where: { employeeId: empId, deletedAt: null },
      select: {
        id: true,
        principal: true,
        installmentAmount: true,
        installmentsPaid: true,
        installmentsTotal: true,
        reason: true,
        status: true,
        startDate: true,
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.custody.findMany({
      where: { employeeId: empId, deletedAt: null },
      select: {
        id: true,
        amount: true,
        settledAmount: true,
        reason: true,
        issuedDate: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.trafficViolation.findMany({
      where: { employeeId: empId, deletedAt: null },
      select: {
        id: true,
        violationDate: true,
        violationType: true,
        violationAmount: true,
        status: true,
        deductFromPayroll: true,
        description: true,
      },
      orderBy: { violationDate: 'desc' },
    }).catch(() => []),
    prisma.hrLetter.findMany({
      where: { employeeId: empId, deletedAt: null },
      select: {
        id: true,
        letterNumber: true,
        letterType: true,
        subject: true,
        issuedAt: true,
        status: true,
      },
      orderBy: { issuedAt: 'desc' },
    }).catch(() => []),
    prisma.payrollLine.findMany({
      where: {
        employeeId: empId,
        period: { status: { in: ['APPROVED', 'LOCKED', 'PAID'] } },
      },
      select: {
        netPay: true,
        basicSalary: true,
        housingAllowance: true,
        transportAllowance: true,
        mobileAllowance: true,
        foodAllowance: true,
        otherAllowances: true,
        period: { select: { year: true, month: true, payDate: true, status: true } },
      },
      orderBy: { period: { payDate: 'desc' } },
      take: 24,
    }).catch(() => []),
    prisma.leaveRequest.findMany({
      where: { employeeId: empId, deletedAt: null },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        workingDays: true,
        status: true,
        reason: true,
        leaveType: { select: { name: true, code: true } },
      },
      orderBy: { startDate: 'desc' },
    }).catch(() => []),
  ]);

  if (!employee) {
    redirect('/dashboard');
  }

  // Compute leave entitlement
  let leaveEntitlement: { entitledDays: number; annualConsumed: number; remaining: number } | null = null;
  try {
    const annualLeaveType = await prisma.leaveType.findFirst({ where: { code: 'ANNUAL', archivedAt: null }, select: { id: true } });
    const joinDate = employee.dateOfJoining ? new Date(employee.dateOfJoining) : null;
    if (joinDate) {
      const today = new Date();
      const diffMs = today.getTime() - joinDate.getTime();
      const monthsEmployed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
      const entitledDays = Math.round(monthsEmployed * 1.75 * 10) / 10;
      let annualConsumed = 0;
      if (annualLeaveType) {
        const annualApproved = leaveRequests.filter(r => r.leaveType.code === 'ANNUAL' && r.status === 'APPROVED');
        annualConsumed = Math.round(annualApproved.reduce((s, r) => s + Number(r.workingDays), 0) * 10) / 10;
      }
      leaveEntitlement = {
        entitledDays,
        annualConsumed,
        remaining: Math.round((entitledDays - annualConsumed) * 10) / 10,
      };
    }
  } catch { /* non-fatal */ }

  const profileData = {
    employee: {
      id: employee.id,
      fullNameEn: employee.fullNameEn,
      fullNameAr: employee.fullNameAr,
      occupation: employee.occupation,
      section: employee.section,
      division: employee.division,
      department: employee.departmentRef?.name ?? null,
      nationalId: employee.nationalId,
      nationality: employee.nationality,
      dateOfBirth: employee.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      dateOfJoining: employee.dateOfJoining.toISOString().slice(0, 10),
      dateOfLeaving: employee.dateOfLeaving?.toISOString().slice(0, 10) ?? null,
      contractEndDate: employee.contractEndDate?.toISOString().slice(0, 10) ?? null,
      contractType: employee.contractType,
      workingLocation: employee.workingLocation,
      maritalStatus: employee.maritalStatus,
      employeeNo: employee.employeeNo,
      status: employee.status,
      jobTitleEn: employee.jobTitleEn,
      jobTitleAr: employee.jobTitleAr,
      reportsTo: employee.reportsTo?.fullNameEn ?? null,
    },
    assets: assignments.map(a => ({
      id: a.asset.id,
      assetCode: a.asset.assetCode,
      name: a.asset.name,
      category: a.asset.category,
      assignedDate: a.assignedDate.toISOString().slice(0, 10),
      returnedDate: a.returnedDate?.toISOString().slice(0, 10) ?? null,
      status: a.status,
    })),
    loans: loans.map(({ payments: loanPayments, ...l }) => ({
      id: l.id,
      principal: Number(l.principal),
      installmentAmount: Number(l.installmentAmount),
      installmentsPaid: l.installmentsPaid,
      installmentsTotal: l.installmentsTotal,
      totalAmountPaid: loanPayments.reduce((s, p) => s + Number(p.amount), 0),
      reason: l.reason,
      status: l.status,
      startDate: l.startDate?.toISOString().slice(0, 10) ?? null,
    })),
    custodies: custodies.map(c => ({
      id: c.id,
      amount: Number(c.amount),
      settledAmount: Number(c.settledAmount),
      reason: c.reason,
      issuedDate: c.issuedDate.toISOString().slice(0, 10),
      status: c.status,
    })),
    violations: violations.map(v => ({
      id: v.id,
      violationDate: v.violationDate.toISOString().slice(0, 10),
      violationType: v.violationType,
      violationAmount: Number(v.violationAmount),
      status: v.status,
      deductFromPayroll: v.deductFromPayroll,
      description: v.description,
    })),
    letters: letters.map(l => ({
      id: l.id,
      letterNumber: l.letterNumber,
      letterType: l.letterType,
      subject: l.subject,
      issuedAt: l.issuedAt.toISOString().slice(0, 10),
      status: l.status,
    })),
    payslips: payrollLines.map(pl => ({
      periodLabel: `${MONTHS[(pl.period.month ?? 1) - 1]} ${pl.period.year}`,
      netSalary: Number(pl.netPay),
      basicSalary: Number(pl.basicSalary),
      totalAllowances: Number(pl.housingAllowance ?? 0) + Number(pl.transportAllowance ?? 0) + Number(pl.mobileAllowance ?? 0) + Number(pl.foodAllowance ?? 0) + Number(pl.otherAllowances ?? 0),
      payDate: pl.period.payDate.toISOString().slice(0, 10),
      periodStatus: pl.period.status,
    })),
    leaves: leaveRequests.map(r => ({
      id: r.id,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      workingDays: Number(r.workingDays),
      status: r.status,
      reason: r.reason,
      leaveTypeName: r.leaveType.name,
      leaveTypeCode: r.leaveType.code,
    })),
    leaveEntitlement,
  };

  return <EmployeeSelfProfile data={profileData} />;
}
