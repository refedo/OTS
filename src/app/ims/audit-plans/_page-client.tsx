'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import {
  SearchCheck, Plus, RefreshCw, ChevronRight, CheckCircle2, Clock, XCircle, AlertTriangle,
} from 'lucide-react';

type Plan = {
  id: string;
  planNumber: string;
  year: number;
  auditType: string;
  status: string;
  createdAt: string;
  _count: { audits: number };
};

const PLAN_STATUS_CFG: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

function planStatusBadge(s: string) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${PLAN_STATUS_CFG[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {s.replace('_', ' ')}
    </span>
  );
}

export function AuditPlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
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

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <SearchCheck className="w-8 h-8 text-indigo-300" />
          <div>
            <h1 className="text-2xl font-bold">Internal Audit Tracker</h1>
            <p className="text-indigo-200 text-sm">ISO 9001 / 14001 / 45001 §9.2 — Audit programme management</p>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Plans', value: kpi.total, color: 'text-slate-700', bg: 'bg-white border' },
          { label: 'Planned', value: kpi.planned, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'In Progress', value: kpi.inProgress, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Completed', value: kpi.completed, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-lg border p-4 ${k.bg}`}>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={fetchPlans}><RefreshCw className="w-4 h-4" /></Button>
        <Button size="sm" onClick={() => setDialog(true)} className="bg-indigo-700 hover:bg-indigo-800">
          <Plus className="w-4 h-4 mr-1" /> New Audit Plan
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Plan #</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Audit Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Audits</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No audit plans yet.</td></tr>
                ) : plans.map(p => (
                  <tr key={p.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{p.planNumber}</td>
                    <td className="px-4 py-3">{p.year}</td>
                    <td className="px-4 py-3 text-slate-600">{p.auditType}</td>
                    <td className="px-4 py-3">{planStatusBadge(p.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{p._count.audits}</span>
                      <span className="text-slate-400 text-xs ml-1">audits</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/ims/audit-plans/${p.id}`}>
                        <Button size="sm" variant="ghost" className="flex items-center gap-1">
                          View <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
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
        <DialogContent>
          <DialogHeader><DialogTitle>New Audit Plan</DialogTitle></DialogHeader>
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
            <Button onClick={createPlan} disabled={saving} className="bg-indigo-700 hover:bg-indigo-800">
              {saving ? 'Creating...' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
