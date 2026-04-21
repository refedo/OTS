'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  UserCircle2,
  ArrowLeft,
  Briefcase,
  CalendarDays,
  MapPin,
  Phone,
  CreditCard,
  Users,
  TrendingUp,
  PackageSearch,
  DollarSign,
  HandCoins,
  Car,
  Laptop,
  Smartphone,
  Key,
  Wrench,
  Box,
  FileText,
  AlertTriangle,
  Receipt,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  Umbrella,
  BadgeCheck,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileEmployee = {
  id: string;
  fullNameEn: string;
  fullNameAr: string | null;
  occupation: string | null;
  section: string | null;
  division: string | null;
  department: string | null;
  nationalId: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  dateOfJoining: string;
  dateOfLeaving: string | null;
  contractEndDate: string | null;
  contractType: string | null;
  workingLocation: string | null;
  maritalStatus: string | null;
  employeeNo: string | null;
  status: string;
  jobTitleEn: string | null;
  jobTitleAr: string | null;
  reportsTo: string | null;
};

type Asset = { id: string; assetCode: string; name: string; category: string; assignedDate: string; returnedDate: string | null; status: string };
type Loan = { id: string; principal: number; installmentAmount: number; installmentsPaid: number; installmentsTotal: number; totalAmountPaid: number; reason: string | null; status: string; startDate: string | null };
type Custody = { id: string; amount: number; settledAmount: number; reason: string; issuedDate: string; status: string };
type Violation = { id: string; violationDate: string; violationType: string; violationAmount: number; status: string; deductFromPayroll: boolean; description: string | null };
type Letter = { id: string; letterNumber: string; letterType: string; subject: string; issuedAt: string; status: string };
type Payslip = { periodLabel: string; netSalary: number; basicSalary: number; totalAllowances: number; payDate: string; periodStatus: string };
type Leave = { id: string; startDate: string; endDate: string; workingDays: number; status: string; reason: string | null; leaveTypeName: string; leaveTypeCode: string };
type LeaveEntitlement = { entitledDays: number; annualConsumed: number; remaining: number } | null;

