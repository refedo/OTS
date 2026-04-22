'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Landmark, Wallet, PackageSearch, CalendarDays,
  AlertTriangle, CheckCircle2, AlertCircle, ArrowRight, User, FileText, Umbrella,
} from 'lucide-react';
import Link from 'next/link';

type LoanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type CustodyStatus = 'OPEN' | 'PARTIALLY_SETTLED' | 'SETTLED';

interface LoanRow {
  id: string;
  principal: string;
  installmentAmount: string;
  installmentsTotal: number;
  installmentsPaid: number;
  startDate: string;
  status: LoanStatus;
  reason: string | null;
}

interface CustodyRow {
  id: string;
  amount: string;
  issuedDate: string;
  reason: string;
  settledAmount: string;
  deductionAmount: string;
  status: CustodyStatus;
}

interface AssetAssignment {
  id: string;
  assignedDate: string;
  status: string;
  asset: { id: string; name: string; category: string; assetCode: string };
}

interface ContractRow {
  id: string;
  title: string;
  type: string;
  expiryDate: string | null;
  expiryDateHijri: string | null;
  status: string;
}

interface LeaveEntitlement {
  entitledDays: number;
  annualConsumed: number;
  remaining: number;
}

interface Props {
  employeeId: string;
  employee: {
    fullNameEn: string;
    dateOfJoining: string;
    dateOfLeaving?: string | null;
    status: string;
    occupation?: string | null;
    department?: string | null;
    basicSalary?: string;
  };
  canViewLoans: boolean;
  canViewCustodies: boolean;
  canViewAssets: boolean;
  canViewContracts: boolean;
  onEditClick?: () => void;
  showEditButton?: boolean;
  showLeaveBalance?: boolean;
}

function money(v: string | number) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  return new Date(s + (s.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return Math.ceil((d.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);
}

function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) return <Badge className="bg-rose-100 text-rose-700 border-rose-200 border text-xs">Expired {Math.abs(days)}d ago</Badge>;
  if (days <= 7) return <Badge className="bg-rose-100 text-rose-700 border-rose-200 border text-xs">{days}d left</Badge>;
  if (days <= 30) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">{days}d left</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-xs">{days}d left</Badge>;
}

