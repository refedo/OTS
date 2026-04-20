import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { Sparkles } from 'lucide-react';
import WidgetContainer from '@/components/dashboard/WidgetContainer';
import EmployeeSelfService from '@/components/dashboard/EmployeeSelfService';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Dashboard',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  type SelfServiceData = {
    employeeId: string;
    fullNameEn: string;
    occupation: string | null;
    assignedAssets: { id: string; assetCode: string; name: string; category: string; assignedDate: string }[];
    activeLoans: { id: string; principal: number; installmentAmount: number; installmentsPaid: number; installmentsTotal: number; totalAmountPaid: number; reason: string | null }[];
    openCustodies: { id: string; amount: number; settledAmount: number; reason: string; issuedDate: string }[];
    recentPayslips: { periodLabel: string; netSalary: number; basicSalary: number; totalAllowances: number; payDate: string }[];
    trafficViolations: { id: string; violationDate: string; violationType: string; violationAmount: number; status: string; deductFromPayroll: boolean }[];
    recentLetters: { id: string; letterNumber: string; letterType: string; subject: string; issuedAt: string }[];
    activeContracts: { id: string; contractNumber: string; title: string; type: string; expiryDate: string | null; status: string }[];
    leaveEntitlement: { entitledDays: number; annualConsumed: number; remaining: number } | null;
  };

  let selfService: SelfServiceData | null = null;

  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { employeeId: true },
      });

      if (user?.employeeId) {
        const empId = user.employeeId;

        const [employee, assignments, loans, custodies, violations, letters, contracts, payrollLines] = await Promise.all([
          prisma.employee.findUnique({
            where: { id: empId },
            select: { id: true, fullNameEn: true, occupation: true, dateOfJoining: true },
          }),
          prisma.assetAssignment.findMany({
            where: { employeeId: empId, status: 'ACTIVE', deletedAt: null },
            select: {
              id: true,
              assignedDate: true,
              asset: { select: { id: true, assetCode: true, name: true, category: true } },
            },
            orderBy: { assignedDate: 'desc' },
          }).catch(() => []),
          prisma.loan.findMany({
            where: { employeeId: empId, status: 'ACTIVE', deletedAt: null },
            select: { id: true, principal: true, installmentAmount: true, installmentsPaid: true, installmentsTotal: true, reason: true, payments: { select: { amount: true } } },
            orderBy: { createdAt: 'desc' },
          }).catch(() => []),
          prisma.custody.findMany({
            where: { employeeId: empId, status: { in: ['OPEN', 'PARTIALLY_SETTLED'] }, deletedAt: null },
            select: { id: true, amount: true, settledAmount: true, reason: true, issuedDate: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => []),
          prisma.trafficViolation.findMany({
            where: { employeeId: empId, deletedAt: null },
            select: { id: true, violationDate: true, violationType: true, violationAmount: true, status: true, deductFromPayroll: true },
            orderBy: { violationDate: 'desc' },
            take: 10,
          }).catch(() => []),
          prisma.hrLetter.findMany({
            where: { employeeId: empId, deletedAt: null },
            select: { id: true, letterNumber: true, letterType: true, subject: true, issuedAt: true },
            orderBy: { issuedAt: 'desc' },
            take: 10,
          }).catch(() => []),
          prisma.contract.findMany({
            where: { employeeId: empId, status: 'ACTIVE', deletedAt: null },
            select: { id: true, contractNumber: true, title: true, type: true, expiryDate: true, status: true },
            orderBy: { expiryDate: 'asc' },
          }).catch(() => []),
          // Latest 3 approved payroll periods for this employee
          prisma.payrollLine.findMany({
            where: {
              employeeId: empId,
              period: { status: 'APPROVED' },
            },
            select: {
              netPay: true,
              basicSalary: true,
              housingAllowance: true,
              transportAllowance: true,
              mobileAllowance: true,
              foodAllowance: true,
              otherAllowances: true,
              period: { select: { year: true, month: true, payDate: true } },
            },
            orderBy: { period: { payDate: 'desc' } },
            take: 3,
          }).catch(() => []),
        ]);

        if (employee) {
          const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

          selfService = {
            employeeId: employee.id,
            fullNameEn: employee.fullNameEn,
            occupation: employee.occupation,
            assignedAssets: assignments.map(a => ({
              id: a.asset.id,
              assetCode: a.asset.assetCode,
              name: a.asset.name,
              category: a.asset.category,
              assignedDate: a.assignedDate.toISOString().slice(0, 10),
            })),
            activeLoans: loans.map(({ payments: loanPayments, ...l }) => ({
              id: l.id,
              principal: Number(l.principal),
              installmentAmount: Number(l.installmentAmount),
              installmentsPaid: l.installmentsPaid,
              installmentsTotal: l.installmentsTotal,
              totalAmountPaid: loanPayments.reduce((s, p) => s + Number(p.amount), 0),
              reason: l.reason,
            })),
            openCustodies: custodies.map(c => ({
              id: c.id,
              amount: Number(c.amount),
              settledAmount: Number(c.settledAmount),
              reason: c.reason,
              issuedDate: c.issuedDate.toISOString().slice(0, 10),
            })),
            recentPayslips: payrollLines.map(pl => ({
              periodLabel: `${MONTHS[(pl.period.month ?? 1) - 1]} ${pl.period.year}`,
              netSalary: Number(pl.netPay),
              basicSalary: Number(pl.basicSalary),
              totalAllowances: Number(pl.housingAllowance ?? 0) + Number(pl.transportAllowance ?? 0) + Number(pl.mobileAllowance ?? 0) + Number(pl.foodAllowance ?? 0) + Number(pl.otherAllowances ?? 0),
              payDate: pl.period.payDate.toISOString().slice(0, 10),
            })),
            trafficViolations: violations.map(v => ({
              id: v.id,
              violationDate: v.violationDate.toISOString().slice(0, 10),
              violationType: v.violationType,
              violationAmount: Number(v.violationAmount),
              status: v.status,
              deductFromPayroll: v.deductFromPayroll,
            })),
            recentLetters: letters.map(l => ({
              id: l.id,
              letterNumber: l.letterNumber,
              letterType: l.letterType,
              subject: l.subject,
              issuedAt: l.issuedAt.toISOString().slice(0, 10),
            })),
            activeContracts: contracts.map(c => ({
              id: c.id,
              contractNumber: c.contractNumber,
              title: c.title,
              type: c.type,
              expiryDate: c.expiryDate ? c.expiryDate.toISOString().slice(0, 10) : null,
              status: c.status,
            })),
            leaveEntitlement: null,
          };

          // Compute cumulative leave entitlement (1.75/month from joining, minus all approved annual leaves)
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
                const reqs = await prisma.leaveRequest.findMany({
                  where: { employeeId: empId, leaveTypeId: annualLeaveType.id, status: 'APPROVED', deletedAt: null },
                  select: { workingDays: true },
                });
                annualConsumed = Math.round(reqs.reduce((s, r) => s + Number(r.workingDays), 0) * 10) / 10;
              }
              selfService.leaveEntitlement = {
                entitledDays,
                annualConsumed,
                remaining: Math.round((entitledDays - annualConsumed) * 10) / 10,
              };
            }
          } catch { /* non-fatal */ }
        }
      }
    } catch {
      // Non-critical — degrade gracefully
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full p-4 lg:p-6 space-y-6 max-lg:pt-16">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="size-6 lg:size-7 text-primary" />
            Welcome back, {session?.name || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Your personalized dashboard with real-time insights
          </p>
        </div>

        {/* Employee Self-Service — only shown when user is linked to an employee */}
        {selfService && <EmployeeSelfService data={selfService} />}

        {/* Widget Container */}
        <WidgetContainer />
      </div>
    </main>
  );
}
