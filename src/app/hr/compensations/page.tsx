import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, ChevronRight, Calendar } from 'lucide-react';

export const metadata: Metadata = { title: 'Payroll Compensations' };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const KIND_LABEL: Record<string, string> = {
  ANNUAL_LEAVE_ALLOWANCE: 'Annual Leave',
  TICKET_ALLOWANCE: 'Ticket',
  EXIT_REENTRY_VISA: 'Exit/Re-entry',
  COMMISSION: 'Commission',
  INCENTIVE: 'Incentive',
  BONUS: 'Bonus',
  OTHER: 'Other',
  DEDUCTION: 'Deduction',
  FINE: 'Fine',
  ADVANCE_REPAYMENT: 'Advance Repay',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  CALCULATED: 'bg-sky-100 text-sky-700 border-sky-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PAID: 'bg-blue-100 text-blue-700 border-blue-200',
  LOCKED: 'bg-rose-100 text-rose-700 border-rose-200',
};

function sar(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function HrCompensationsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  if (!perms.includes('hr.payroll.view')) redirect('/unauthorized?from=/hr/compensations');

  const periods = await prisma.payrollPeriod.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: {
      id: true,
      year: true,
      month: true,
      status: true,
      adjustments: {
        where: { deletedAt: null },
        select: { kind: true, amount: true },
      },
    },
  });

  const totalAdjustments = periods.reduce((s, p) => s + p.adjustments.length, 0);
  const totalAmount = periods.reduce(
    (s, p) => s + p.adjustments.reduce((ps, a) => ps + Number(a.amount), 0),
    0,
  );
  const periodsWithAdj = periods.filter((p) => p.adjustments.length > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Gift className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Payroll Compensations</h1>
            </div>
            <p className="text-violet-100 text-sm">
              Annual leave allowances, tickets, commissions, incentives, and other entitlement adjustments across all payroll periods.
            </p>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Adjustments</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{totalAdjustments}</p>
            <p className="text-xs text-violet-500 mt-0.5">all periods</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Value</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{sar(totalAmount)}</p>
            <p className="text-xs text-emerald-500 mt-0.5">SAR</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Periods with Comp.</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{periodsWithAdj}</p>
            <p className="text-xs text-sky-500 mt-0.5">of {periods.length} total</p>
          </div>
        </div>

        {/* Periods List */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-slate-700">Payroll Periods</h2>
            <Badge variant="secondary">{periods.length}</Badge>
          </div>

          {periods.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">No payroll periods yet</p>
            </div>
          ) : (
            <ul className="divide-y">
              {periods.map((p) => {
                const kindCounts = p.adjustments.reduce<Record<string, number>>((acc, a) => {
                  acc[a.kind] = (acc[a.kind] ?? 0) + 1;
                  return acc;
                }, {});
                const total = p.adjustments.reduce((s, a) => s + Number(a.amount), 0);
                return (
                  <li key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="shrink-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {MONTHS[p.month - 1]} {p.year}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[p.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-w-0">
                        {Object.entries(kindCounts).map(([kind, count]) => (
                          <span key={kind} className="text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">
                            {KIND_LABEL[kind] ?? kind} ×{count}
                          </span>
                        ))}
                        {p.adjustments.length === 0 && (
                          <span className="text-xs text-slate-400">No compensations</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      {p.adjustments.length > 0 && (
                        <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                          SAR {sar(total)}
                        </span>
                      )}
                      <Link href={`/hr/payroll/${p.id}/compensations`}>
                        <Button size="sm" variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50 gap-1">
                          <Gift className="h-3.5 w-3.5" />
                          Manage
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
