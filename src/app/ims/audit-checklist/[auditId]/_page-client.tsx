'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import {
  ArrowLeft, ClipboardList, Plus, Trash2, Loader2, Save,
  CheckCircle2, XCircle, Lightbulb, Eye, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';

type Audit = {
  id: string;
  auditNumber: string;
  scope: string;
  processArea: string | null;
  scheduledDate: string;
  auditor: { id: string; name: string } | null;
  auditee: { id: string; name: string } | null;
  status: string;
};

type ChecklistQuestion = {
  id: string;
  questionText: string;
  isoClause: string;
  processArea: string;
};

type ChecklistRow = {
  id: string;
  questionId: string | null;
  questionText: string;
  isoClause: string;
  result: string | null;
  evidence: string | null;
  attachmentUrl: string | null;
  sortOrder: number;
};

type AttendeeEntry = { name: string; role: string };
type RecordEntry = { documentName: string; referenceNumber: string };
type PersonnelEntry = { name: string; role: string };

type Checklist = {
  id: string;
  auditId: string;
  scopeStatement: string | null;
  referenceDocs: string[] | null;
  notificationDate: string | null;
  notificationMethod: string | null;
  openingMeetingDate: string | null;
  openingAttendees: AttendeeEntry[] | null;
  openingAgendaItems: string | null;
  scopeChangesAgreed: string | null;
  auditeeRepOpeningName: string | null;
  auditeeRepOpeningDate: string | null;
  recordsReviewed: RecordEntry[] | null;
  personnelInterviewed: PersonnelEntry[] | null;
  closingMeetingDate: string | null;
  closingAttendees: AttendeeEntry[] | null;
  preliminaryFindings: string | null;
  auditeeAcceptsFindings: boolean | null;
  disagreementNature: string | null;
  auditeeRepClosingName: string | null;
  auditeeRepClosingDate: string | null;
  status: string;
  rows: ChecklistRow[];
};

const RESULT_CFG: Record<string, { cls: string; label: string }> = {
  Conforming: { cls: 'bg-emerald-100 text-emerald-700', label: 'Conforming' },
  'Non-Conforming': { cls: 'bg-red-100 text-red-700', label: 'Non-Conforming' },
  OFI: { cls: 'bg-blue-100 text-blue-700', label: 'OFI' },
  Observation: { cls: 'bg-slate-100 text-slate-600', label: 'Observation' },
  'N/A': { cls: 'bg-gray-100 text-gray-500', label: 'N/A' },
};

const RESULTS = ['Conforming', 'Non-Conforming', 'OFI', 'Observation', 'N/A'];

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toDateTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

