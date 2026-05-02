'use client';

import { useState, useEffect, useCallback } from 'react';
import { IsoClauseNote } from '@/components/ims/IsoClauseNote';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableProperties, RefreshCw, Search, Download, Loader2 } from 'lucide-react';

const COMPETENCE_AREAS = [
  'Welding',
  'QC Inspection',
  'OHS Awareness',
  'First Aid',
  'Crane Operation',
  'Laser Operation',
  'PEB Design',
  'Document Control',
] as const;

type CompetenceStatus = 'COMPETENT' | 'IN_TRAINING' | 'NOT_REQUIRED' | 'GAP' | null;

type CompetenceEntry = {
  id: string;
  competenceArea: string;
  status: string;
  evidenceRef: string | null;
  assessedBy: { id: string; name: string } | null;
  assessedAt: string | null;
  expiryDate: string | null;
};

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  occupation: string;
  section: string | null;
  department: { id: string; name: string } | null;
  competenceEntries: CompetenceEntry[];
};

const STATUS_CFG: Record<string, { label: string; icon: string; cls: string }> = {
  COMPETENT: { label: 'Competent', icon: '✓', cls: 'bg-green-100 text-green-800' },
  IN_TRAINING: { label: 'In Training', icon: '⚡', cls: 'bg-amber-100 text-amber-700' },
  NOT_REQUIRED: { label: 'Not Required', icon: '—', cls: 'bg-slate-100 text-slate-500' },
  GAP: { label: 'Gap', icon: '✗', cls: 'bg-red-100 text-red-700' },
};

function getEntryStatus(emp: Employee, area: string): CompetenceStatus {
  const entry = emp.competenceEntries.find(e => e.competenceArea === area);
  return entry ? (entry.status as CompetenceStatus) : null;
}

function StatusCell({ status, onClick }: { status: CompetenceStatus; onClick: () => void }) {
  if (!status) {
    return (
      <td className="border px-1 py-1 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={onClick}>
        <span className="text-slate-300 text-xs">—</span>
      </td>
    );
  }
  const cfg = STATUS_CFG[status];
  return (
    <td className="border px-1 py-1 text-center cursor-pointer hover:opacity-75 transition-opacity" onClick={onClick}>
      <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${cfg.cls}`} title={cfg.label}>
        {cfg.icon}
      </span>
    </td>
  );
}

export function CompetenceMatrixClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (deptFilter) params.set('departmentId', deptFilter);
    const res = await fetch(`/api/ims/competence-matrix?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees);
    }
    setLoading(false);
  }, [deptFilter]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  const filtered = search
    ? employees.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        e.occupation?.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeNumber?.includes(search)
      )
    : employees;

  const cycleStatus = async (emp: Employee, area: string) => {
    const current = getEntryStatus(emp, area);
    const cycle: (CompetenceStatus)[] = [null, 'COMPETENT', 'IN_TRAINING', 'NOT_REQUIRED', 'GAP'];
    const currentIdx = cycle.indexOf(current);
    const next = cycle[(currentIdx + 1) % cycle.length];
    if (!next) return;

    const key = `${emp.id}-${area}`;
    setSaving(key);
    try {
      const res = await fetch('/api/ims/competence-matrix/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: emp.id, competenceArea: area, status: next }),
      });
      if (res.ok) {
        const entry: CompetenceEntry = await res.json();
        setEmployees(prev => prev.map(e => {
          if (e.id !== emp.id) return e;
          const existing = e.competenceEntries.find(ce => ce.competenceArea === area);
          if (existing) {
            return { ...e, competenceEntries: e.competenceEntries.map(ce => ce.competenceArea === area ? entry : ce) };
          }
          return { ...e, competenceEntries: [...e.competenceEntries, entry] };
        }));
      }
    } finally {
      setSaving(null);
    }
  };

  const exportCsv = () => {
    const header = ['Employee #', 'Name', 'Occupation', 'Department', ...COMPETENCE_AREAS];
    const rows = filtered.map(e => [
      e.employeeNumber,
      `${e.firstName} ${e.lastName}`,
      e.occupation,
      e.department?.name ?? '',
      ...COMPETENCE_AREAS.map(a => getEntryStatus(e, a) ?? ''),
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competence-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpi = {
    total: employees.length,
    competent: employees.reduce((acc, e) => acc + e.competenceEntries.filter(c => c.status === 'COMPETENT').length, 0),
    gaps: employees.reduce((acc, e) => acc + e.competenceEntries.filter(c => c.status === 'GAP').length, 0),
    inTraining: employees.reduce((acc, e) => acc + e.competenceEntries.filter(c => c.status === 'IN_TRAINING').length, 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <TableProperties className="w-8 h-8 text-teal-300" />
          <div>
            <h1 className="text-2xl font-bold">Competence Matrix</h1>
            <p className="text-teal-200 text-sm">ISO 9001 §7.2 — Employee competence tracking and gap analysis</p>
            <p className="text-teal-300/60 text-xs font-mono mt-0.5">Form: HEXA-FRM-014 · Procedure: Hexa-ISP-015</p>
          </div>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-competence-matrix"
        clauses={[
          { standard: 'ISO 9001:2015', clause: '§7.2', title: 'Competence' },
          { standard: 'ISO 14001:2015', clause: '§7.2', title: 'Competence' },
          { standard: 'ISO 45001:2018', clause: '§7.2', title: 'Competence' },
        ]}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Employees', value: kpi.total, color: 'text-slate-700', bg: 'bg-white border' },
          { label: 'Competent Entries', value: kpi.competent, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'In Training', value: kpi.inTraining, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Gaps Identified', value: kpi.gaps, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-lg border p-4 ${k.bg}`}>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="font-semibold text-slate-600">Legend:</span>
        {Object.entries(STATUS_CFG).map(([, cfg]) => (
          <span key={cfg.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${cfg.cls}`}>
            <span className="font-bold">{cfg.icon}</span> {cfg.label}
          </span>
        ))}
        <span className="text-slate-400">Click a cell to cycle through statuses</span>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="pl-9 w-52" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchMatrix}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border px-3 py-2 text-left min-w-[120px] sticky left-0 bg-slate-800 z-10">Employee</th>
                  <th className="border px-2 py-2 text-left min-w-[100px]">Occupation</th>
                  <th className="border px-2 py-2 text-left min-w-[80px]">Dept</th>
                  {COMPETENCE_AREAS.map(a => (
                    <th key={a} className="border px-1 py-2 text-center min-w-[80px] font-medium" title={a}>
                      <div className="writing-vertical text-xs" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', height: 60, display: 'flex', alignItems: 'center' }}>
                        {a}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3 + COMPETENCE_AREAS.length} className="px-4 py-8 text-center text-slate-400">
                      No active employees found.
                    </td>
                  </tr>
                ) : filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border px-3 py-1.5 sticky left-0 bg-white">
                      <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-slate-400">{emp.employeeNumber}</p>
                    </td>
                    <td className="border px-2 py-1.5 text-slate-600">{emp.occupation ?? '—'}</td>
                    <td className="border px-2 py-1.5 text-slate-500 text-xs">{emp.department?.name ?? '—'}</td>
                    {COMPETENCE_AREAS.map(area => (
                      <StatusCell
                        key={area}
                        status={getEntryStatus(emp, area)}
                        onClick={() => cycleStatus(emp, area)}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-teal-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
        </div>
      )}
    </div>
  );
}
