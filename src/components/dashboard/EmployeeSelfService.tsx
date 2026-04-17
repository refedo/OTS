'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PackageSearch,
  Car,
  Laptop,
  Smartphone,
  Key,
  Wrench,
  Box,
  DollarSign,
  HandCoins,
  ChevronRight,
  AlertTriangle,
  User,
  FileText,
  Receipt,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  CalendarDays,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SelfServiceData = {
  employeeId: string;
  fullNameEn: string;
  occupation: string | null;
  assignedAssets: { id: string; assetCode: string; name: string; category: string; assignedDate: string }[];
  activeLoans: { id: string; principal: number; installmentAmount: number; installmentsPaid: number; installmentsTotal: number; reason: string | null }[];
  openCustodies: { id: string; amount: number; settledAmount: number; reason: string; issuedDate: string }[];
  recentPayslips: { periodLabel: string; netSalary: number; basicSalary: number; totalAllowances: number; payDate: string }[];
  trafficViolations: { id: string; violationDate: string; violationType: string; violationAmount: number; status: string; deductFromPayroll: boolean }[];
  recentLetters: { id: string; letterNumber: string; letterType: string; subject: string; issuedAt: string }[];
  activeContracts: { id: string; contractNumber: string; title: string; type: string; expiryDate: string | null; status: string }[];
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  CAR: Car,
  LAPTOP: Laptop,
  SIM_CARD: Smartphone,
  KEY: Key,
  TOOL: Wrench,
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'assets', label: 'Assets', icon: PackageSearch },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'payslips', label: 'Payslips', icon: Receipt },
  { id: 'violations', label: 'Violations', icon: AlertCircle },
  { id: 'letters', label: 'Letters', icon: FileText },
  { id: 'contracts', label: 'Contracts', icon: Shield },
] as const;

type TabId = typeof TABS[number]['id'];

function AssetIcon({ category }: { category: string }) {
  const Icon = CATEGORY_ICON[category] ?? Box;
  return <Icon className="h-4 w-4" />;
}

