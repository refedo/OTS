'use client';

import { useState, useEffect, useCallback } from 'react';
import { IsoClauseNote } from '@/components/ims/IsoClauseNote';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import {
  SearchCheck, Plus, RefreshCw, ChevronRight, CheckCircle2, Clock, FileDown, Loader2,
} from 'lucide-react';
import { generateAuditSchedulePDF, type AuditSchedulePDFData } from '@/lib/ims-audit-schedule-pdf-generator';

type Plan = {
  id: string;
  planNumber: string;
  year: number;
  auditType: string;
  status: string;
  createdAt: string;
  _count: { audits: number };
};

const STATUS_CFG: Record<string, { cls: string; dot: string }> = {
  PLANNED: { cls: 'bg-blue-100 text-blue-700 border border-blue-200', dot: 'bg-blue-400' },
  IN_PROGRESS: { cls: 'bg-amber-100 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  COMPLETED: { cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  CANCELLED: { cls: 'bg-slate-100 text-slate-500 border border-slate-200', dot: 'bg-slate-400' },
};

function PlanBadge({ s }: { s: string }) {
  const cfg = STATUS_CFG[s] ?? { cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {s.replace('_', ' ')}
    </span>
  );
}

const TYPE_COLORS: Record<string, string> = {
  Internal: 'bg-indigo-100 text-indigo-700',
  External: 'bg-purple-100 text-purple-700',
  Surveillance: 'bg-cyan-100 text-cyan-700',
};

export function AuditPlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    auditType: 'Internal' as 'Internal' | 'External' | 'Surveillance',
    status: 'PLANNED' as string,
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/ims/audit-plans');
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const kpi = {
    total: plans.length,
    planned: plans.filter(p => p.status === 'PLANNED').length,
    inProgress: plans.filter(p => p.status === 'IN_PROGRESS').length,
    completed: plans.filter(p => p.status === 'COMPLETED').length,
  };

  const createPlan = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ims/audit-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setDialog(false); fetchPlans(); }
    } finally {
      setSaving(false);
    }
  };

  const downloadSchedule = async (plan: Plan) => {
    setDownloading(plan.id);
    try {
      const res = await fetch(`/api/ims/audit-plans/${plan.id}`);
      if (!res.ok) return;
      const detail = await res.json();

      const pdfData: AuditSchedulePDFData = {
        planNumber: plan.planNumber,
        year: plan.year,
        auditType: plan.auditType,
        status: plan.status,
        audits: (detail.audits ?? []).map((a: {
          auditNumber: string; scope: string; processArea?: string | null;
          riskLevel?: string | null; isoClausesInScope?: string[] | null;
          scheduledDate: string; actualDate?: string | null; status: string;
          auditor?: { name: string } | null; auditee?: { name: string } | null;
          auditorIndependenceConfirmed?: boolean;
          approvedByImsManagerName?: string | null; approvedByImsManagerDate?: string | null;
          approvedByImsManagerSigned?: boolean;
          approvedByTopMgmtName?: string | null; approvedByTopMgmtDate?: string | null;
          approvedByTopMgmtSigned?: boolean;
          _count?: { findings: number };
        }) => ({
          auditNumber: a.auditNumber,
          scope: a.scope,
          processArea: a.processArea ?? null,
          riskLevel: a.riskLevel ?? null,
          isoClausesInScope: a.isoClausesInScope ?? null,
          scheduledDate: a.scheduledDate,
          actualDate: a.actualDate ?? null,
          auditor: a.auditor?.name ?? null,
          auditee: a.auditee?.name ?? null,
          status: a.status,
          auditorIndependenceConfirmed: a.auditorIndependenceConfirmed ?? false,
          approvedByImsManagerName: a.approvedByImsManagerName ?? null,
          approvedByImsManagerDate: a.approvedByImsManagerDate ?? null,
          approvedByImsManagerSigned: a.approvedByImsManagerSigned ?? false,
          approvedByTopMgmtName: a.approvedByTopMgmtName ?? null,
          approvedByTopMgmtDate: a.approvedByTopMgmtDate ?? null,
          approvedByTopMgmtSigned: a.approvedByTopMgmtSigned ?? false,
          findingsCount: a._count?.findings ?? 0,
        })),
      };

      await generateAuditSchedulePDF(pdfData);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <SearchCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Internal Audit Tracker</h1>
            <p className="text-slate-300 text-sm mt-0.5">ISO 9001 / 14001 / 45001 §9.2 — Audit programme management</p>
            <p className="text-slate-400/70 text-xs font-mono mt-1">HEXA-FRM-004 · HEXA-FRM-005 · HEXA-FRM-006 · Procedure: Hexa-ISP-004</p>
          </div>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-audit-plans"
        clauses={[
          { standard: 'ISO 9001:2015', clause: '§9.2', title: 'Internal audit' },
          { standard: 'ISO 14001:2015', clause: '§9.2', title: 'Internal audit' },
          { standard: 'ISO 45001:2018', clause: '§9.2', title: 'Internal audit' },
        ]}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Plans', value: kpi.total, color: 'text-[#2c3e50]', bg: 'bg-white border border-slate-200', icon: '📋' },
          { label: 'Planned', value: kpi.planned, color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-200', icon: '🕐' },
          { label: 'In Progress', value: kpi.inProgress, color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-200', icon: '⚡' },
          { label: 'Completed', value: kpi.completed, color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-200', icon: '✅' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg} hover:shadow-sm transition-shadow`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <span className="text-base">{k.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={fetchPlans} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <Button size="sm" onClick={() => setDialog(true)} className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}>
          <Plus className="w-4 h-4" /> New Audit Plan
        </Button>
      </div>

      {/* Table */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#2c3e50]">Audit Plans</p>
          <p className="text-xs text-slate-400">{plans.length} records</p>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Plan #</th>
                  <th className="px-4 py-3 text-left font-semibold">Year</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Audits</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                      <span className="text-xs">Loading audit plans…</span>
                    </div>
                  </td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <SearchCheck className="w-8 h-8 text-slate-200" />
                      <span className="text-sm">No audit plans yet</span>
                      <span className="text-xs">Create your first audit plan to get started</span>
                    </div>
                  </td></tr>
                ) : plans.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-[#2c3e50]">{p.planNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{p.year}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[p.auditType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.auditType}
                      </span>
                    </td>
                    <td className="px-4 py-3"><PlanBadge s={p.status} /></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className="font-semibold text-slate-700">{p._count.audits}</span>
                        <span className="text-slate-400 text-xs">audits</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          onClick={() => downloadSchedule(p)}
                          disabled={downloading === p.id}
                          title="Download HEXA-FRM-004 Audit Schedule PDF"
                        >
                          {downloading === p.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileDown className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">FRM-004</span>
                        </Button>
                        <Link href={`/ims/audit-plans/${p.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500 hover:text-[#2c3e50] hover:bg-slate-100 gap-1">
                            View <ChevronRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SearchCheck className="w-5 h-5 text-[#2c3e50]" />
              New Audit Plan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Year *</Label>
              <Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} min={2020} max={2100} className="mt-1" />
            </div>
            <div>
              <Label>Audit Type *</Label>
              <Select value={form.auditType} onValueChange={v => setForm(f => ({ ...f, auditType: v as typeof form.auditType }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="External">External</SelectItem>
                  <SelectItem value="Surveillance">Surveillance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={createPlan} disabled={saving} className="text-white gap-1.5" style={{ backgroundColor: '#2c3e50' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><Plus className="w-3.5 h-3.5" /> Create Plan</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
