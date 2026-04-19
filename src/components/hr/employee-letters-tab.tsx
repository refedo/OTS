'use client';

/**
 * EmployeeLettersTab — shows all HR letters issued to a specific employee.
 * Displayed inside the employee detail page tabs (19.1.0).
 */

import { useEffect, useState } from 'react';
import { Mail, FileText, ExternalLink, Loader2, Printer, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const LETTER_TYPE_LABEL: Record<string, string> = {
  QUESTIONING:           'Questioning',
  ATTENTION:             'Attention',
  FIRST_WARNING:         'First Warning',
  FINAL_WARNING:         'Final Warning',
  NON_RENEWAL_NOTICE:    'Non-Renewal',
  DISMISSAL:             'Dismissal',
  CIRCULATION:           'Circular',
  WORK_COMMENCEMENT:     'Work Commencement',
  SALARY_CERTIFICATE:    'Salary Certificate',
  LEAVE_NOTICE:          'Leave Notice',
  RETURN_FROM_LEAVE:     'Return from Leave',
  PROBATION_EVALUATION:  'Probation Eval.',
  PERFORMANCE_APPRAISAL: 'Performance Appraisal',
  CLEARANCE_FORM:        'Clearance Form',
  SALARY_NON_DISCLOSURE: 'Non-Disclosure',
  OTHER:                 'Other',
};

const TYPE_CLS: Record<string, string> = {
  QUESTIONING:           'bg-amber-100 text-amber-800 border-amber-200',
  ATTENTION:             'bg-yellow-100 text-yellow-800 border-yellow-200',
  FIRST_WARNING:         'bg-orange-100 text-orange-800 border-orange-200',
  FINAL_WARNING:         'bg-rose-100 text-rose-800 border-rose-200',
  DISMISSAL:             'bg-red-100 text-red-800 border-red-200',
  NON_RENEWAL_NOTICE:    'bg-red-100 text-red-800 border-red-200',
  CIRCULATION:           'bg-sky-100 text-sky-800 border-sky-200',
  WORK_COMMENCEMENT:     'bg-emerald-100 text-emerald-800 border-emerald-200',
  SALARY_CERTIFICATE:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  LEAVE_NOTICE:          'bg-violet-100 text-violet-800 border-violet-200',
  RETURN_FROM_LEAVE:     'bg-violet-100 text-violet-800 border-violet-200',
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  DRAFT:       { label: 'Draft',            cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  PENDING_CEO: { label: 'Pending CEO',      cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED:    { label: 'Approved',         cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED:    { label: 'Rejected',         cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

type Letter = {
  id: string;
  letterNumber: string;
  letterType: string;
  classification: 'INTERNAL' | 'EXTERNAL';
  language: string;
  status: string;
  subject: string;
  content: string | null;
  attachmentUrl: string | null;
  issuedAt: string;
  notes: string | null;
  rejectionReason: string | null;
  createdBy: { name: string } | null;
  approvedBy: { name: string } | null;
  rejectedBy: { name: string } | null;
  approvedAt: string | null;
  rejectedAt: string | null;
};

export function EmployeeLettersTab({ employeeId }: { employeeId: string }) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/hr/letters?employeeId=${employeeId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setLetters)
      .catch(() => setLetters([]))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
      </div>
    );
  }

  if (letters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Mail className="h-12 w-12 mb-3 opacity-30" />
        <p className="font-medium">No letters issued</p>
        <p className="text-sm mt-1">HR letters for this employee will appear here.</p>
      </div>
    );
  }

  const approved = letters.filter((l) => l.status === 'APPROVED').length;
  const pending  = letters.filter((l) => l.status === 'PENDING_CEO').length;
  const rejected = letters.filter((l) => l.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: letters.length, color: 'blue' },
          { label: 'Approved', value: approved,        color: 'emerald' },
          { label: 'Pending',  value: pending,         color: 'amber' },
          { label: 'Rejected', value: rejected,        color: 'rose' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border bg-gradient-to-b from-${color}-50 to-white border-${color}-200 p-4 shadow-sm`}>
            <p className={`text-xs text-${color}-600 font-medium uppercase tracking-wide`}>{label}</p>
            <p className={`text-2xl font-bold text-${color}-700 mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Letters list */}
      <div className="rounded-2xl border bg-white shadow-sm divide-y divide-slate-100">
        {letters.map((l) => {
          const typeCls = TYPE_CLS[l.letterType] ?? 'bg-slate-100 text-slate-700 border-slate-200';
          const statusCfg = STATUS_CFG[l.status] ?? STATUS_CFG.DRAFT;
          const isOpen = expanded === l.id;

          return (
            <div key={l.id} className="p-4">
              {/* Row header */}
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : l.id)}
              >
                {/* Type dot */}
                <div className="mt-1 shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusCfg.cls.split(' ')[0]}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {l.letterNumber}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeCls}`}>
                      {LETTER_TYPE_LABEL[l.letterType] ?? l.letterType}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${l.classification === 'INTERNAL' ? 'bg-slate-100 text-slate-600' : 'bg-sky-100 text-sky-700'}`}>
                      {l.classification === 'INTERNAL' ? <Building2 className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                      {l.classification === 'INTERNAL' ? 'Internal' : 'External'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">{l.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmt(l.issuedAt)} · Issued by {l.createdBy?.name ?? '—'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                    onClick={() => window.open(`/hr/letters/${l.id}/print`, '_blank')}
                    title="Print letter"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  {l.attachmentUrl && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                      onClick={() => window.open(l.attachmentUrl!, '_blank')}
                      title="Open PDF"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="mt-3 ml-6 space-y-3">
                  {l.content && (
                    <div className="rounded-lg bg-slate-50 border p-3 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {l.content}
                    </div>
                  )}
                  {l.status === 'APPROVED' && l.approvedBy && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <span className="font-semibold">Approved by</span> {l.approvedBy.name}
                      {l.approvedAt && <span className="text-emerald-500">· {fmt(l.approvedAt)}</span>}
                    </div>
                  )}
                  {l.status === 'REJECTED' && l.rejectedBy && (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 space-y-1">
                      <div><span className="font-semibold">Rejected by</span> {l.rejectedBy.name}{l.rejectedAt && ` · ${fmt(l.rejectedAt)}`}</div>
                      {l.rejectionReason && <div className="text-rose-600">{l.rejectionReason}</div>}
                    </div>
                  )}
                  {l.notes && (
                    <p className="text-xs text-slate-500 italic">Note: {l.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
