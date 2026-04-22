'use client';

import { useEffect, useState } from 'react';
import { Loader2, Umbrella, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaveItem {
  id: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: string;
  reason: string | null;
  leaveType: { nameEn: string; nameAr?: string | null; code: string };
}

interface LeaveEntitlement {
  entitledDays: number;
  annualConsumed: number;
  remaining: number;
}

interface Props {
  employeeId: string;
  dateOfJoining: string;
  isSelfView: boolean;
  canViewLeaves: boolean;
}

function fmt(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_CLS: Record<string, string> = {
  APPROVED: 'text-emerald-600',
  PENDING: 'text-amber-600',
  PENDING_MANAGER: 'text-amber-600',
  PENDING_HR: 'text-amber-600',
  PENDING_CEO: 'text-amber-600',
  REJECTED: 'text-rose-600',
  CANCELLED: 'text-slate-400',
};

function computeEntitlement(dateOfJoining: string, leaves: LeaveItem[]): LeaveEntitlement {
  const joinDate = new Date(dateOfJoining + 'T00:00:00');
  const today = new Date();
  const diffMs = today.getTime() - joinDate.getTime();
  const monthsEmployed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
  const entitledDays = Math.round(monthsEmployed * 1.75 * 10) / 10;
  const annualApproved = leaves.filter(r => r.leaveType.code === 'ANNUAL' && r.status === 'APPROVED');
  const annualConsumed = Math.round(annualApproved.reduce((s, r) => s + Number(r.workingDays), 0) * 10) / 10;
  return { entitledDays, annualConsumed, remaining: Math.round((entitledDays - annualConsumed) * 10) / 10 };
}

export function EmployeeLeavesTab({ employeeId, dateOfJoining, isSelfView, canViewLeaves }: Props) {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSelfView && !canViewLeaves) {
      setLoading(false);
      return;
    }
    const url = isSelfView
      ? '/api/hr/leave-requests'
      : `/api/hr/leave-requests?employeeId=${employeeId}`;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => setLeaves(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load leave requests.'))
      .finally(() => setLoading(false));
  }, [employeeId, isSelfView, canViewLeaves]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading leaves…</span>
      </div>
    );
  }

  if (error || (!isSelfView && !canViewLeaves)) {
    return (
      <div className="rounded-2xl border bg-white shadow-sm px-6 py-12 text-center text-sm text-slate-400">
        {error || 'Leave data not available.'}
      </div>
    );
  }

  const entitlement = computeEntitlement(dateOfJoining, leaves);
  const usedPct = entitlement.entitledDays > 0
    ? Math.min(100, (entitlement.annualConsumed / entitlement.entitledDays) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Annual leave balance card */}
      <div className="rounded-2xl border bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Umbrella className="h-4 w-4 text-sky-500" />
          <h3 className="text-sm font-semibold text-slate-700">Annual Leave Balance</h3>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-3xl font-bold text-sky-600">{entitlement.remaining}</p>
            <p className="text-xs text-slate-400 mt-0.5">days remaining</p>
          </div>
          <div className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{entitlement.entitledDays}</span> entitled —{' '}
            <span className="font-medium text-slate-700">{entitlement.annualConsumed}</span> consumed
          </div>
        </div>
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      {/* Leave history */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Leave History</h3>
          </div>
          <span className="text-xs text-slate-400">{leaves.length} requests</span>
        </div>
        {leaves.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">No leave requests found.</div>
        ) : (
          <div className="divide-y">
            {leaves.map(l => (
              <div key={l.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{l.leaveType.nameEn}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmt(l.startDate)} → {fmt(l.endDate)} · {l.workingDays} working day{l.workingDays !== 1 ? 's' : ''}
                  </p>
                  {l.reason && <p className="text-xs text-slate-500 mt-1 truncate">{l.reason}</p>}
                </div>
                <span className={cn('text-xs font-medium shrink-0 mt-0.5', STATUS_CLS[l.status] ?? 'text-slate-500')}>
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
