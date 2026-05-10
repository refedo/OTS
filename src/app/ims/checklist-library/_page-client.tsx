'use client';

import { useState, useEffect, useCallback } from 'react';
import { IsoClauseNote } from '@/components/ims/IsoClauseNote';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Plus, RefreshCw, Loader2, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

type ChecklistQuestion = {
  id: string;
  questionText: string;
  processArea: string;
  isoClause: string;
  evidenceType: string;
  riskLevel: string;
  isActive: boolean;
  createdAt: string;
};

const PROCESS_AREAS = ['Engineering', 'Supply Chain', 'Projects', 'Sales', 'Production', 'HSE', 'HR', 'Finance', 'Management'] as const;
const EVIDENCE_TYPES = ['Record', 'Document', 'Observation', 'Interview'] as const;
const RISK_LEVELS = ['High', 'Medium', 'Low'] as const;

const PROCESS_AREA_COLORS: Record<string, string> = {
  Engineering:    'bg-indigo-100 text-indigo-700',
  'Supply Chain': 'bg-green-100 text-green-700',
  Projects:       'bg-cyan-100 text-cyan-700',
  Sales:          'bg-violet-100 text-violet-700',
  Production:     'bg-orange-100 text-orange-700',
  HSE:            'bg-red-100 text-red-700',
  HR:             'bg-amber-100 text-amber-700',
  Finance:        'bg-emerald-100 text-emerald-700',
  Management:     'bg-blue-100 text-blue-700',
};

const RISK_COLORS: Record<string, string> = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-green-100 text-green-700',
};

const BLANK_FORM = {
  questionText: '',
  processArea: 'Engineering' as string,
  isoClause: '',
  evidenceType: 'Record' as string,
  riskLevel: 'Medium' as string,
};