export type SelfProfileData = {
  employee: ProfileEmployee;
  assets: Asset[];
  loans: Loan[];
  custodies: Custody[];
  violations: Violation[];
  letters: Letter[];
  payslips: Payslip[];
  leaves: Leave[];
  leaveEntitlement: LeaveEntitlement;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ASSET_ICON: Record<string, React.ElementType> = {
  CAR: Car, LAPTOP: Laptop, SIM_CARD: Smartphone, KEY: Key, TOOL: Wrench, DEFAULT: Box,
};

function assetIcon(category: string) {
  const C = ASSET_ICON[category] ?? ASSET_ICON.DEFAULT;
  return <C className="h-4 w-4" />;
}

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sar(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    LOCKED: 'bg-sky-100 text-sky-700 border-sky-200',
    PAID: 'bg-sky-100 text-sky-700 border-sky-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    PENDING_HR: 'bg-amber-100 text-amber-700 border-amber-200',
    PARTIALLY_SETTLED: 'bg-amber-100 text-amber-700 border-amber-200',
    OPEN: 'bg-amber-100 text-amber-700 border-amber-200',
    ON_LEAVE: 'bg-sky-100 text-sky-700 border-sky-200',
    RETURNED: 'bg-slate-100 text-slate-600 border-slate-200',
    SETTLED: 'bg-slate-100 text-slate-600 border-slate-200',
    CANCELLED: 'bg-rose-100 text-rose-700 border-rose-200',
    REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
    TERMINATED: 'bg-rose-100 text-rose-700 border-rose-200',
    RESIGNED: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  const cls = map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium', cls)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'profile' | 'leaves' | 'payslips' | 'finance' | 'assets' | 'letters';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
  { id: 'leaves', label: 'Leaves', icon: Umbrella },
  { id: 'payslips', label: 'Payslips', icon: Receipt },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'assets', label: 'Assets', icon: PackageSearch },
  { id: 'letters', label: 'Letters', icon: FileText },
];

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: SelfProfileData }) {
  const { employee, loans, custodies, assets, letters, leaveEntitlement } = data;
  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const activeAssets = assets.filter(a => a.status === 'ACTIVE');
  const openCustodies = custodies.filter(c => ['OPEN', 'PARTIALLY_SETTLED'].includes(c.status));

  const kpis = [
    {
      label: 'Leave Balance',
      value: leaveEntitlement ? `${leaveEntitlement.remaining} days` : '—',
      sub: leaveEntitlement ? `${leaveEntitlement.annualConsumed} consumed of ${leaveEntitlement.entitledDays} entitled` : 'No data',
      color: 'sky',
      icon: Umbrella,
    },
    {
      label: 'Active Loans',
      value: activeLoans.length,
      sub: activeLoans.length > 0 ? `SAR ${sar(activeLoans.reduce((s, l) => s + l.principal - l.totalAmountPaid, 0))} outstanding` : 'No active loans',
      color: 'amber',
      icon: Banknote,
    },
    {
      label: 'Assigned Assets',
      value: activeAssets.length,
      sub: activeAssets.length > 0 ? activeAssets.map(a => a.category).join(', ') : 'No assigned assets',
      color: 'violet',
      icon: PackageSearch,
    },
    {
      label: 'HR Letters',
      value: letters.length,
      sub: openCustodies.length > 0 ? `${openCustodies.length} open custodies` : 'No open custodies',
      color: 'emerald',
      icon: FileText,
    },
  ];

  const colorMap: Record<string, string> = {
    sky: 'from-sky-50 to-white border-sky-200 text-sky-700 text-sky-600 text-sky-500',
    amber: 'from-amber-50 to-white border-amber-200 text-amber-700 text-amber-600 text-amber-500',
    violet: 'from-violet-50 to-white border-violet-200 text-violet-700 text-violet-600 text-violet-500',
    emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-700 text-emerald-600 text-emerald-500',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(k => {
          const cols = colorMap[k.color].split(' ');
          const Icon = k.icon;
          return (
            <div key={k.label} className={cn('rounded-xl border bg-gradient-to-b p-4 shadow-sm', cols[0], cols[1], cols[2])}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('h-4 w-4', cols[4])} />
                <p className={cn('text-xs font-medium uppercase tracking-wide', cols[4])}>{k.label}</p>
              </div>
              <p className={cn('text-2xl font-bold mt-1', cols[3])}>{k.value}</p>
              <p className={cn('text-xs mt-0.5 truncate', cols[5])}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Employment Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Employee ID" value={employee.employeeNo ?? '—'} />
          <InfoRow label="Position" value={employee.occupation ?? employee.jobTitleEn ?? '—'} />
          <InfoRow label="Department" value={employee.department ?? '—'} />
          <InfoRow label="Section" value={employee.section ?? '—'} />
          <InfoRow label="Location" value={employee.workingLocation ?? '—'} />
          <InfoRow label="Joined" value={fmt(employee.dateOfJoining)} />
          <InfoRow label="Reports To" value={employee.reportsTo ?? '—'} />
          <InfoRow label="Contract Type" value={employee.contractType ?? '—'} />
          <InfoRow label="Contract End" value={fmt(employee.contractEndDate)} />
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ employee }: { employee: ProfileEmployee }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm divide-y">
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-700">Personal Information</h3>
      </div>
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <InfoRow label="Full Name (EN)" value={employee.fullNameEn} />
        <InfoRow label="Full Name (AR)" value={employee.fullNameAr} />
        <InfoRow label="National ID / Iqama" value={employee.nationalId} />
        <InfoRow label="Nationality" value={employee.nationality} />
        <InfoRow label="Date of Birth" value={fmt(employee.dateOfBirth)} />
        <InfoRow label="Marital Status" value={employee.maritalStatus} />
      </div>
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-700">Employment Details</h3>
      </div>
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <InfoRow label="Employee No." value={employee.employeeNo} />
        <InfoRow label="Position Title" value={employee.occupation ?? employee.jobTitleEn} />
        <InfoRow label="Job Title (AR)" value={employee.jobTitleAr} />
        <InfoRow label="Department" value={employee.department} />
        <InfoRow label="Section" value={employee.section} />
        <InfoRow label="Division" value={employee.division} />
        <InfoRow label="Working Location" value={employee.workingLocation} />
        <InfoRow label="Reports To" value={employee.reportsTo} />
        <InfoRow label="Status" value={<StatusBadge status={employee.status} />} />
        <InfoRow label="Date of Joining" value={fmt(employee.dateOfJoining)} />
        <InfoRow label="Contract Type" value={employee.contractType} />
        <InfoRow label="Contract End Date" value={fmt(employee.contractEndDate)} />
        {employee.dateOfLeaving && <InfoRow label="Date of Leaving" value={fmt(employee.dateOfLeaving)} />}
      </div>
    </div>
  );
}

