'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Calendar, AlertTriangle, CheckCircle2, Clock, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type ContractType =
  | 'HEALTH_INSURANCE' | 'MEDICAL_INSURANCE' | 'IQAMA' | 'CAR_REGISTRATION'
  | 'VEHICLE_LICENSE' | 'PROFESSIONAL_LICENSE' | 'COMMERCIAL_REGISTRATION'
  | 'LEGAL_DOCUMENT' | 'OTHER';

type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING_RENEWAL' | 'CANCELLED';

interface ContractRow {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  referenceNumber: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  expiryDateHijri: string | null;
  description: string | null;
}

interface Props { employeeId: string; }

const TYPE_LABELS: Record<ContractType, string> = {
  HEALTH_INSURANCE: 'Health Insurance',
  MEDICAL_INSURANCE: 'Medical Insurance',
  IQAMA: 'Iqama',
  CAR_REGISTRATION: 'Car Registration',
  VEHICLE_LICENSE: 'Vehicle License',
  PROFESSIONAL_LICENSE: 'Professional License',
  COMMERCIAL_REGISTRATION: 'Commercial Registration',
  LEGAL_DOCUMENT: 'Legal Document',
  OTHER: 'Other',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - now.getTime()) / 86400000);
}

function StatusBadge({ status, expiryDate }: { status: ContractStatus; expiryDate: string | null }) {
  if (status === 'ACTIVE' && expiryDate) {
    const days = daysUntil(expiryDate);
    if (days < 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-rose-100 text-rose-700 border-rose-200"><AlertTriangle className="h-3 w-3" />Expired</span>;
    if (days <= 7) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-rose-100 text-rose-700 border-rose-200"><AlertTriangle className="h-3 w-3" />{days}d left</span>;
    if (days <= 30) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-100 text-amber-700 border-amber-200"><Clock className="h-3 w-3" />{days}d left</span>;
  }
  const cfg: Record<ContractStatus, { icon: React.ReactNode; cls: string; label: string }> = {
    ACTIVE: { icon: <CheckCircle2 className="h-3 w-3" />, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Active' },
    EXPIRED: { icon: <AlertTriangle className="h-3 w-3" />, cls: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Expired' },
    PENDING_RENEWAL: { icon: <Clock className="h-3 w-3" />, cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending Renewal' },
    CANCELLED: { icon: <FileText className="h-3 w-3" />, cls: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Cancelled' },
  };
  const c = cfg[status] ?? cfg.ACTIVE;
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', c.cls)}>{c.icon}{c.label}</span>;
}

export function EmployeeContractsTab({ employeeId }: Props) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/contracts?employeeId=${employeeId}`);
      const data = await res.json();
      setContracts(Array.isArray(data) ? data : []);
    } catch { setContracts([]); } finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const active = contracts.filter(c => c.status === 'ACTIVE').length;
  const expiringSoon = contracts.filter(c => c.status === 'ACTIVE' && c.expiryDate && daysUntil(c.expiryDate) <= 30 && daysUntil(c.expiryDate) >= 0).length;
  const expired = contracts.filter(c => c.status === 'EXPIRED' || (c.expiryDate && daysUntil(c.expiryDate) < 0)).length;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sky-400" /></div>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-3">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Active</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{active}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-3">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Expiring Soon</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{expiringSoon}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-3">
          <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Expired</p>
          <p className="text-xl font-bold text-rose-700 mt-1">{expired}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-500" />
          <h3 className="text-sm font-semibold text-slate-700">Contracts & Documents</h3>
          <span className="text-xs text-slate-400 ml-auto">{contracts.length} record{contracts.length !== 1 ? 's' : ''}</span>
        </div>

        {contracts.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No contracts or documents linked to this employee.</div>
        ) : (
          <div className="divide-y">
            {contracts.map(c => (
              <div key={c.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{c.title}</span>
                    <span className="text-xs bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full">{TYPE_LABELS[c.type] ?? c.type}</span>
                    <StatusBadge status={c.status} expiryDate={c.expiryDate} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    {c.issueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Issued: {fmtDate(c.issueDate)}</span>}
                    {c.expiryDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Expires: {fmtDate(c.expiryDate)}{c.expiryDateHijri ? ` (${c.expiryDateHijri})` : ''}</span>}
                    {c.referenceNumber && <span>Ref: {c.referenceNumber}</span>}
                    {c.issuingAuthority && <span>{c.issuingAuthority}</span>}
                  </div>
                  {c.description && <p className="text-xs text-slate-400 italic">{c.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