export function ChecklistLibraryClient() {
  const [questions, setQuestions] = useState<ChecklistQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [showActive, setShowActive] = useState(true);

  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selected, setSelected] = useState<ChecklistQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/ims/checklist-library');
    if (res.ok) setQuestions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const filtered = questions.filter(q => {
    if (q.isActive !== showActive) return false;
    if (areaFilter !== 'All' && q.processArea !== areaFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (
        !q.questionText.toLowerCase().includes(s) &&
        !q.isoClause.toLowerCase().includes(s) &&
        !q.processArea.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const kpi = {
    total: questions.length,
    active: questions.filter(q => q.isActive).length,
    highRisk: questions.filter(q => q.riskLevel === 'High').length,
    areas: new Set(questions.map(q => q.processArea)).size,
  };

  const openCreate = () => {
    setForm(BLANK_FORM);
    setCreateDialog(true);
  };

  const createQuestion = async () => {
    if (!form.questionText.trim() || !form.isoClause.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ims/checklist-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setCreateDialog(false); fetchQuestions(); }
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (q: ChecklistQuestion) => {
    setSelected(q);
    setEditForm({
      questionText: q.questionText,
      processArea: q.processArea,
      isoClause: q.isoClause,
      evidenceType: q.evidenceType,
      riskLevel: q.riskLevel,
    });
    setEditDialog(true);
  };

  const updateQuestion = async () => {
    if (!selected || !editForm.questionText.trim() || !editForm.isoClause.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ims/checklist-library/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { setEditDialog(false); fetchQuestions(); }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (q: ChecklistQuestion) => {
    setToggling(q.id);
    try {
      await fetch(`/api/ims/checklist-library/${q.id}`, { method: 'DELETE' });
      fetchQuestions();
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Checklist Library</h1>
            <p className="text-slate-300 text-sm mt-0.5">ISO 9001:2015 §9.2 — Master question bank for audit execution</p>
            <p className="text-slate-400/70 text-xs font-mono mt-1">HEXA-FRM-026 · Procedure: Hexa-ISP-004</p>
          </div>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-checklist-library"
        clauses={[{ standard: 'ISO 9001:2015', clause: '§9.2', title: 'Internal audit' }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Questions', value: kpi.total,    color: 'text-[#2c3e50]', bg: 'bg-white border border-slate-200',      icon: '📋' },
          { label: 'Active',          value: kpi.active,   color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-200', icon: '✅' },
          { label: 'High Risk',       value: kpi.highRisk, color: 'text-red-600',     bg: 'bg-red-50 border border-red-200',         icon: '🔴' },
          { label: 'Process Areas',   value: kpi.areas,    color: 'text-indigo-600',  bg: 'bg-indigo-50 border border-indigo-200',   icon: '🏭' },
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

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {['All', ...PROCESS_AREAS].map(area => (
            <button
              key={area}
              onClick={() => setAreaFilter(area)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                areaFilter === area
                  ? 'bg-[#2c3e50] text-white border-[#2c3e50]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowActive(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              showActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            {showActive
              ? <ToggleRight className="w-3.5 h-3.5" />
              : <ToggleLeft className="w-3.5 h-3.5" />}
            {showActive ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search questions, clause, area…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchQuestions} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}>
            <Plus className="w-4 h-4" /> Add Question
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#2c3e50]">Checklist Questions</p>
          <p className="text-xs text-slate-400">{filtered.length} records</p>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Question</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Process Area</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">ISO Clause</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Evidence Type</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Risk Level</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                        <span className="text-xs">Loading questions…</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <BookOpen className="w-8 h-8 text-slate-200" />
                        <span className="text-sm">No questions found</span>
                        <span className="text-xs">Adjust filters or add a new question</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(q => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => openEdit(q)}
                  >
                    <td className="px-4 py-3 max-w-[320px]">
                      <p className="text-slate-800 font-medium leading-snug">
                        {q.questionText.length > 80 ? q.questionText.slice(0, 80) + '…' : q.questionText}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${PROCESS_AREA_COLORS[q.processArea] ?? 'bg-gray-100 text-gray-600'}`}>
                        {q.processArea}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{q.isoClause}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{q.evidenceType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${RISK_COLORS[q.riskLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                        {q.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleActive(q); }}
                        disabled={toggling === q.id}
                        className="flex items-center gap-1.5 text-xs transition-colors"
                        title={q.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {toggling === q.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : q.isActive ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-700 font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-[#2c3e50] hover:bg-slate-100"
                          onClick={e => { e.stopPropagation(); openEdit(q); }}
                          title="Edit question"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2c3e50]" />
              Add Checklist Question
            </DialogTitle>
            <p className="text-xs text-slate-400 font-mono mt-0.5">HEXA-FRM-026 · Hexa-ISP-004</p>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <Label>Question Text *</Label>
              <Textarea
                rows={3}
                value={form.questionText}
                onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
                placeholder="e.g. Does the organisation maintain documented information as evidence of the audit programme…?"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Process Area *</Label>
                <Select value={form.processArea} onValueChange={v => setForm(f => ({ ...f, processArea: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROCESS_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ISO Clause *</Label>
                <Input
                  value={form.isoClause}
                  onChange={e => setForm(f => ({ ...f, isoClause: e.target.value }))}
                  placeholder="e.g. §9.2.1"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Evidence Type</Label>
                <Select value={form.evidenceType} onValueChange={v => setForm(f => ({ ...f, evidenceType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk Level</Label>
                <Select value={form.riskLevel} onValueChange={v => setForm(f => ({ ...f, riskLevel: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={createQuestion}
              disabled={saving || !form.questionText.trim() || !form.isoClause.trim()}
              className="gap-1.5 text-white"
              style={{ backgroundColor: '#2c3e50' }}
            >
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : <><Plus className="w-3.5 h-3.5" /> Add Question</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#2c3e50]" />
              Edit Checklist Question
            </DialogTitle>
            <p className="text-xs text-slate-400 font-mono mt-0.5">HEXA-FRM-026 · Hexa-ISP-004</p>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <Label>Question Text *</Label>
              <Textarea
                rows={3}
                value={editForm.questionText}
                onChange={e => setEditForm(f => ({ ...f, questionText: e.target.value }))}
                placeholder="e.g. Does the organisation maintain documented information…?"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Process Area *</Label>
                <Select value={editForm.processArea} onValueChange={v => setEditForm(f => ({ ...f, processArea: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROCESS_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ISO Clause *</Label>
                <Input
                  value={editForm.isoClause}
                  onChange={e => setEditForm(f => ({ ...f, isoClause: e.target.value }))}
                  placeholder="e.g. §9.2.1"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Evidence Type</Label>
                <Select value={editForm.evidenceType} onValueChange={v => setEditForm(f => ({ ...f, evidenceType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk Level</Label>
                <Select value={editForm.riskLevel} onValueChange={v => setEditForm(f => ({ ...f, riskLevel: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button
              onClick={updateQuestion}
              disabled={saving || !editForm.questionText.trim() || !editForm.isoClause.trim()}
              className="gap-1.5 text-white"
              style={{ backgroundColor: '#2c3e50' }}
            >
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : <><Edit2 className="w-3.5 h-3.5" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
