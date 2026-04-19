'use client';

/**
 * LetterSerialsSetupTab — HR Setup tab for configuring per-type letter serial numbers.
 * Each letter type can have a custom prefix and mask ({PREFIX}-{YY}-{NNNN}).
 * If no config exists for a type, creation falls back to INT/EXT-YY-NNNN.
 *
 * 19.1.0
 */

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Save, X, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const LETTER_TYPES: { value: string; label: string }[] = [
  { value: 'QUESTIONING',           label: 'Questioning (مسائلة)' },
  { value: 'ATTENTION',             label: 'Attention (لفت نظر)' },
  { value: 'FIRST_WARNING',         label: 'First Warning (إنذار أول)' },
  { value: 'FINAL_WARNING',         label: 'Final Warning (إنذار نهائي)' },
  { value: 'NON_RENEWAL_NOTICE',    label: 'Non-Renewal Notice' },
  { value: 'DISMISSAL',             label: 'Dismissal (فصل)' },
  { value: 'CIRCULATION',           label: 'Circular (تعميم)' },
  { value: 'WORK_COMMENCEMENT',     label: 'Work Commencement' },
  { value: 'SALARY_CERTIFICATE',    label: 'Salary Certificate' },
  { value: 'LEAVE_NOTICE',          label: 'Leave Notice' },
  { value: 'RETURN_FROM_LEAVE',     label: 'Return from Leave' },
  { value: 'PROBATION_EVALUATION',  label: 'Probation Evaluation' },
  { value: 'PERFORMANCE_APPRAISAL', label: 'Performance Appraisal' },
  { value: 'CLEARANCE_FORM',        label: 'Clearance Form' },
  { value: 'SALARY_NON_DISCLOSURE', label: 'Salary Non-Disclosure' },
  { value: 'OTHER',                 label: 'Other (أخرى)' },
];

const DEFAULT_PREFIXES: Record<string, string> = {
  QUESTIONING: 'QST', ATTENTION: 'ATT', FIRST_WARNING: 'FW1',
  FINAL_WARNING: 'FWN', NON_RENEWAL_NOTICE: 'NRN', DISMISSAL: 'DIS',
  CIRCULATION: 'CIR', WORK_COMMENCEMENT: 'WCM', SALARY_CERTIFICATE: 'SAL',
  LEAVE_NOTICE: 'LVN', RETURN_FROM_LEAVE: 'RFL', PROBATION_EVALUATION: 'PRB',
  PERFORMANCE_APPRAISAL: 'PRP', CLEARANCE_FORM: 'CLR',
  SALARY_NON_DISCLOSURE: 'SND', OTHER: 'OTH',
};

type SerialConfig = {
  id: string;
  letterType: string;
  prefix: string;
  mask: string;
  currentSeq: number;
  lastResetYear: number | null;
  resetYearly: boolean;
};

type EditState = { prefix: string; mask: string; resetYearly: boolean };

