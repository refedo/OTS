'use client';

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
} from 'lucide-react';

type SelfServiceData = {
  employeeId: string;
  fullNameEn: string;
  occupation: string | null;
  assignedAssets: { id: string; assetCode: string; name: string; category: string; assignedDate: string }[];
  activeLoans: { id: string; principal: number; installmentAmount: number; installmentsPaid: number; installmentsTotal: number; reason: string | null }[];
  openCustodies: { id: string; amount: number; settledAmount: number; reason: string; issuedDate: string }[];
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  CAR: Car,
  LAPTOP: Laptop,
  SIM_CARD: Smartphone,
  KEY: Key,
  TOOL: Wrench,
};

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

export default function EmployeeSelfService({ data }: { data: SelfServiceData }) {
  const hasAssets = data.assignedAssets.length > 0;
  const hasLoans = data.activeLoans.length > 0;
  const hasCustodies = data.openCustodies.length > 0;

  if (!hasAssets && !hasLoans && !hasCustodies) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          My HR Info
        </h2>
        <Link href={`/hr/employees/${data.employeeId}`} className="text-xs text-primary hover:underline flex items-center gap-1">
          Full profile <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Assigned Assets */}
        {hasAssets && (
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-violet-700">
                <PackageSearch className="h-4 w-4" />
                <span className="text-sm font-semibold">Assigned Assets</span>
              </div>
              <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                {data.assignedAssets.length}
              </span>
            </div>
            <ul className="space-y-2">
              {data.assignedAssets.slice(0, 4).map(asset => (
                <li key={asset.id} className="flex items-center gap-2 text-sm">
                  <span className="text-violet-400 shrink-0">
                    <AssetIcon category={asset.category} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate">{asset.name}</p>
                    <p className="text-xs text-slate-400">{asset.assetCode} · since {fmtDate(asset.assignedDate)}</p>
                  </div>
                </li>
              ))}
              {data.assignedAssets.length > 4 && (
                <li className="text-xs text-violet-500 pt-1">+{data.assignedAssets.length - 4} more</li>
              )}
            </ul>
            <Link href="/hr/assets" className="mt-3 block text-xs text-violet-600 hover:underline">
              View asset registry →
            </Link>
          </div>
        )}

        {/* Active Loans */}
        {hasLoans && (
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-semibold">Active Loans</span>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                {data.activeLoans.length}
              </span>
            </div>
            <ul className="space-y-3">
              {data.activeLoans.slice(0, 2).map(loan => {
                const remaining = loan.installmentsTotal - loan.installmentsPaid;
                const balance = remaining * loan.installmentAmount;
                const progress = Math.round((loan.installmentsPaid / loan.installmentsTotal) * 100);
                return (
                  <li key={loan.id} className="space-y-1">
                    <p className="text-xs text-slate-500 truncate">{loan.reason ?? 'Loan'}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-emerald-700">SAR {fmtSAR(balance)}</span>
                      <span className="text-xs text-slate-400">{remaining} instalment{remaining !== 1 ? 's' : ''} left</span>
                    </div>
                    <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link href="/hr/loans" className="mt-3 block text-xs text-emerald-600 hover:underline">
              View all loans →
            </Link>
          </div>
        )}

        {/* Open Custodies */}
        {hasCustodies && (
          <div className="rounded-xl border bg-gradient-to-b from-indigo-50 to-white border-indigo-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <HandCoins className="h-4 w-4" />
                <span className="text-sm font-semibold">Open Custodies</span>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                {data.openCustodies.length}
              </span>
            </div>
            <ul className="space-y-3">
              {data.openCustodies.slice(0, 2).map(custody => {
                const outstanding = custody.amount - custody.settledAmount;
                const isPartial = custody.settledAmount > 0;
                return (
                  <li key={custody.id} className="space-y-1">
                    <p className="text-xs text-slate-500 truncate">{custody.reason}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-indigo-700">SAR {fmtSAR(outstanding)}</span>
                      {isPartial && (
                        <span className="text-xs text-amber-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> partial
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">issued {fmtDate(custody.issuedDate)}</p>
                  </li>
                );
              })}
            </ul>
            <Link href="/hr/custodies" className="mt-3 block text-xs text-indigo-600 hover:underline">
              View all custodies →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