function LeavesTab({ leaves, leaveEntitlement }: { leaves: Leave[]; leaveEntitlement: LeaveEntitlement }) {
  const statusColor: Record<string, string> = {
    APPROVED: 'text-emerald-600', PENDING: 'text-amber-600', PENDING_HR: 'text-amber-600',
    REJECTED: 'text-rose-600', CANCELLED: 'text-slate-400',
  };

  return (
    <div className="space-y-5">
      {leaveEntitlement && (
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Annual Leave Balance</h3>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-3xl font-bold text-sky-600">{leaveEntitlement.remaining}</p>
              <p className="text-xs text-slate-400 mt-0.5">days remaining</p>
            </div>
            <div className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{leaveEntitlement.entitledDays}</span> entitled —{' '}
              <span className="font-medium text-slate-700">{leaveEntitlement.annualConsumed}</span> consumed
            </div>
          </div>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full"
              style={{ width: `${leaveEntitlement.entitledDays > 0 ? Math.min(100, (leaveEntitlement.annualConsumed / leaveEntitlement.entitledDays) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Leave History</h3>
          <span className="text-xs text-slate-400">{leaves.length} requests</span>
        </div>
        {leaves.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">No leave requests found.</div>
        ) : (
          <div className="divide-y">
            {leaves.map(l => (
              <div key={l.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{l.leaveTypeName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmt(l.startDate)} → {fmt(l.endDate)} · {l.workingDays} working day{l.workingDays !== 1 ? 's' : ''}
                  </p>
                  {l.reason && <p className="text-xs text-slate-500 mt-1 truncate">{l.reason}</p>}
                </div>
                <span className={cn('text-xs font-medium shrink-0 mt-0.5', statusColor[l.status] ?? 'text-slate-500')}>
                  {l.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PayslipsTab({ payslips }: { payslips: Payslip[] }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Payslip History</h3>
        <span className="text-xs text-slate-400">{payslips.length} records</span>
      </div>
      {payslips.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">No approved payslips found.</div>
      ) : (
        <div className="divide-y">
          {payslips.map((p, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">{p.periodLabel}</p>
                <p className="text-xs text-slate-400 mt-0.5">Pay date: {fmt(p.payDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">SAR {sar(p.netSalary)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Basic: {sar(p.basicSalary)} + Allow: {sar(p.totalAllowances)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinanceTab({ loans, custodies }: { loans: Loan[]; custodies: Custody[] }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-semibold text-slate-700">Loans</h3>
        </div>
        {loans.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">No loan records.</div>
        ) : (
          <div className="divide-y">
            {loans.map(l => {
              const pct = l.installmentsTotal > 0 ? Math.round((l.installmentsPaid / l.installmentsTotal) * 100) : 0;
              return (
                <div key={l.id} className="px-6 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{l.reason ?? 'Loan'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        SAR {sar(l.installmentAmount)}/month · {l.installmentsPaid}/{l.installmentsTotal} paid
                      </p>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>SAR {sar(l.totalAmountPaid)} paid</span>
                    <span>SAR {sar(l.principal - l.totalAmountPaid)} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-semibold text-slate-700">Custodies & Cash Advances</h3>
        </div>
        {custodies.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">No custody records.</div>
        ) : (
          <div className="divide-y">
            {custodies.map(c => (
              <div key={c.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{c.reason}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Issued: {fmt(c.issuedDate)} · SAR {sar(c.settledAmount)} of SAR {sar(c.amount)} settled
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetsTab({ assets, violations }: { assets: Asset[]; violations: Violation[] }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Asset Assignments</h3>
          <span className="text-xs text-slate-400">{assets.filter(a => a.status === 'ACTIVE').length} active</span>
        </div>
        {assets.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">No asset assignments.</div>
        ) : (
          <div className="divide-y">
            {assets.map(a => (
              <div key={a.id} className="px-6 py-4 flex items-center gap-4">
                <div className={cn('p-2 rounded-lg shrink-0', a.status === 'ACTIVE' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400')}>
                  {assetIcon(a.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{a.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {a.assetCode} · Assigned {fmt(a.assignedDate)}{a.returnedDate ? ` · Returned ${fmt(a.returnedDate)}` : ''}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {violations.length > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-sm font-semibold text-slate-700">Traffic Violations</h3>
          </div>
          <div className="divide-y">
            {violations.map(v => (
              <div key={v.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{v.violationType}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmt(v.violationDate)} · SAR {sar(v.violationAmount)}
                    {v.deductFromPayroll && <span className="ml-2 text-rose-500 font-medium">Payroll deduction</span>}
                  </p>
                  {v.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{v.description}</p>}
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LettersTab({ letters }: { letters: Letter[] }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">HR Letters & Correspondence</h3>
        <span className="text-xs text-slate-400">{letters.length} letters</span>
      </div>
      {letters.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">No letters on file.</div>
      ) : (
        <div className="divide-y">
          {letters.map(l => (
            <div key={l.id} className="px-6 py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-mono">{l.letterNumber}</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{l.subject}</p>
                <p className="text-xs text-slate-400 mt-0.5">{l.letterType.replace(/_/g, ' ')} · {fmt(l.issuedAt)}</p>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmployeeSelfProfile({ data }: { data: SelfProfileData }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { employee } = data;

  const statusDot: Record<string, string> = {
    ACTIVE: 'bg-emerald-400',
    ON_LEAVE: 'bg-sky-400',
    SUSPENDED: 'bg-amber-400',
    TERMINATED: 'bg-rose-400',
    RESIGNED: 'bg-rose-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sky-200 hover:text-white text-xs mb-4 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </Link>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                <UserCircle2 className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{employee.fullNameEn}</h1>
                  <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', statusDot[employee.status] ?? 'bg-slate-300')} />
                </div>
                {employee.fullNameAr && <p className="text-sky-100 text-sm mt-0.5" dir="rtl">{employee.fullNameAr}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sky-100 text-sm">
                  {(employee.occupation || employee.jobTitleEn) && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {employee.occupation ?? employee.jobTitleEn}
                    </span>
                  )}
                  {employee.department && (
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {employee.department}
                    </span>
                  )}
                  {employee.workingLocation && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {employee.workingLocation}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Joined {fmt(employee.dateOfJoining)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'profile' && <ProfileTab employee={employee} />}
          {activeTab === 'leaves' && <LeavesTab leaves={data.leaves} leaveEntitlement={data.leaveEntitlement} />}
          {activeTab === 'payslips' && <PayslipsTab payslips={data.payslips} />}
          {activeTab === 'finance' && <FinanceTab loans={data.loans} custodies={data.custodies} />}
          {activeTab === 'assets' && <AssetsTab assets={data.assets} violations={data.violations} />}
          {activeTab === 'letters' && <LettersTab letters={data.letters} />}
        </div>
      </div>
    </div>
  );
}