export function AuditChecklistClient({ auditId }: { auditId: string }) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [libraryQuestions, setLibraryQuestions] = useState<ChecklistQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const [addQuestionDialog, setAddQuestionDialog] = useState(false);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [addingRows, setAddingRows] = useState(false);

  const [sectionA, setSectionA] = useState({
    scopeStatement: '',
    referenceDocs: [] as string[],
    newRefDoc: '',
    notificationDate: '',
    notificationMethod: '',
  });

  const [sectionB, setSectionB] = useState({
    openingMeetingDate: '',
    openingAttendees: [] as AttendeeEntry[],
    newAttendeeName: '',
    newAttendeeRole: '',
    openingAgendaItems: '',
    scopeChangesAgreed: '',
    auditeeRepOpeningName: '',
    auditeeRepOpeningDate: '',
  });

  const [sectionC, setSectionC] = useState({
    recordsReviewed: [] as RecordEntry[],
    newRecordDoc: '',
    newRecordRef: '',
    personnelInterviewed: [] as PersonnelEntry[],
    newPersonName: '',
    newPersonRole: '',
  });

  const [sectionD, setSectionD] = useState({
    closingMeetingDate: '',
    closingAttendees: [] as AttendeeEntry[],
    newAttendeeName: '',
    newAttendeeRole: '',
    preliminaryFindings: '',
    auditeeAcceptsFindings: '' as '' | 'true' | 'false',
    disagreementNature: '',
    auditeeRepClosingName: '',
    auditeeRepClosingDate: '',
  });

  const [rowUpdates, setRowUpdates] = useState<Record<string, { result: string; evidence: string }>>({});
  const [savingRow, setSavingRow] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [auditRes, checklistRes] = await Promise.all([
      fetch(`/api/ims/audits/${auditId}`),
      fetch(`/api/ims/audit-checklists/${auditId}`),
    ]);
    if (auditRes.ok) {
      const a: Audit = await auditRes.json();
      setAudit(a);
      if (a.processArea) {
        const libRes = await fetch(`/api/ims/checklist-library?processArea=${encodeURIComponent(a.processArea)}&activeOnly=true`);
        if (libRes.ok) setLibraryQuestions(await libRes.json());
      } else {
        const libRes = await fetch('/api/ims/checklist-library?activeOnly=true');
        if (libRes.ok) setLibraryQuestions(await libRes.json());
      }
    }
    if (checklistRes.ok) {
      const cl: Checklist = await checklistRes.json();
      setChecklist(cl);
      populateForms(cl);
    }
    setLoading(false);
  }, [auditId]);

  function populateForms(cl: Checklist) {
    setSectionA({
      scopeStatement: cl.scopeStatement ?? '',
      referenceDocs: cl.referenceDocs ?? [],
      newRefDoc: '',
      notificationDate: toDateInputValue(cl.notificationDate),
      notificationMethod: cl.notificationMethod ?? '',
    });
    setSectionB({
      openingMeetingDate: toDateTimeInputValue(cl.openingMeetingDate),
      openingAttendees: cl.openingAttendees ?? [],
      newAttendeeName: '',
      newAttendeeRole: '',
      openingAgendaItems: cl.openingAgendaItems ?? '',
      scopeChangesAgreed: cl.scopeChangesAgreed ?? '',
      auditeeRepOpeningName: cl.auditeeRepOpeningName ?? '',
      auditeeRepOpeningDate: toDateInputValue(cl.auditeeRepOpeningDate),
    });
    setSectionC({
      recordsReviewed: cl.recordsReviewed ?? [],
      newRecordDoc: '',
      newRecordRef: '',
      personnelInterviewed: cl.personnelInterviewed ?? [],
      newPersonName: '',
      newPersonRole: '',
    });
    setSectionD({
      closingMeetingDate: toDateTimeInputValue(cl.closingMeetingDate),
      closingAttendees: cl.closingAttendees ?? [],
      newAttendeeName: '',
      newAttendeeRole: '',
      preliminaryFindings: cl.preliminaryFindings ?? '',
      auditeeAcceptsFindings: cl.auditeeAcceptsFindings === null ? '' : cl.auditeeAcceptsFindings ? 'true' : 'false',
      disagreementNature: cl.disagreementNature ?? '',
      auditeeRepClosingName: cl.auditeeRepClosingName ?? '',
      auditeeRepClosingDate: toDateInputValue(cl.auditeeRepClosingDate),
    });
    const updates: Record<string, { result: string; evidence: string }> = {};
    for (const row of cl.rows) {
      updates[row.id] = { result: row.result ?? '', evidence: row.evidence ?? '' };
    }
    setRowUpdates(updates);
  }

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveSections() {
    setSaving(true);
    try {
      const body = {
        scopeStatement: sectionA.scopeStatement || null,
        referenceDocs: sectionA.referenceDocs,
        notificationDate: sectionA.notificationDate ? new Date(sectionA.notificationDate).toISOString() : null,
        notificationMethod: sectionA.notificationMethod || null,
        openingMeetingDate: sectionB.openingMeetingDate ? new Date(sectionB.openingMeetingDate).toISOString() : null,
        openingAttendees: sectionB.openingAttendees,
        openingAgendaItems: sectionB.openingAgendaItems || null,
        scopeChangesAgreed: sectionB.scopeChangesAgreed || null,
        auditeeRepOpeningName: sectionB.auditeeRepOpeningName || null,
        auditeeRepOpeningDate: sectionB.auditeeRepOpeningDate ? new Date(sectionB.auditeeRepOpeningDate).toISOString() : null,
        recordsReviewed: sectionC.recordsReviewed,
        personnelInterviewed: sectionC.personnelInterviewed,
        closingMeetingDate: sectionD.closingMeetingDate ? new Date(sectionD.closingMeetingDate).toISOString() : null,
        closingAttendees: sectionD.closingAttendees,
        preliminaryFindings: sectionD.preliminaryFindings || null,
        auditeeAcceptsFindings: sectionD.auditeeAcceptsFindings === '' ? null : sectionD.auditeeAcceptsFindings === 'true',
        disagreementNature: sectionD.disagreementNature || null,
        auditeeRepClosingName: sectionD.auditeeRepClosingName || null,
        auditeeRepClosingDate: sectionD.auditeeRepClosingDate ? new Date(sectionD.auditeeRepClosingDate).toISOString() : null,
      };
      const res = await fetch(`/api/ims/audit-checklists/${auditId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated: Checklist = await res.json();
        setChecklist(updated);
        populateForms(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveRow(rowId: string) {
    const update = rowUpdates[rowId];
    if (!update) return;
    setSavingRow(rowId);
    try {
      await fetch(`/api/ims/audit-checklists/${auditId}/rows/${rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: update.result || null, evidence: update.evidence || null }),
      });
    } finally {
      setSavingRow(null);
    }
  }

  async function addLibraryQuestions() {
    if (!selectedLibraryIds.length) return;
    setAddingRows(true);
    try {
      for (const qId of selectedLibraryIds) {
        const q = libraryQuestions.find(lq => lq.id === qId);
        if (!q) continue;
        await fetch(`/api/ims/audit-checklists/${auditId}/rows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: q.id,
            questionText: q.questionText,
            isoClause: q.isoClause,
          }),
        });
      }
      setAddQuestionDialog(false);
      setSelectedLibraryIds([]);
      await fetchData();
    } finally {
      setAddingRows(false);
    }
  }

  async function deleteRow(rowId: string) {
    await fetch(`/api/ims/audit-checklists/${auditId}/rows/${rowId}`, { method: 'DELETE' });
    await fetchData();
  }

  function toggleLibrarySelection(id: string) {
    setSelectedLibraryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const rows = checklist?.rows ?? [];
  const ncRows = rows.filter(r => r.result === 'Non-Conforming');
  const ofiRows = rows.filter(r => r.result === 'OFI' || r.result === 'Observation');

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!audit) {
    return <div className="p-6 text-slate-400">Audit not found.</div>;
  }

  const sectionTabs: { key: 'A' | 'B' | 'C' | 'D'; label: string }[] = [
    { key: 'A', label: 'A — Audit Brief' },
    { key: 'B', label: 'B — Opening Meeting' },
    { key: 'C', label: 'C — Execution' },
    { key: 'D', label: 'D — Closing Meeting' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/ims/audit-plans`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#2c3e50] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Audit Plans
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Checklist — {audit.auditNumber}</h1>
            <p className="text-slate-300 text-sm mt-0.5">{audit.scope}</p>
            <p className="text-slate-400/70 text-xs font-mono mt-1">HEXA-FRM-006 · ISO 9001:2015 §9.2 · Procedure: Hexa-ISP-004</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Questions', value: rows.length, color: 'text-[#2c3e50]' },
          { label: 'Conforming', value: rows.filter(r => r.result === 'Conforming').length, color: 'text-emerald-600' },
          { label: 'Non-Conforming', value: ncRows.length, color: 'text-red-600' },
          { label: 'OFI / Obs.', value: ofiRows.length, color: 'text-blue-600' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {sectionTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeSection === tab.key
                ? 'border-[#2c3e50] text-[#2c3e50]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'A' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Section A — Audit Brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Scope Statement</Label>
              <Textarea
                rows={3}
                className="mt-1"
                value={sectionA.scopeStatement}
                onChange={e => setSectionA(s => ({ ...s, scopeStatement: e.target.value }))}
                placeholder="Define the scope of this audit…"
              />
            </div>
            <div>
              <Label>Reference Documents Reviewed</Label>
              <div className="mt-1 space-y-2">
                {sectionA.referenceDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm bg-slate-50 border rounded px-3 py-1.5 text-slate-700">{doc}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => setSectionA(s => ({ ...s, referenceDocs: s.referenceDocs.filter((_, j) => j !== i) }))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add document reference…"
                    value={sectionA.newRefDoc}
                    onChange={e => setSectionA(s => ({ ...s, newRefDoc: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && sectionA.newRefDoc.trim()) {
                        setSectionA(s => ({ ...s, referenceDocs: [...s.referenceDocs, s.newRefDoc.trim()], newRefDoc: '' }));
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => {
                    if (sectionA.newRefDoc.trim())
                      setSectionA(s => ({ ...s, referenceDocs: [...s.referenceDocs, s.newRefDoc.trim()], newRefDoc: '' }));
                  }}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Auditee Notification Date</Label>
                <Input type="date" className="mt-1" value={sectionA.notificationDate}
                  onChange={e => setSectionA(s => ({ ...s, notificationDate: e.target.value }))} />
              </div>
              <div>
                <Label>Notification Method</Label>
                <Select value={sectionA.notificationMethod || '__none__'}
                  onValueChange={v => setSectionA(s => ({ ...s, notificationMethod: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select —</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="verbal">Verbal</SelectItem>
                    <SelectItem value="written">Written</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={saveSections} disabled={saving} className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Section A
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'B' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Section B — Opening Meeting Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Opening Meeting Date & Time</Label>
              <Input type="datetime-local" className="mt-1" value={sectionB.openingMeetingDate}
                onChange={e => setSectionB(s => ({ ...s, openingMeetingDate: e.target.value }))} />
            </div>
            <div>
              <Label>Attendees</Label>
              <div className="mt-1 space-y-2">
                {sectionB.openingAttendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 bg-slate-50 border rounded px-3 py-1.5">{a.name}</span>
                    <span className="w-32 bg-slate-50 border rounded px-3 py-1.5 text-slate-500">{a.role}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => setSectionB(s => ({ ...s, openingAttendees: s.openingAttendees.filter((_, j) => j !== i) }))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="Name" value={sectionB.newAttendeeName}
                    onChange={e => setSectionB(s => ({ ...s, newAttendeeName: e.target.value }))} />
                  <Input placeholder="Role" value={sectionB.newAttendeeRole}
                    onChange={e => setSectionB(s => ({ ...s, newAttendeeRole: e.target.value }))} />
                  <Button variant="outline" size="sm" onClick={() => {
                    if (sectionB.newAttendeeName.trim())
                      setSectionB(s => ({ ...s, openingAttendees: [...s.openingAttendees, { name: s.newAttendeeName.trim(), role: s.newAttendeeRole.trim() }], newAttendeeName: '', newAttendeeRole: '' }));
                  }}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label>Agenda Items Covered</Label>
              <Textarea rows={2} className="mt-1" value={sectionB.openingAgendaItems}
                onChange={e => setSectionB(s => ({ ...s, openingAgendaItems: e.target.value }))} />
            </div>
            <div>
              <Label>Scope Changes Agreed</Label>
              <Textarea rows={2} className="mt-1" value={sectionB.scopeChangesAgreed}
                onChange={e => setSectionB(s => ({ ...s, scopeChangesAgreed: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Auditee Representative Name</Label>
                <Input className="mt-1" value={sectionB.auditeeRepOpeningName}
                  onChange={e => setSectionB(s => ({ ...s, auditeeRepOpeningName: e.target.value }))} />
              </div>
              <div>
                <Label>Acknowledgment Date</Label>
                <Input type="date" className="mt-1" value={sectionB.auditeeRepOpeningDate}
                  onChange={e => setSectionB(s => ({ ...s, auditeeRepOpeningDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={saveSections} disabled={saving} className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Section B
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'C' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Section C — Checklist Execution</CardTitle>
              <Button size="sm" onClick={() => { setSelectedLibraryIds([]); setAddQuestionDialog(true); }}
                className="gap-1.5 text-white text-xs" style={{ backgroundColor: '#2c3e50' }}>
                <Plus className="w-3.5 h-3.5" /> Add Questions from Library
              </Button>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm">No questions added yet.</p>
                  <p className="text-xs mt-1">Click "Add Questions from Library" to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const upd = rowUpdates[row.id] ?? { result: row.result ?? '', evidence: row.evidence ?? '' };
                    const resultCfg = upd.result ? RESULT_CFG[upd.result] : null;
                    return (
                      <div key={row.id} className="py-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-mono text-slate-400 pt-0.5 w-6 flex-shrink-0">{idx + 1}</span>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm text-slate-800">{row.questionText}</p>
                                <span className="text-xs font-mono text-slate-400 mt-0.5 inline-block">{row.isoClause}</span>
                              </div>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-300 hover:text-red-500 flex-shrink-0"
                                onClick={() => deleteRow(row.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Result</Label>
                                <Select value={upd.result || '__none__'}
                                  onValueChange={v => setRowUpdates(prev => ({ ...prev, [row.id]: { ...prev[row.id], result: v === '__none__' ? '' : v } }))}>
                                  <SelectTrigger className="mt-1 h-8 text-xs">
                                    <SelectValue placeholder="Select result…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Select —</SelectItem>
                                    {RESULTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                {resultCfg && (
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${resultCfg.cls}`}>
                                    {upd.result === 'Non-Conforming' && <XCircle className="w-3 h-3" />}
                                    {upd.result === 'Conforming' && <CheckCircle2 className="w-3 h-3" />}
                                    {(upd.result === 'OFI' || upd.result === 'Observation') && <Lightbulb className="w-3 h-3" />}
                                    {resultCfg.label}
                                  </span>
                                )}
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-xs">Objective Evidence</Label>
                                <Textarea
                                  rows={2}
                                  className="mt-1 text-xs"
                                  placeholder="What was seen, record numbers, dates…"
                                  value={upd.evidence}
                                  onChange={e => setRowUpdates(prev => ({ ...prev, [row.id]: { ...prev[row.id], evidence: e.target.value } }))}
                                />
                              </div>
                            </div>
                            {upd.result === 'Non-Conforming' && (
                              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                Saving this as Non-Conforming will auto-create a draft QA NCR (HEXA-FRM-023)
                              </div>
                            )}
                            {(upd.result === 'OFI' || upd.result === 'Observation') && (
                              <div className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1.5 flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
                                Saving this will auto-create a draft entry in the OFI Register (HEXA-FRM-024)
                              </div>
                            )}
                            <div className="flex justify-end">
                              <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                                onClick={() => saveRow(row.id)} disabled={savingRow === row.id}>
                                {savingRow === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Sampling Log</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Records Reviewed</p>
                <div className="space-y-2">
                  {sectionC.recordsReviewed.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 bg-slate-50 border rounded px-3 py-1.5">{r.documentName}</span>
                      <span className="w-32 bg-slate-50 border rounded px-3 py-1.5 text-slate-500 font-mono">{r.referenceNumber}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => setSectionC(s => ({ ...s, recordsReviewed: s.recordsReviewed.filter((_, j) => j !== i) }))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input placeholder="Document name" value={sectionC.newRecordDoc}
                      onChange={e => setSectionC(s => ({ ...s, newRecordDoc: e.target.value }))} />
                    <Input placeholder="Ref. number" value={sectionC.newRecordRef}
                      onChange={e => setSectionC(s => ({ ...s, newRecordRef: e.target.value }))} />
                    <Button variant="outline" size="sm" onClick={() => {
                      if (sectionC.newRecordDoc.trim())
                        setSectionC(s => ({ ...s, recordsReviewed: [...s.recordsReviewed, { documentName: s.newRecordDoc.trim(), referenceNumber: s.newRecordRef.trim() }], newRecordDoc: '', newRecordRef: '' }));
                    }}><Plus className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Personnel Interviewed</p>
                <div className="space-y-2">
                  {sectionC.personnelInterviewed.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 bg-slate-50 border rounded px-3 py-1.5">{p.name}</span>
                      <span className="w-32 bg-slate-50 border rounded px-3 py-1.5 text-slate-500">{p.role}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => setSectionC(s => ({ ...s, personnelInterviewed: s.personnelInterviewed.filter((_, j) => j !== i) }))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input placeholder="Name" value={sectionC.newPersonName}
                      onChange={e => setSectionC(s => ({ ...s, newPersonName: e.target.value }))} />
                    <Input placeholder="Role" value={sectionC.newPersonRole}
                      onChange={e => setSectionC(s => ({ ...s, newPersonRole: e.target.value }))} />
                    <Button variant="outline" size="sm" onClick={() => {
                      if (sectionC.newPersonName.trim())
                        setSectionC(s => ({ ...s, personnelInterviewed: [...s.personnelInterviewed, { name: s.newPersonName.trim(), role: s.newPersonRole.trim() }], newPersonName: '', newPersonRole: '' }));
                    }}><Plus className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSections} disabled={saving} className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Sampling Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'D' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Section D — Closing Meeting Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Closing Meeting Date & Time</Label>
              <Input type="datetime-local" className="mt-1" value={sectionD.closingMeetingDate}
                onChange={e => setSectionD(s => ({ ...s, closingMeetingDate: e.target.value }))} />
            </div>
            <div>
              <Label>Attendees</Label>
              <div className="mt-1 space-y-2">
                {sectionD.closingAttendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 bg-slate-50 border rounded px-3 py-1.5">{a.name}</span>
                    <span className="w-32 bg-slate-50 border rounded px-3 py-1.5 text-slate-500">{a.role}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => setSectionD(s => ({ ...s, closingAttendees: s.closingAttendees.filter((_, j) => j !== i) }))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="Name" value={sectionD.newAttendeeName}
                    onChange={e => setSectionD(s => ({ ...s, newAttendeeName: e.target.value }))} />
                  <Input placeholder="Role" value={sectionD.newAttendeeRole}
                    onChange={e => setSectionD(s => ({ ...s, newAttendeeRole: e.target.value }))} />
                  <Button variant="outline" size="sm" onClick={() => {
                    if (sectionD.newAttendeeName.trim())
                      setSectionD(s => ({ ...s, closingAttendees: [...s.closingAttendees, { name: s.newAttendeeName.trim(), role: s.newAttendeeRole.trim() }], newAttendeeName: '', newAttendeeRole: '' }));
                  }}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Preliminary Findings</Label>
                <span className="text-xs text-slate-400">Auto-populated from NC/OFI rows — edit as needed</span>
              </div>
              <Textarea
                rows={4}
                className="mt-1"
                value={sectionD.preliminaryFindings || (ncRows.length > 0 || ofiRows.length > 0
                  ? [...ncRows.map((r, i) => `NC ${i + 1}: ${r.questionText}${r.evidence ? ` — ${r.evidence}` : ''}`),
                    ...ofiRows.map((r, i) => `OFI/Obs ${i + 1}: ${r.questionText}`)].join('\n')
                  : '')}
                onChange={e => setSectionD(s => ({ ...s, preliminaryFindings: e.target.value }))}
              />
            </div>
            <div>
              <Label>Auditee Accepts Findings?</Label>
              <Select value={sectionD.auditeeAcceptsFindings || '__none__'}
                onValueChange={v => setSectionD(s => ({ ...s, auditeeAcceptsFindings: v === '__none__' ? '' : v as '' | 'true' | 'false' }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not yet discussed —</SelectItem>
                  <SelectItem value="true">Yes — findings accepted</SelectItem>
                  <SelectItem value="false">No — disagreement noted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sectionD.auditeeAcceptsFindings === 'false' && (
              <div>
                <Label>Nature of Disagreement</Label>
                <Textarea rows={2} className="mt-1" value={sectionD.disagreementNature}
                  onChange={e => setSectionD(s => ({ ...s, disagreementNature: e.target.value }))} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Auditee Representative Sign-off Name</Label>
                <Input className="mt-1" value={sectionD.auditeeRepClosingName}
                  onChange={e => setSectionD(s => ({ ...s, auditeeRepClosingName: e.target.value }))} />
              </div>
              <div>
                <Label>Sign-off Date</Label>
                <Input type="date" className="mt-1" value={sectionD.auditeeRepClosingDate}
                  onChange={e => setSectionD(s => ({ ...s, auditeeRepClosingDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={saveSections} disabled={saving} className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Section D
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={addQuestionDialog} onOpenChange={setAddQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#2c3e50]" />
              Add Questions from Library
            </DialogTitle>
          </DialogHeader>
          {libraryQuestions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No library questions found for this process area.</p>
              <Link href="/ims/checklist-library" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                Manage Checklist Library →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Select questions to add to this audit. Already-added questions are not excluded.</p>
              {libraryQuestions.map(q => (
                <div
                  key={q.id}
                  onClick={() => toggleLibrarySelection(q.id)}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${selectedLibraryIds.includes(q.id) ? 'border-[#2c3e50] bg-slate-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedLibraryIds.includes(q.id) ? 'bg-[#2c3e50] border-[#2c3e50]' : 'border-slate-300'}`}>
                      {selectedLibraryIds.includes(q.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{q.questionText}</p>
                      <span className="text-xs font-mono text-slate-400">{q.isoClause}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddQuestionDialog(false)}>Cancel</Button>
            <Button
              onClick={addLibraryQuestions}
              disabled={!selectedLibraryIds.length || addingRows}
              className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}
            >
              {addingRows ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add {selectedLibraryIds.length > 0 ? selectedLibraryIds.length : ''} Question{selectedLibraryIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