function fmtSAR(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expiryColor(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = diff / 86400000;
  if (days < 0) return 'text-red-600 font-semibold';
  if (days < 7) return 'text-red-500 font-medium';
  if (days < 30) return 'text-amber-600 font-medium';
  return 'text-slate-500';
}

function violationStatusBadge(status: string) {
  switch (status) {
    case 'PAID_BY_EMPLOYEE':
    case 'PAID_BY_COMPANY': return 'bg-emerald-100 text-emerald-700';
    case 'DEDUCTED_FROM_PAYROLL': return 'bg-blue-100 text-blue-700';
    case 'PENDING': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function violationStatusLabel(status: string) {
  switch (status) {
    case 'PAID_BY_EMPLOYEE': return 'Paid';
    case 'PAID_BY_COMPANY': return 'Company Paid';
    case 'DEDUCTED_FROM_PAYROLL': return 'Deducted';
    case 'PENDING': return 'Pending';
    default: return status;
  }
}

function letterTypeLabel(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function EmployeeSelfService({ data }: { data: SelfServiceData }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const hasAssets = data.assignedAssets.length > 0;
  const hasLoans = data.activeLoans.length > 0;
  const hasCustodies = data.openCustodies.length > 0;
  const hasPayslips = data.recentPayslips.length > 0;
  const hasViolations = data.trafficViolations.length > 0;
  const hasLetters = data.recentLetters.length > 0;
  const hasContracts = data.activeContracts.length > 0;

  const hasAnyData = hasAssets || hasLoans || hasCustodies || hasPayslips || hasViolations || hasLetters || hasContracts;
  if (!hasAnyData) return null;

  const expiringContracts = data.activeContracts.filter(c => {
    if (!c.expiryDate) return false;
    const days = (new Date(c.expiryDate).getTime() - Date.now()) / 86400000;
    return days < 30;
  });

  const pendingViolations = data.trafficViolations.filter(v => v.status === 'PENDING' || v.status === 'DEDUCTED_FROM_PAYROLL');
  const totalLoanBalance = data.activeLoans.reduce((s, l) => s + (l.installmentsTotal - l.installmentsPaid) * l.installmentAmount, 0);
  const totalCustodyBalance = data.openCustodies.reduce((s, c) => s + (c.amount - c.settledAmount), 0);

  const visibleTabs = TABS.filter(t => {
    if (t.id === 'overview') return true;
    if (t.id === 'assets') return hasAssets;
    if (t.id === 'finance') return hasLoans || hasCustodies;
    if (t.id === 'payslips') return hasPayslips;
    if (t.id === 'violations') return hasViolations;
    if (t.id === 'letters') return hasLetters;
    if (t.id === 'contracts') return hasContracts;
    return false;
  });

  return (
    <section>
      {/* Hero banner */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-600 p-5 text-white shadow-lg relative overflow-hidden mb-4">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <User className="h-4 w-4" />
              </div>
              <p className="text-indigo-100 text-xs font-medium">My HR Profile</p>
            </div>
            <h2 className="text-lg font-bold">{data.fullNameEn}</h2>
            {data.occupation && <p className="text-indigo-200 text-sm">{data.occupation}</p>}
          </div>
          <Link
            href={`/hr/employees/${data.employeeId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm"
          >
            Full profile <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* KPI strip */}
        <div className="relative z-10 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur-sm">
            <p className="text-indigo-100 text-[10px] font-medium uppercase tracking-wide">Assets</p>
            <p className="text-xl font-bold">{data.assignedAssets.length}</p>
            <p className="text-indigo-200 text-[10px]">assigned</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur-sm">
            <p className="text-indigo-100 text-[10px] font-medium uppercase tracking-wide">Loan Balance</p>
            <p className="text-lg font-bold">{totalLoanBalance > 0 ? `SAR ${Math.round(totalLoanBalance / 1000)}K` : '—'}</p>
            <p className="text-indigo-200 text-[10px]">{data.activeLoans.length} active</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur-sm">
            <p className="text-indigo-100 text-[10px] font-medium uppercase tracking-wide">Violations</p>
            <p className="text-xl font-bold">{pendingViolations.length}</p>
            <p className="text-indigo-200 text-[10px]">pending</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur-sm">
            <p className="text-indigo-100 text-[10px] font-medium uppercase tracking-wide">Contracts</p>
            <p className="text-xl font-bold">{expiringContracts.length}</p>
            <p className="text-indigo-200 text-[10px]">expiring soon</p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-3 scrollbar-hide">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600',
              )}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Assets summary */}
          {hasAssets && (
            <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-violet-700">
                  <PackageSearch className="h-4 w-4" />
                  <span className="text-sm font-semibold">Assigned Assets</span>
                </div>
                <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">{data.assignedAssets.length}</span>
              </div>
              <ul className="space-y-2">
                {data.assignedAssets.slice(0, 3).map(asset => (
                  <li key={asset.id} className="flex items-center gap-2 text-sm">
                    <span className="text-violet-400 shrink-0"><AssetIcon category={asset.category} /></span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700 truncate text-xs">{asset.name}</p>
                      <p className="text-[10px] text-slate-400">{asset.assetCode}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button onClick={() => setActiveTab('assets')} className="mt-3 text-xs text-violet-600 hover:underline">View all →</button>
            </div>
          )}

          {/* Finance summary */}
          {(hasLoans || hasCustodies) && (
            <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-semibold">Finance</span>
                </div>
              </div>
              {hasLoans && (
                <div className="mb-2">
                  <p className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">Loans</p>
                  {data.activeLoans.slice(0, 1).map(loan => {
                    const remaining = loan.installmentsTotal - loan.installmentsPaid;
                    const progress = Math.round((loan.installmentsPaid / loan.installmentsTotal) * 100);
                    return (
                      <div key={loan.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 truncate">{loan.reason ?? 'Loan'}</span>
                          <span className="font-semibold text-emerald-700 shrink-0">SAR {fmtSAR(remaining * loan.installmentAmount)}</span>
                        </div>
                        <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400">{remaining} instalments left</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {hasCustodies && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">Custodies</p>
                  <p className="text-sm font-semibold text-indigo-700">SAR {fmtSAR(totalCustodyBalance)}</p>
                  <p className="text-[10px] text-slate-400">outstanding balance</p>
                </div>
              )}
              <button onClick={() => setActiveTab('finance')} className="mt-3 text-xs text-emerald-600 hover:underline">View details →</button>
            </div>
          )}

          {/* Recent payslip */}
          {hasPayslips && (
            <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sky-700">
                  <Receipt className="h-4 w-4" />
                  <span className="text-sm font-semibold">Latest Payslip</span>
                </div>
              </div>
              {data.recentPayslips.slice(0, 1).map((p, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium">{p.periodLabel}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <p className="text-slate-400 text-[10px]">Basic</p>
                      <p className="font-semibold text-slate-700">SAR {fmtSAR(p.basicSalary)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Allowances</p>
                      <p className="font-semibold text-slate-700">SAR {fmtSAR(p.totalAllowances)}</p>
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-[10px] text-sky-600 font-medium">Net Pay</p>
                    <p className="text-lg font-bold text-sky-700">SAR {fmtSAR(p.netSalary)}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setActiveTab('payslips')} className="mt-2 text-xs text-sky-600 hover:underline">View all payslips →</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-700">
              <PackageSearch className="h-4 w-4" />
              <span className="text-sm font-semibold">Assigned Assets</span>
            </div>
            <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">{data.assignedAssets.length}</span>
          </div>
          <div className="divide-y">
            {data.assignedAssets.map(asset => (
              <div key={asset.id} className="flex items-center gap-3 px-5 py-3 hover:bg-violet-50/50 transition-colors">
                <div className="size-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <AssetIcon category={asset.category} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{asset.name}</p>
                  <p className="text-xs text-slate-400">{asset.assetCode} · {asset.category.replace(/_/g, ' ')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">Since</p>
                  <p className="text-xs text-slate-600 font-medium">{fmtDate(asset.assignedDate)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t">
            <Link href="/hr/assets" className="text-xs text-violet-600 hover:underline">Open asset registry →</Link>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Loans */}
          {hasLoans && (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-semibold">Active Loans</span>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">{data.activeLoans.length}</span>
              </div>
              <div className="divide-y">
                {data.activeLoans.map(loan => {
                  const remaining = loan.installmentsTotal - loan.installmentsPaid;
                  const balance = remaining * loan.installmentAmount;
                  const progress = Math.round((loan.installmentsPaid / loan.installmentsTotal) * 100);
                  return (
                    <div key={loan.id} className="px-5 py-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-slate-700">{loan.reason ?? 'Loan'}</p>
                        <p className="text-sm font-bold text-emerald-700">SAR {fmtSAR(balance)}</p>
                      </div>
                      <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{loan.installmentsPaid}/{loan.installmentsTotal} paid · SAR {fmtSAR(loan.installmentAmount)}/mo</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t">
                <Link href="/hr/loans" className="text-xs text-emerald-600 hover:underline">View all loans →</Link>
              </div>
            </div>
          )}

          {/* Custodies */}
          {hasCustodies && (
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700">
                  <HandCoins className="h-4 w-4" />
                  <span className="text-sm font-semibold">Open Custodies</span>
                </div>
                <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{data.openCustodies.length}</span>
              </div>
              <div className="divide-y">
                {data.openCustodies.map(custody => {
                  const outstanding = custody.amount - custody.settledAmount;
                  const isPartial = custody.settledAmount > 0;
                  return (
                    <div key={custody.id} className="px-5 py-4 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-slate-700">{custody.reason}</p>
                        <p className="text-sm font-bold text-indigo-700">SAR {fmtSAR(outstanding)}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Issued {fmtDate(custody.issuedDate)}</span>
                        {isPartial && (
                          <span className="text-amber-500 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> partially settled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t">
                <Link href="/hr/custodies" className="text-xs text-indigo-600 hover:underline">View all custodies →</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payslips' && (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b flex items-center gap-2 text-sky-700">
            <Receipt className="h-4 w-4" />
            <span className="text-sm font-semibold">Recent Payslips</span>
          </div>
          {data.recentPayslips.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No payslips available</div>
          ) : (
            <div className="divide-y">
              {data.recentPayslips.map((p, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{p.periodLabel}</p>
                      <p className="text-xs text-slate-400">Pay date: {fmtDate(p.payDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-sky-600 font-medium">Net Pay</p>
                      <p className="text-base font-bold text-sky-700">SAR {fmtSAR(p.netSalary)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Basic</p>
                      <p className="text-xs font-semibold text-slate-700">SAR {fmtSAR(p.basicSalary)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Allowances</p>
                      <p className="text-xs font-semibold text-slate-700">SAR {fmtSAR(p.totalAllowances)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
                      <p className="text-xs font-semibold text-sky-700">SAR {fmtSAR(p.netSalary)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Traffic Violations</span>
            </div>
            <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium">{data.trafficViolations.length}</span>
          </div>
          {data.trafficViolations.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No traffic violations</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.trafficViolations.map(v => (
                <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-slate-700 truncate">{v.violationType}</p>
                      <span className={cn('text-[10px] px-1.5 py-0 rounded-full font-semibold shrink-0', violationStatusBadge(v.status))}>
                        {violationStatusLabel(v.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{fmtDate(v.violationDate)}</p>
                    {v.deductFromPayroll && (
                      <p className="text-[10px] text-amber-600 font-medium mt-0.5">Deducted from payroll</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-rose-600">SAR {fmtSAR(v.violationAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'letters' && (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-semibold">HR Letters</span>
            </div>
            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">{data.recentLetters.length}</span>
          </div>
          {data.recentLetters.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No letters issued</div>
          ) : (
            <div className="divide-y">
              {data.recentLetters.map(l => (
                <div key={l.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{l.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0 rounded font-medium">{letterTypeLabel(l.letterType)}</span>
                      <span className="text-[10px] text-slate-400">{l.letterNumber}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{fmtDate(l.issuedAt)}</p>
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t">
            <Link href="/hr/letters" className="text-xs text-amber-600 hover:underline">View all letters →</Link>
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-700">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-semibold">Contracts & Documents</span>
            </div>
            <span className="text-xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-medium">{data.activeContracts.length}</span>
          </div>
          {data.activeContracts.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No active contracts</div>
          ) : (
            <div className="divide-y">
              {data.activeContracts.map(c => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{c.contractNumber}</span>
                      <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0 rounded font-medium">{c.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  {c.expiryDate && (
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400">Expires</p>
                      <p className={cn('text-xs font-semibold', expiryColor(c.expiryDate))}>{fmtDate(c.expiryDate)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t">
            <Link href="/hr/contracts" className="text-xs text-teal-600 hover:underline">View all contracts →</Link>
          </div>
        </div>
      )}
    </section>
  );
}
