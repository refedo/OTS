'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

type Treatment = {
  id: string; treatmentType: string; description: string | null;
  status: string; effectiveness: string | null;
  targetDate: string | null; completedDate: string | null;
  responsible: { id: string; name: string } | null;
};

type RiskWithTreatments = {
  id: string; riskNumber: string; title: string; currentRiskRating: string; type: string;
  treatments: Treatment[];
};

type FlatTreatment = Treatment & { riskId: string; riskNumber: string; riskTitle: string; riskRating: string };

function statusBadge(s: string) {
  const map: Record<string, string> = { PLANNED: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-slate-100 text-slate-500' };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>{s.replace('_',' ')}</span>;
}

function ratingBadge(r: string) {
  const map: Record<string, string> = { LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };
  return <span className={`text-xs px-2 py-0.5 rounded font-bold ${map[r] ?? 'bg-gray-100 text-gray-600'}`}>{r}</span>;
}

export default function ImsRiskTreatmentsClient() {
  const [allTreatments, setAllTreatments] = useState<FlatTreatment[]>([]);
  const [filtered, setFiltered] = useState<FlatTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/ims/risks');
    if (!res.ok) { setLoading(false); return; }
    const risks: RiskWithTreatments[] = await res.json();

    // For risks that have treatments, fetch them
    const risksWithCount = risks.filter((r: RiskWithTreatments & { _count?: { treatments: number } }) =>
      (r as RiskWithTreatments & { _count?: { treatments: number } })._count?.treatments ?? 0 > 0
    );

    const treatmentFetches = await Promise.all(
      risksWithCount.map(async r => {
        const tr = await fetch(`/api/ims/risks/${r.id}/treatments`);
        if (!tr.ok) return [];
        const treatments: Treatment[] = await tr.json();
        return treatments.map(t => ({
          ...t,
          riskId: r.id,
          riskNumber: r.riskNumber,
          riskTitle: r.title,
          riskRating: r.currentRiskRating,
        }));
      })
    );

    const flat = treatmentFetches.flat();
    setAllTreatments(flat);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const now = new Date();
    let f = [...allTreatments];
    if (statusF !== 'all') f = f.filter(t => t.status === statusF);
    if (overdueOnly) f = f.filter(t => t.targetDate && new Date(t.targetDate) < now && !['COMPLETED','CANCELLED'].includes(t.status));
    setFiltered(f);
  }, [allTreatments, statusF, overdueOnly]);

  const now = new Date();
  const overdueCount = allTreatments.filter(t => t.targetDate && new Date(t.targetDate) < now && !['COMPLETED','CANCELLED'].includes(t.status)).length;
  const completedCount = allTreatments.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="p-6 space-y-6">
      <Link href="/ims" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        IMS Dashboard
      </Link>
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-teal-900 p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-700/30 via-transparent to-transparent" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/10"><CheckCircle className="size-7 text-emerald-200" /></div>
            <div>
              <h1 className="text-2xl font-bold">Risk Treatments Tracker</h1>
              <p className="text-emerald-200 text-sm mt-0.5">All treatment actions across the risk register</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchData}><RefreshCw className="size-4" /></Button>
        </div>
        <div className="relative flex gap-4 mt-4">
          <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-black">{allTreatments.length}</p>
            <p className="text-xs text-emerald-200">Total</p>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-black text-green-300">{completedCount}</p>
            <p className="text-xs text-emerald-200">Completed</p>
          </div>
          <div className={`rounded-lg px-4 py-2 text-center ${overdueCount > 0 ? 'bg-red-500/30' : 'bg-white/10'}`}>
            <p className="text-2xl font-black text-red-300">{overdueCount}</p>
            <p className="text-xs text-emerald-200">Overdue</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['PLANNED','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={overdueOnly ? 'destructive' : 'outline'} size="sm" onClick={() => setOverdueOnly(o => !o)}>
          <Clock className="size-4 mr-1.5" />{overdueOnly ? 'Showing Overdue' : 'Overdue Only'}
        </Button>
        {(statusF !== 'all' || overdueOnly) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusF('all'); setOverdueOnly(false); }}>Clear</Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} treatments</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="mx-auto size-12 mb-3 opacity-30" />
          <p className="font-medium">{overdueOnly ? 'No overdue treatments' : 'No treatments found'}</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['Risk','Rating','Type','Description','Responsible','Target Date','Status','Effectiveness'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(t => {
                const overdue = t.targetDate && new Date(t.targetDate) < now && !['COMPLETED','CANCELLED'].includes(t.status);
                return (
                  <tr key={t.id} className={`hover:bg-muted/30 transition-colors ${overdue ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <Link href={`/ims/risks/${t.riskId}`} className="font-mono text-xs font-bold text-primary hover:underline">{t.riskNumber}</Link>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{t.riskTitle}</p>
                    </td>
                    <td className="px-4 py-3">{ratingBadge(t.riskRating)}</td>
                    <td className="px-4 py-3"><span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{t.treatmentType}</span></td>
                    <td className="px-4 py-3"><p className="text-xs text-muted-foreground truncate max-w-[180px]">{t.description ?? '—'}</p></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.responsible?.name ?? '—'}</td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                      {t.targetDate ? new Date(t.targetDate).toLocaleDateString() : '—'}
                      {overdue && <span className="block text-red-500">OVERDUE</span>}
                    </td>
                    <td className="px-4 py-3">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3">
                      {t.effectiveness ? (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.effectiveness==='EFFECTIVE'?'bg-green-100 text-green-700':t.effectiveness==='PARTIALLY_EFFECTIVE'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>
                          {t.effectiveness.replace('_',' ')}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