export function EmployeeOverviewTab({
  employeeId, employee, canViewLoans, canViewCustodies, canViewAssets, canViewContracts, onEditClick, showEditButton = true, showLeaveBalance = false,
}: Props) {
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [custodies, setCustodies] = useState<CustodyRow[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [leaveEntitlement, setLeaveEntitlement] = useState<LeaveEntitlement | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetches: Promise<unknown>[] = [];

      if (showLeaveBalance) {
        fetches.push(
          fetch(`/api/hr/leave-balance?employeeId=${employeeId}`)
            .then(r => r.ok ? r.json() : null)
            .then((data: unknown) => {
              if (data && typeof data === 'object' && 'entitledDays' in data) {
                setLeaveEntitlement(data as LeaveEntitlement);
              }
            }),
        );
      }

      if (canViewLoans) {
        fetches.push(
          fetch(`/api/hr/loans?employeeId=${employeeId}`)
            .then(r => r.ok ? r.json() : [])
            .then(setLoans),
        );
      }
      if (canViewCustodies) {
        fetches.push(
          fetch(`/api/hr/custodies?employeeId=${employeeId}`)
            .then(r => r.ok ? r.json() : [])
            .then(setCustodies),
        );
      }
      if (canViewAssets) {
        fetches.push(
          fetch(`/api/hr/asset-assignments?employeeId=${employeeId}&status=ACTIVE`)
            .then(r => r.ok ? r.json() : [])
            .then(setAssignments),
        );
      }
      if (canViewContracts) {
        fetches.push(
          fetch(`/api/hr/contracts?employeeId=${employeeId}`)
            .then(r => r.ok ? r.json() : [])
            .then((data: unknown) => setContracts(Array.isArray(data) ? data : (data as { contracts?: ContractRow[] })?.contracts ?? [])),
        );
      }
      await Promise.allSettled(fetches);
    } finally {
      setLoading(false);
    }
  }, [employeeId, canViewLoans, canViewCustodies, canViewAssets, canViewContracts, showLeaveBalance]);

  useEffect(() => { load(); }, [load]);

  const activeLoans = useMemo(() => loans.filter(l => l.status === 'ACTIVE'), [loans]);
  const loanBalance = useMemo(() => activeLoans.reduce((s, l) => s + (l.installmentsTotal - l.installmentsPaid) * Number(l.installmentAmount), 0), [activeLoans]);
  const openCustodies = useMemo(() => custodies.filter(c => c.status !== 'SETTLED'), [custodies]);
  const custodyBalance = useMemo(() => openCustodies.reduce((s, c) => s + (Number(c.amount) - Number(c.settledAmount)), 0), [openCustodies]);
  const expiringContracts = useMemo(() => contracts.filter(c => c.expiryDate && c.status === 'ACTIVE'), [contracts]);
  const urgentContracts = useMemo(() => expiringContracts.filter(c => c.expiryDate && daysUntil(c.expiryDate) <= 7), [expiringContracts]);
  const soonContracts = useMemo(() => expiringContracts.filter(c => daysUntil(c.expiryDate!) <= 30), [expiringContracts]);

  const contractEndDays = employee.dateOfLeaving ? daysUntil(employee.dateOfLeaving) : null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading overview…
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Quick info + Edit button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            Joined {fmtDate(employee.dateOfJoining)}
          </div>
          {employee.dateOfLeaving && (
            <div className={`flex items-center gap-1.5 ${contractEndDays !== null && contractEndDays <= 30 ? 'text-amber-700 font-medium' : ''}`}>
              <CalendarDays className="h-4 w-4 text-slate-400" />
              Contract ends {fmtDate(employee.dateOfLeaving)}
              {contractEndDays !== null && <ExpiryBadge days={contractEndDays} />}
            </div>
          )}
        </div>
        {showEditButton && (
          <Button variant="outline" size="sm" onClick={onEditClick} className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Edit Record
          </Button>
        )}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {showLeaveBalance && (
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide flex items-center gap-1"><Umbrella className="h-3 w-3" />Leave Balance</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{leaveEntitlement?.remaining ?? '—'}</p>
            <p className="text-xs text-emerald-500 mt-0.5">{leaveEntitlement ? `of ${leaveEntitlement.entitledDays} days entitled` : 'days remaining'}</p>
          </div>
        )}
        {!showLeaveBalance && (
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Active Loans</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{activeLoans.length}</p>
            {activeLoans.length > 0 && <p className="text-xs text-sky-500 mt-0.5">SAR {money(loanBalance)} remaining</p>}
          </div>
        )}
        <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Open Custodies</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{openCustodies.length}</p>
          {openCustodies.length > 0 && <p className="text-xs text-amber-500 mt-0.5">SAR {money(custodyBalance)} outstanding</p>}
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Assigned Assets</p>
          <p className="text-2xl font-bold text-violet-700 mt-1">{assignments.length}</p>
          <p className="text-xs text-violet-500 mt-0.5">currently held</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
          <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Expiring Docs</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">
            {soonContracts.length}
          </p>
          <p className="text-xs text-rose-500 mt-0.5">within 30 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loans summary */}
        {canViewLoans && (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 px-5 py-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-sky-600" /> Loans
              </CardTitle>
              <Link href={`/hr/employees/${employeeId}?tab=finance`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                  All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loans.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No loans on record.</p>
              ) : (
                <div className="divide-y">
                  {loans.slice(0, 3).map(l => {
                    const remaining = (l.installmentsTotal - l.installmentsPaid) * Number(l.installmentAmount);
                    const progress = l.installmentsTotal > 0 ? (l.installmentsPaid / l.installmentsTotal) * 100 : 0;
                    return (
                      <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800">SAR {money(l.principal)}</div>
                          <div className="text-xs text-muted-foreground truncate">{l.reason || 'No reason'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{l.installmentsPaid}/{l.installmentsTotal}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-slate-800">SAR {money(remaining)}</div>
                          <Badge className={`text-xs border ${l.status === 'ACTIVE' ? 'bg-sky-100 text-sky-700 border-sky-200' : l.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {l.status.toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Custodies summary */}
        {canViewCustodies && (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 px-5 py-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-600" /> Custodies
              </CardTitle>
              <Link href={`/hr/employees/${employeeId}?tab=finance`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                  All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {custodies.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No custodies on record.</p>
              ) : (
                <div className="divide-y">
                  {custodies.slice(0, 3).map(c => {
                    const outstanding = Number(c.amount) - Number(c.settledAmount);
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{c.reason}</div>
                          <div className="text-xs text-muted-foreground">{fmtDate(c.issuedDate)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-rose-700">SAR {money(outstanding)}</div>
                          <Badge className={`text-xs border ${c.status === 'OPEN' ? 'bg-amber-100 text-amber-700 border-amber-200' : c.status === 'PARTIALLY_SETTLED' ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                            {c.status.replace('_', ' ').toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assigned assets */}
        {canViewAssets && (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 px-5 py-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <PackageSearch className="h-4 w-4 text-violet-600" /> Assigned Assets
              </CardTitle>
              <Link href={`/hr/employees/${employeeId}?tab=assets`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                  All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No assets currently assigned.</p>
              ) : (
                <div className="divide-y">
                  {assignments.slice(0, 4).map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="p-1.5 bg-violet-50 rounded-lg">
                        <PackageSearch className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{a.asset.name}</div>
                        <div className="text-xs text-muted-foreground">{a.asset.assetCode} · {a.asset.category.replace('_', ' ')}</div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">Since {fmtDate(a.assignedDate)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contracts & expiry */}
        {canViewContracts && (
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 px-5 py-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-rose-600" /> Documents & Expiry
              </CardTitle>
              <Link href="/hr/contracts">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                  All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {expiringContracts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No active documents linked.</p>
              ) : (
                <div className="divide-y">
                  {expiringContracts.slice(0, 4).map(c => {
                    const days = c.expiryDate ? daysUntil(c.expiryDate) : null;
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{c.type.replace(/_/g, ' ')}</div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <div className="text-xs text-slate-600">{fmtDate(c.expiryDate ?? undefined)}</div>
                          {days !== null && <ExpiryBadge days={days} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {urgentContracts.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-sm text-rose-800">
            <strong>Urgent:</strong> {urgentContracts.length} document(s) expire within 7 days.
            <Link href="/hr/contracts" className="ml-1 underline">Review contracts</Link>
          </div>
        </div>
      )}
    </div>
  );
}
