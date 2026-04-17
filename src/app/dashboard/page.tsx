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

  // Fetch employee linked to this user for self-service widgets
  let selfService: {
    employeeId: string;
    fullNameEn: string;
    occupation: string | null;
    assignedAssets: { id: string; assetCode: string; name: string; category: string; assignedDate: string }[];
    activeLoans: { id: string; principal: number; installmentAmount: number; installmentsPaid: number; installmentsTotal: number; reason: string | null }[];
    openCustodies: { id: string; amount: number; settledAmount: number; reason: string; issuedDate: string }[];
  } | null = null;

  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { employeeId: true },
      });

      if (user?.employeeId) {
        const [employee, assignments, loans, custodies] = await Promise.all([
          prisma.employee.findUnique({
            where: { id: user.employeeId },
            select: { id: true, fullNameEn: true, occupation: true },
          }),
          prisma.assetAssignment.findMany({
            where: { employeeId: user.employeeId, status: 'ACTIVE', deletedAt: null },
            select: {
              id: true,
              assignedDate: true,
              asset: { select: { id: true, assetCode: true, name: true, category: true } },
            },
            orderBy: { assignedDate: 'desc' },
          }).catch(() => []),
          prisma.loan.findMany({
            where: { employeeId: user.employeeId, status: 'ACTIVE', deletedAt: null },
            select: { id: true, principal: true, installmentAmount: true, installmentsPaid: true, installmentsTotal: true, reason: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => []),
          prisma.custody.findMany({
            where: { employeeId: user.employeeId, status: { in: ['OPEN', 'PARTIALLY_SETTLED'] }, deletedAt: null },
            select: { id: true, amount: true, settledAmount: true, reason: true, issuedDate: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => []),
        ]);

        if (employee) {
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
            activeLoans: loans.map(l => ({
              id: l.id,
              principal: Number(l.principal),
              installmentAmount: Number(l.installmentAmount),
              installmentsPaid: l.installmentsPaid,
              installmentsTotal: l.installmentsTotal,
              reason: l.reason,
            })),
            openCustodies: custodies.map(c => ({
              id: c.id,
              amount: Number(c.amount),
              settledAmount: Number(c.settledAmount),
              reason: c.reason,
              issuedDate: c.issuedDate.toISOString().slice(0, 10),
            })),
          };
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
