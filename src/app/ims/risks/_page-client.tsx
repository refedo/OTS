'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Search, RefreshCw, TrendingUp, Shield } from 'lucide-react';

type Risk = {
  id: string; riskNumber: string; title: string; type: string; category: string;
  status: string; currentLikelihood: number; currentSeverity: number; currentRiskLevel: number;
  currentRiskRating: string; ownerId: string | null; nextReviewDate: string | null;
  applicableStandards: string[] | null;
  owner: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
};

const CATEGORIES = ['STRATEGIC','OPERATIONAL','FINANCIAL','COMPLIANCE','ENVIRONMENTAL','HEALTH_SAFETY','TECHNICAL','SUPPLY_CHAIN'];

function ratingBadge(r: string) {
  const map: Record<string, string> = {
    LOW: 'bg-green-100 text-green-700 border-green-200',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-700 border-red-200 animate-pulse',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${map[r] ?? 'bg-gray-100 text-gray-700'}`}>{r}</span>;
}

function typeBadge(t: string) {
  return t === 'RISK'
    ? <span className="text-xs border border-red-400 text-red-600 px-2 py-0.5 rounded-full font-medium">Risk</span>
    : <span className="text-xs border border-green-400 text-green-600 px-2 py-0.5 rounded-full font-medium">Opportunity</span>;
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700', UNDER_TREATMENT: 'bg-amber-100 text-amber-700',
    TREATED: 'bg-green-100 text-green-700', ACCEPTED: 'bg-slate-100 text-slate-600',
    CLOSED: 'bg-gray-100 text-gray-500', MONITORING: 'bg-purple-100 text-purple-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>{s.replace('_',' ')}</span>;
}

export function ImsRisksClient() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [filtered, setFiltered] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState('all');
  const [ratingF, setRatingF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [dialog, setDialog] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'RISK', category: 'OPERATIONAL', description: '', source: '',
    applicableStandards: [] as string[], ownerId: '', reviewFrequencyDays: '90',
    likelihood: '1', severity: '1',
  });

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/ims/risks');
    if (res.ok) setRisks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRisks(); }, [fetchRisks]);

  useEffect(() => {
    let r = [...risks];
    if (search) r = r.filter(x => x.title.toLowerCase().includes(search.toLowerCase()) || x.riskNumber.includes(search));
    if (typeF !== 'all') r = r.filter(x => x.type === typeF);
    if (ratingF !== 'all') r = r.filter(x => x.currentRiskRating === ratingF);
    if (statusF !== 'all') r = r.filter(x => x.status === statusF);
    setFiltered(r);
  }, [risks, search, typeF, ratingF, statusF]);

  const openDialog = async () => {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setDialog(true);
  };

  const toggleStandard = (s: string) => {
    setForm(f => ({
      ...f,
      applicableStandards: f.applicableStandards.includes(s)
        ? f.applicableStandards.filter(x => x !== s)
        : [...f.applicableStandards, s],
    }));
  };

  const previewRating = (l: number, s: number) => {
    const lvl = l * s;
    if (lvl <= 4) return 'LOW';
    if (lvl <= 9) return 'MEDIUM';
    if (lvl <= 15) return 'HIGH';
    return 'CRITICAL';
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/ims/risks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title, type: form.type, category: form.category,
        description: form.description, source: form.source,
        applicableStandards: form.applicableStandards.length ? form.applicableStandards : null,
        ownerId: form.ownerId || null,
        reviewFrequencyDays: parseInt(form.reviewFrequencyDays),
      }),
    });
    if (res.ok) {
      const risk = await res.json();
      await fetch(`/api/ims/risks/${risk.id}/assessments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          likelihood: parseInt(form.likelihood), severity: parseInt(form.severity),
          assessmentType: 'INITIAL',
        }),
      });
    }
    setDialog(false);
    setForm({ title: '', type: 'RISK', category: 'OPERATIONAL', description: '', source: '', applicableStandards: [], ownerId: '', reviewFrequencyDays: '90', likelihood: '1', severity: '1' });
    fetchRisks();
    setSaving(false);
  };

  const summary = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  risks.filter(r => r.type === 'RISK').forEach(r => { (summary as Record<string,number>)[r.currentRiskRating]++; });

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-red-950 to-orange-900 p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-800/30 via-transparent to-transparent" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <AlertTriangle className="size-7 text-red-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Risk & Opportunity Register</h1>
              <p className="text-red-200 text-sm mt-0.5">ISO 9001/14001/45001 — Clause 6.1</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(summary).map(([k, v]) => (
                <span key={k} className={`text-xs font-bold px-2.5 py-1 rounded-full ${k==='CRITICAL'?'bg-red-500':k==='HIGH'?'bg-orange-500':k==='MEDIUM'?'bg-yellow-500':'bg-green-500'} text-white`}>
                  {v} {k}
                </span>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={fetchRisks}><RefreshCw className="size-4" /></Button>
            <Button size="sm" onClick={openDialog} className="bg-white text-red-900 hover:bg-red-50"><Plus className="size-4 mr-1" />New Risk</Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search risks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeF} onValueChange={setTypeF}><SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="RISK">Risks</SelectItem><SelectItem value="OPPORTUNITY">Opportunities</SelectItem></SelectContent>
        </Select>
        <Select value={ratingF} onValueChange={setRatingF}><SelectTrigger className="w-36"><SelectValue placeholder="Rating" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Ratings</SelectItem>{['LOW','MEDIUM','HIGH','CRITICAL'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusF} onValueChange={setStatusF}><SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{['OPEN','UNDER_TREATMENT','TREATED','ACCEPTED','MONITORING','CLOSED'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}</SelectContent>
        </Select>
        {(search || typeF!=='all' || ratingF!=='all' || statusF!=='all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeF('all'); setRatingF('all'); setStatusF('all'); }}>Clear</Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} items</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="mx-auto size-12 mb-3 opacity-30" />
          <p className="font-medium">No risks found</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['Risk Number','Type','Title','Rating','L×S','Owner','Next Review','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(r => {
                const overdue = r.nextReviewDate && new Date(r.nextReviewDate) < new Date();
                return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/ims/risks/${r.id}`} className="font-mono font-bold text-primary hover:underline">{r.riskNumber}</Link>
                    </td>
                    <td className="px-4 py-3">{typeBadge(r.type)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/ims/risks/${r.id}`} className="font-medium hover:underline">{r.title}</Link>
                      <p className="text-xs text-muted-foreground">{r.category.replace('_',' ')}</p>
                    </td>
                    <td className="px-4 py-3">{ratingBadge(r.currentRiskRating)}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{r.currentLikelihood}×{r.currentSeverity}={r.currentRiskLevel}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.owner?.name ?? '—'}</td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                      {r.nextReviewDate ? new Date(r.nextReviewDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Risk Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Risk / Opportunity</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Risk title" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v=>setForm(f=>({...f,type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="RISK">Risk</SelectItem><SelectItem value="OPPORTUNITY">Opportunity</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c.replace('_',' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Owner</Label>
                <Select value={form.ownerId} onValueChange={v=>setForm(f=>({...f,ownerId:v}))}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>{users.map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
            </div>
            <div>
              <Label>Source</Label>
              <Input value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))} placeholder="e.g. Internal audit, customer feedback…" />
            </div>
            <div>
              <Label>Applicable Standards</Label>
              <div className="flex gap-3 mt-1">
                {['ISO_9001','ISO_14001','ISO_45001'].map(s => (
                  <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.applicableStandards.includes(s)} onChange={()=>toggleStandard(s)} />
                    {s.replace('ISO_','ISO ')}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Likelihood (1-5)</Label>
                <Select value={form.likelihood} onValueChange={v=>setForm(f=>({...f,likelihood:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n=><SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity (1-5)</Label>
                <Select value={form.severity} onValueChange={v=>setForm(f=>({...f,severity:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n=><SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col justify-end">
                <Label>Initial Rating</Label>
                <div className="mt-1">{ratingBadge(previewRating(parseInt(form.likelihood), parseInt(form.severity)))}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{form.likelihood}×{form.severity}={parseInt(form.likelihood)*parseInt(form.severity)}</p>
              </div>
            </div>
            <div>
              <Label>Review Frequency (days)</Label>
              <Input type="number" value={form.reviewFrequencyDays} onChange={e=>setForm(f=>({...f,reviewFrequencyDays:e.target.value}))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving||!form.title}>{saving?'Saving…':'Create Risk'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