export function LetterSerialsSetupTab() {
  const [configs, setConfigs] = useState<SerialConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ prefix: '', mask: '{PREFIX}-{YY}-{NNNN}', resetYearly: true });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [addType, setAddType] = useState('');
  const [addPrefix, setAddPrefix] = useState('');
  const [addMask, setAddMask] = useState('{PREFIX}-{YY}-{NNNN}');
  const [addReset, setAddReset] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/hr/letter-serial-configs');
      if (r.ok) setConfigs(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const configuredTypes = new Set(configs.map((c) => c.letterType));
  const availableTypes = LETTER_TYPES.filter((t) => !configuredTypes.has(t.value));

  async function handleAdd() {
    if (!addType || !addPrefix.trim()) return setError('Select type and enter a prefix');
    setAdding(true); setError(null);
    try {
      const r = await fetch('/api/hr/letter-serial-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterType: addType, prefix: addPrefix.toUpperCase(), mask: addMask, resetYearly: addReset }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error ?? 'Failed'); }
      setAddType(''); setAddPrefix(''); setAddMask('{PREFIX}-{YY}-{NNNN}'); setAddReset(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add config');
    } finally {
      setAdding(false);
    }
  }

  async function handleSave(id: string) {
    setSaving(true); setError(null);
    try {
      const r = await fetch(`/api/hr/letter-serial-configs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editState),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error ?? 'Failed'); }
      setEditId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id); setError(null);
    try {
      await fetch(`/api/hr/letter-serial-configs/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setDeleting(null);
    }
  }

  async function handleResetSeq(id: string) {
    if (!confirm('Reset this type\'s sequence counter to 0? The next letter will start at 0001.')) return;
    await fetch(`/api/hr/letter-serial-configs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetSeq: true }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <Hash className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-1">Per-Type Letter Serials</p>
            <p>Configure a prefix and numbering mask for each letter type. Available placeholders: <code className="bg-blue-100 px-1 rounded">{'{PREFIX}'}</code> <code className="bg-blue-100 px-1 rounded">{'{YY}'}</code> <code className="bg-blue-100 px-1 rounded">{'{YYYY}'}</code> <code className="bg-blue-100 px-1 rounded">NNNN</code> (any number of N&apos;s sets the pad width).</p>
            <p className="mt-1 text-blue-600 text-xs">Types without a config use the fallback format: INT-YY-NNNN / EXT-YY-NNNN.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Existing configs */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>
      ) : (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {configs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No per-type configs yet — all types use the INT/EXT fallback.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Letter Type', 'Prefix', 'Mask', 'Current Seq.', 'Reset Yearly', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {configs.map((c) => {
                  const typeLabel = LETTER_TYPES.find((t) => t.value === c.letterType)?.label ?? c.letterType;
                  const isEditing = editId === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{typeLabel}</td>
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2">
                            <Input
                              value={editState.prefix}
                              onChange={(e) => setEditState((s) => ({ ...s, prefix: e.target.value.toUpperCase() }))}
                              className="w-24 font-mono text-xs h-8"
                              maxLength={20}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={editState.mask}
                              onChange={(e) => setEditState((s) => ({ ...s, mask: e.target.value }))}
                              className="w-48 font-mono text-xs h-8"
                              maxLength={100}
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">{c.currentSeq}</td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => setEditState((s) => ({ ...s, resetYearly: !s.resetYearly }))}
                              className={`w-10 h-5 rounded-full transition-colors ${editState.resetYearly ? 'bg-blue-500' : 'bg-slate-300'}`}
                            >
                              <span className={`block w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${editState.resetYearly ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSave(c.id)} disabled={saving}>
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditId(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-mono text-blue-700 font-bold">{c.prefix}</td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-xs">{c.mask}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{c.currentSeq}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.resetYearly ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {c.resetYearly ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit"
                                onClick={() => { setEditId(c.id); setEditState({ prefix: c.prefix, mask: c.mask, resetYearly: c.resetYearly }); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50" title="Reset counter"
                                onClick={() => handleResetSeq(c.id)}>
                                Reset
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50" title="Delete"
                                onClick={() => handleDelete(c.id)} disabled={deleting === c.id}>
                                {deleting === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add new config */}
      {availableTypes.length > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Add Serial Config for a Type</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Letter Type</Label>
              <Select value={addType || '__none__'} onValueChange={(v) => {
                const t = v === '__none__' ? '' : v;
                setAddType(t);
                if (t) setAddPrefix(DEFAULT_PREFIXES[t] ?? '');
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select type…</SelectItem>
                  {availableTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Prefix</Label>
              <Input
                value={addPrefix}
                onChange={(e) => setAddPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. QST"
                maxLength={20}
                className="h-9 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Mask</Label>
              <Input
                value={addMask}
                onChange={(e) => setAddMask(e.target.value)}
                placeholder="{PREFIX}-{YY}-{NNNN}"
                maxLength={100}
                className="h-9 font-mono text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Reset Yearly</Label>
              <div className="flex items-center gap-2 h-9">
                <button
                  type="button"
                  onClick={() => setAddReset((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors ${addReset ? 'bg-blue-500' : 'bg-slate-300'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${addReset ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs text-slate-500">{addReset ? 'Yes (counter resets each year)' : 'No (continuous)'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleAdd} disabled={adding || !addType || !addPrefix.trim()} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
              {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Config
            </Button>
            <p className="text-xs text-slate-400">
              Preview: <span className="font-mono text-slate-600">{addMask.replace('{PREFIX}', addPrefix || 'PFX').replace('{YY}', '26').replace('{YYYY}', '2026').replace(/N+/, (m) => '1'.padStart(m.length, '0'))}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
