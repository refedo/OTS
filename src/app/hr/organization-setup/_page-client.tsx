'use client';

import { useState, useCallback } from 'react';
import { GitBranch, Save, CheckCircle2, Loader2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface EmployeeRow {
  id: string;
  fullNameEn: string;
  employmentId: string;
  occupation: string | null;
  reportsToId: string | null;
  departmentRef: { name: string } | null;
}

interface OrgSetupClientProps {
  employees: EmployeeRow[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function OrgSetupClient({ employees }: OrgSetupClientProps) {
  // Track pending changes: employeeId → new reportsToId (or null)
  const [pending, setPending] = useState<Record<string, string | null>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [search, setSearch] = useState('');

  const getEffectiveManager = (emp: EmployeeRow) =>
    emp.id in pending ? pending[emp.id] : emp.reportsToId;

  const handleChange = (employeeId: string, managerId: string | null) => {
    const emp = employees.find(e => e.id === employeeId);
    const originalValue = emp?.reportsToId ?? null;
    const isReset = managerId === originalValue;

    setPending(prev => {
      const next = { ...prev };
      if (isReset) {
        delete next[employeeId];
      } else {
        next[employeeId] = managerId;
      }
      return next;
    });
    setSaveStates(prev => ({ ...prev, [employeeId]: 'idle' }));
  };

  const saveOne = useCallback(async (employeeId: string) => {
    setSaveStates(prev => ({ ...prev, [employeeId]: 'saving' }));
    const newManagerId = pending[employeeId] ?? null;
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsToId: newManagerId }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveStates(prev => ({ ...prev, [employeeId]: 'saved' }));
      setPending(prev => {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      });
      // Optimistically update the employee's reportsToId in-place won't work since
      // employees is a prop — the parent will re-render on next navigation.
    } catch {
      setSaveStates(prev => ({ ...prev, [employeeId]: 'error' }));
    }
  }, [pending]);

  const saveAll = useCallback(async () => {
    const ids = Object.keys(pending);
    await Promise.all(ids.map(id => saveOne(id)));
  }, [pending, saveOne]);

  const pendingCount = Object.keys(pending).length;

  const filtered = employees.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.fullNameEn.toLowerCase().includes(q) ||
      e.employmentId.toLowerCase().includes(q) ||
      (e.occupation ?? '').toLowerCase().includes(q) ||
      (e.departmentRef?.name ?? '').toLowerCase().includes(q)
    );
  });

  const getManagerName = (id: string | null) =>
    id ? (employees.find(e => e.id === id)?.fullNameEn ?? '—') : '—';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-white/15 border border-white/20 inline-block mb-1">
                    HR · Organization
                  </div>
                  <h1 className="text-2xl font-bold">Organization Setup</h1>
                </div>
              </div>
              <p className="text-sky-100 text-sm">
                Assign reporting managers in bulk to build the employee hierarchy. Changes here update the organization chart.
              </p>
            </div>
            {pendingCount > 0 && (
              <Button
                size="sm"
                className="bg-white text-sky-700 hover:bg-sky-50 shrink-0 gap-1.5"
                onClick={saveAll}
              >
                <Save className="w-4 h-4" />
                Save All ({pendingCount})
              </Button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-slate-800">{employees.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">With Manager Set</p>
            <p className="text-2xl font-bold text-slate-800">
              {employees.filter(e => (e.id in pending ? pending[e.id] : e.reportsToId) !== null).length}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Unsaved Changes</p>
            <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
          </div>
        </div>

        {/* Search + Save All */}
        <div className="flex gap-3">
          <Input
            placeholder="Search by name, ID, role, or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
          {pendingCount > 0 && (
            <Button variant="outline" onClick={saveAll} className="gap-1.5 shrink-0">
              <Save className="w-4 h-4" />
              Save All ({pendingCount})
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 hidden sm:table-cell">Department</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Reports To</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No employees found.</p>
                  </td>
                </tr>
              ) : filtered.map(emp => {
                const effectiveManager = getEffectiveManager(emp);
                const isDirty = emp.id in pending;
                const state = saveStates[emp.id] ?? 'idle';

                return (
                  <tr key={emp.id} className={`border-b last:border-0 transition-colors ${isDirty ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                          <Users className="size-4 text-sky-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{emp.fullNameEn}</p>
                          <p className="text-xs text-slate-400">{emp.occupation ?? emp.employmentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {emp.departmentRef?.name ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={effectiveManager ?? 'none'}
                        onValueChange={val => handleChange(emp.id, val === 'none' ? null : val)}
                      >
                        <SelectTrigger className={`h-8 text-sm max-w-xs ${isDirty ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}>
                          <SelectValue>
                            {effectiveManager
                              ? <span className="font-medium">{getManagerName(effectiveManager)}</span>
                              : <span className="text-slate-400">No manager</span>
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="none">
                            <span className="text-slate-400 italic">No manager (top-level)</span>
                          </SelectItem>
                          {employees
                            .filter(m => m.id !== emp.id)
                            .map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.fullNameEn}
                                {m.occupation && (
                                  <span className="text-xs text-slate-400 ml-1.5">· {m.occupation}</span>
                                )}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {state === 'saving' && (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400 inline-block" />
                      )}
                      {state === 'saved' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                      )}
                      {state === 'error' && (
                        <AlertTriangle className="w-4 h-4 text-rose-500 inline-block" />
                      )}
                      {isDirty && state === 'idle' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-sky-300 text-sky-700 hover:bg-sky-50"
                          onClick={() => saveOne(emp.id)}
                        >
                          <Save className="w-3 h-3" /> Save
                        </Button>
                      )}
                      {!isDirty && emp.reportsToId && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Set
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Changes are saved individually per row or all at once via "Save All". The Organization Chart will reflect changes immediately after saving.
        </p>
      </div>
    </div>
  );
}
