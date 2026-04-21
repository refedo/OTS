'use client';

import { useCallback, useEffect, useState } from 'react';
import { Send, Calendar, Loader2, ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Circulation {
  id: string;
  circulationNumber: string;
  subject: string;
  content: string | null;
  language: string;
  status: 'PENDING_CEO' | 'APPROVED' | 'REJECTED';
  issuedAt: string;
  approvedAt: string | null;
  createdBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  recipients: Array<{
    employee: { id: string; fullNameEn: string; employmentId: string } | null;
    department: { id: string; name: string } | null;
  }>;
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: Circulation['status'] }) {
  const cfg = {
    PENDING_CEO: { icon: <Clock className="h-3 w-3" />, cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending CEO' },
    APPROVED:    { icon: <CheckCircle2 className="h-3 w-3" />, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Approved' },
    REJECTED:    { icon: <XCircle className="h-3 w-3" />, cls: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Rejected' },
  };
  const c = cfg[status] ?? cfg.PENDING_CEO;
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', c.cls)}>{c.icon}{c.label}</span>;
}

interface Props { employeeId: string; }

export function EmployeeCirculationsTab({ employeeId }: Props) {
  const [circulations, setCirculations] = useState<Circulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/circulations');
      const data = await res.json();
      const all: Circulation[] = Array.isArray(data) ? data : [];
      // Filter to circulations that target this employee (ALL, or specific employee/department)
      const relevant = all.filter(c => {
        if (c.recipients.length === 0) return true; // ALL type
        return c.recipients.some(r => r.employee?.id === employeeId);
      });
      setCirculations(relevant);
    } catch { setCirculations([]); } finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const approved = circulations.filter(c => c.status === 'APPROVED').length;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sky-400" /></div>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-3">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total</p>
          <p className="text-xl font-bold text-sky-700 mt-1">{circulations.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-3">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Approved</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{approved}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-3">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Pending</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{circulations.filter(c => c.status === 'PENDING_CEO').length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {circulations.length === 0 ? (
          <div className="rounded-2xl border bg-white shadow-sm p-12 text-center">
            <Send className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No circulations for this employee</p>
          </div>
        ) : circulations.map(c => {
          const open = expanded.has(c.id);
          return (
            <div key={c.id} className="border rounded-xl bg-white overflow-hidden border-slate-200">
              <div
                className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50"
                onClick={() => toggle(c.id)}
              >
                <div className="p-1.5 bg-sky-100 rounded-lg">
                  <Send className="h-4 w-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.subject}</p>
                  <p className="text-xs text-slate-400">{c.circulationNumber} · {fmtDate(c.issuedAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </div>
              {open && (
                <div className="px-5 py-4 border-t bg-slate-50 space-y-2">
                  {c.content && <div className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</div>}
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(c.issuedAt)}</span>
                    {c.createdBy && <span>By {c.createdBy.name}</span>}
                    {c.approvedBy && c.approvedAt && <span>Approved by {c.approvedBy.name} on {fmtDate(c.approvedAt)}</span>}
                    <span>Lang: {c.language}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
