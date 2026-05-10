'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { FileText, Search, ExternalLink, Database } from 'lucide-react';

type FormEntry = {
  code: string;
  name: string;
  isp: string;
  href: string | null;
  isRecord?: boolean;
  isoClause: string;
  module: string;
  otsRef: string;
  aramcoRef?: string;
};

// HEXA-FRM list exactly per Hexa-ISM-001 Rev.01 Appendix B
const FORMS: FormEntry[] = [
  { code: 'HEXA-FRM-001', name: 'Document Change Request (DCR)', isp: 'ISP-001', href: '/ims/change-requests', isoClause: 'ISO 9001/14001/45001 §7.5', module: 'IMS', otsRef: 'IMS Module — DCR Workflow' },
  { code: 'HEXA-FRM-002', name: 'Approved Supplier List', isp: 'ISP-006', href: '/supply-chain/approved-suppliers', isoClause: 'ISO 9001 §8.4', module: 'Supply Chain', otsRef: 'Supply Chain Module', aramcoRef: '4.1.14.10' },
  { code: 'HEXA-FRM-003', name: 'Training Needs Analysis', isp: 'ISP-006', href: '/hr/training', isoClause: 'ISO 9001 §7.2', module: 'HR', otsRef: 'HR Module — Training Programs', aramcoRef: '4.1.14.12' },
  { code: 'HEXA-FRM-004', name: 'Audit Schedule', isp: 'ISP-004', href: '/ims/audit-plans', isoClause: 'ISO 9001/14001/45001 §9.2', module: 'IMS', otsRef: 'IMS Module — Audit Tracker', aramcoRef: '4.1.14.9' },
  { code: 'HEXA-FRM-005', name: 'Internal Audit Report', isp: 'ISP-004', href: '/ims/audit-plans', isoClause: 'ISO 9001/14001/45001 §9.2', module: 'IMS', otsRef: 'IMS Module — Audit Tracker', aramcoRef: '4.1.14.9' },
  { code: 'HEXA-FRM-006', name: 'Audit Checklist', isp: 'ISP-004', href: '/ims/audit-plans', isoClause: 'ISO 9001/14001/45001 §9.2', module: 'IMS', otsRef: 'IMS Module — Audit Tracker', aramcoRef: '4.1.14.9' },
  { code: 'HEXA-FRM-007', name: 'Non-Conformance Report (NCR)', isp: 'ISP-005', href: '/qc/ncr', isoClause: 'ISO 9001 §8.7, §10.2', module: 'QC', otsRef: 'QC Module — NCR records', aramcoRef: '4.1.14.11' },
  { code: 'HEXA-FRM-008', name: 'Management Review Record', isp: 'ISP-003', href: '/ims/management-review', isoClause: 'ISO 9001/14001/45001 §9.3', module: 'IMS', otsRef: 'IMS Module — Management Review', aramcoRef: '4.1.14.8' },
  { code: 'HEXA-FRM-009', name: 'IMS Objectives & KPI Register', isp: 'ISP-003', href: '/business-planning/objectives', isoClause: 'ISO 9001/14001/45001 §6.2', module: 'Business Planning', otsRef: 'Business Planning Module — KPIs', aramcoRef: '4.1.14.6a' },
  { code: 'HEXA-FRM-010', name: 'Personnel Competency & Training Record', isp: 'ISP-006', href: '/ims/competence-matrix', isoClause: 'ISO 9001 §7.2 / 45001 §7.2, 7.3', module: 'HR', otsRef: 'HR Module — Employee profiles; IMS Module — Competence Matrix', aramcoRef: '4.1.14.5, 4.1.14.12' },
  { code: 'HEXA-FRM-011', name: 'Risk & Compliance Register', isp: 'ISP-002', href: '/ims/risks', isoClause: 'ISO 9001/14001/45001 §6.1', module: 'IMS', otsRef: 'IMS Module — Risk Register (5×5 matrix)', aramcoRef: '4.1.14.7' },
  { code: 'HEXA-FRM-012', name: 'Project Kickoff Checklist', isp: 'ISP-011', href: '/projects/kickoff', isoClause: 'ISO 9001 §8.1, §8.2.3', module: 'Projects', otsRef: 'Project Module — Project Setup Wizard (completion record)' },
  { code: 'HEXA-FRM-013', name: 'Welder Qualification Test Record (WQT)', isp: 'ISP-012', href: '/qc/welder-qualification', isoClause: 'ISO 9001 §7.2, §8.5.1', module: 'QC', otsRef: 'QC Module — Welder Qualification Register', aramcoRef: '4.1.14.5' },
  { code: 'HEXA-FRM-014', name: 'Work / Welding Inspection Record (WIR)', isp: 'ISP-015', href: '/qc/welding', isoClause: 'ISO 9001 §8.5.1', module: 'QC', otsRef: 'QC Module — ITP / WIR records per project' },
  { code: 'HEXA-FRM-015', name: 'Inspection and Test Plan (ITP)', isp: 'ISP-015', href: '/itp', isoClause: 'ISO 9001 §8.5.1, §8.6', module: 'QC', otsRef: 'QC Module — ITP records (per project)' },
  { code: 'HEXA-FRM-016', name: 'Material Inspection Receipt (MIR)', isp: 'ISP-011', href: '/qc/material', isoClause: 'ISO 9001 §8.4', module: 'QC', otsRef: 'QC Module — MIR (linked to Dolibarr PO)' },
  { code: 'HEXA-FRM-017', name: 'Dimensional Inspection Report', isp: 'ISP-015', href: '/qc/dimensional', isoClause: 'ISO 9001 §8.5.1, §8.6', module: 'QC', otsRef: 'QC Module — Dimensional inspection records' },
  { code: 'HEXA-FRM-018', name: 'Coating Inspection Record (DFT)', isp: 'ISP-014', href: '/qc/coating', isoClause: 'ISO 9001 §8.5.1', module: 'QC', otsRef: 'QC Module — Coating inspection records' },
  { code: 'HEXA-FRM-019', name: 'Incident / Near-Miss Report', isp: 'ISP-020', href: '/ims/safety/incidents', isoClause: 'ISO 45001 §10.2.1', module: 'Safety', otsRef: 'IMS Module — Incident Log' },
  { code: 'HEXA-FRM-020', name: 'Emergency Drill Record', isp: 'ISP-020', href: '/ims/safety/drills', isoClause: 'ISO 45001 §8.8', module: 'Safety', otsRef: 'IMS Module — System Events (emergency drill)' },
  { code: 'HEXA-FRM-021', name: 'Toolbox Talk Record', isp: 'ISP-020', href: '/ims/safety/toolbox-talks', isoClause: 'ISO 45001 §7.3', module: 'Safety', otsRef: 'HR Module — HSE Announcements' },
  { code: 'HEXA-FRM-022', name: 'Calibration Record / Certificate', isp: 'ISP-015', href: '/ims/calibration', isoClause: 'ISO 9001 §7.1.5', module: 'IMS', otsRef: 'IMS Module — Calibration Register; Asset Module' },
  { code: 'HEXA-FRM-023', name: 'Non-Product NCR (QA NCR)', isp: 'ISP-005', href: '/ims/ncr', isoClause: 'ISO 9001 §10.2', module: 'IMS', otsRef: 'IMS Module — QA NCR / Non-Product Nonconformance & CAPA Workflow Engine' },
  { code: 'HEXA-FRM-024', name: 'OFI & Observation Register', isp: 'ISP-004', href: '/ims/ofi-register', isoClause: 'ISO 9001 §9.2, §10.3', module: 'IMS', otsRef: 'IMS Module — Audit Tracker — OFI Register' },
  { code: 'HEXA-FRM-025', name: 'Corrective Action & Verification Record', isp: 'ISP-005', href: '/ims/car', isoClause: 'ISO 9001 §10.2', module: 'IMS', otsRef: 'IMS Module — CAPA Tracker — Corrective Actions' },
  { code: 'HEXA-FRM-026', name: 'Audit Checklist Library', isp: 'ISP-004', href: '/ims/checklist-library', isoClause: 'ISO 9001 §9.2', module: 'IMS', otsRef: 'IMS Module — Audit Tracker — Checklist Library (master question bank)' },
];

const RECORDS: FormEntry[] = [
  { code: 'HEXA-REC-023', name: 'Project Card / Job Order', isp: '—', href: '/projects', isRecord: true, isoClause: 'ISO 9001 §8.1', module: 'Projects', otsRef: 'Project Module — auto-generated on order acceptance' },
  { code: 'HEXA-REC-024', name: 'QMS Process List (SIPOC)', isp: 'ISP-001', href: '/ims/processes', isRecord: true, isoClause: 'ISO 9001/14001 §4.4', module: 'IMS', otsRef: 'IMS Module — QMS Process List (system-generated on demand)' },
  { code: 'HEXA-REC-025', name: 'Legal & Regulatory Register Export', isp: 'ISP-002', href: '/ims/legal-register', isRecord: true, isoClause: 'ISO 9001/14001/45001 §6.1.3', module: 'IMS', otsRef: 'Filtered export of FRM-011 (type=LEGAL)' },
  { code: 'HEXA-REC-026', name: 'Audit Programme Dashboard Export', isp: 'ISP-004', href: '/ims/programme-dashboard', isRecord: true, isoClause: 'ISO 9001 §9.2', module: 'IMS', otsRef: 'IMS Module — Audit Tracker — auto-generated programme dashboard (HEXA-REC-026)' },
];

const MODULE_COLORS: Record<string, string> = {
  IMS: 'bg-blue-100 text-blue-700',
  QC: 'bg-indigo-100 text-indigo-700',
  HR: 'bg-amber-100 text-amber-700',
  'Supply Chain': 'bg-green-100 text-green-700',
  Projects: 'bg-cyan-100 text-cyan-700',
  Safety: 'bg-orange-100 text-orange-700',
  'Business Planning': 'bg-purple-100 text-purple-700',
};

const ALL_MODULES = Array.from(new Set([...FORMS, ...RECORDS].map(f => f.module))).sort();

export function FormsDirectoryClient() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');

  const q = search.toLowerCase().trim();
  const match = (f: FormEntry) => {
    if (filterModule && f.module !== filterModule) return false;
    if (!q) return true;
    return f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) ||
      f.isp.toLowerCase().includes(q) || f.isoClause.toLowerCase().includes(q) ||
      f.otsRef.toLowerCase().includes(q) || (f.aramcoRef ?? '').toLowerCase().includes(q);
  };

  const filteredForms = FORMS.filter(match);
  const filteredRecords = RECORDS.filter(match);

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <FileText className="h-6 w-6 text-[#2c3e50]" />
          <h1 className="text-2xl font-bold text-[#2c3e50]">OTS™ Data Entry Forms — HEXA-FRM (26 forms)</h1>
        </div>
        <p className="text-sm text-slate-500">
          Per <strong>Hexa-ISM-001 Rev.01</strong> — all 26 HEXA-FRM data-entry forms and 4 HEXA-REC system-generated records. Click any row to open the module.
        </p>
        <p className="text-xs text-slate-400 italic mt-1">All forms are OTS™ data entry screens. Records are system-generated outputs. No paper forms are maintained.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Forms', value: FORMS.length, color: 'text-[#2c3e50]' },
          { label: 'System Records', value: RECORDS.length, color: 'text-purple-700' },
          { label: 'ISO 9001', value: [...FORMS, ...RECORDS].filter(f => f.isoClause.includes('9001')).length, color: 'text-green-700' },
          { label: 'ISO 45001', value: [...FORMS, ...RECORDS].filter(f => f.isoClause.includes('45001')).length, color: 'text-orange-700' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Module filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search code, name, ISP, ISO clause…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterModule('')}
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${filterModule === '' ? 'bg-[#2c3e50] text-white border-[#2c3e50]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
          >
            All Modules
          </button>
          {ALL_MODULES.map(m => (
            <button
              key={m}
              onClick={() => setFilterModule(m === filterModule ? '' : m)}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${filterModule === m ? 'bg-[#2c3e50] text-white border-[#2c3e50]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#2c3e50] text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Form No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">ISP Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">OTS™ Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">ISO Clause</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">Aramco Ref.</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredForms.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-sm">No forms match your search.</td></tr>
              ) : filteredForms.map(f => (
                <tr
                  key={f.code}
                  className={`hover:bg-slate-50 transition-colors ${f.href ? 'cursor-pointer' : ''}`}
                  onClick={() => f.href && router.push(f.href)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-xs text-[#2c3e50] bg-[#2c3e50]/8 px-2 py-0.5 rounded whitespace-nowrap">
                      {f.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{f.name}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${MODULE_COLORS[f.module] ?? 'bg-gray-100 text-gray-600'}`}>
                      {f.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{f.isp}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">{f.otsRef}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap hidden lg:table-cell">{f.isoClause}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap hidden xl:table-cell">{f.aramcoRef ?? '—'}</td>
                  <td className="px-4 py-3">
                    {f.href ? (
                      <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-xl border-2 border-dashed border-purple-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-purple-50 border-b border-dashed border-purple-200 flex items-center gap-2">
          <Database className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">System-Generated Records (HEXA-REC)</span>
          <span className="text-xs text-purple-400 ml-auto">{filteredRecords.length} records</span>
        </div>
        <div className="px-4 py-2 bg-purple-50/50 border-b border-dashed border-purple-100">
          <p className="text-xs text-purple-600/70">Records are output documents generated by OTS™ automatically — no manual data entry required.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-purple-700 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Record No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">ISP Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">OTS™ Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">ISO Clause</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400 text-sm">No records match your search.</td></tr>
              ) : filteredRecords.map(f => (
                <tr
                  key={f.code}
                  className={`hover:bg-purple-50/50 transition-colors ${f.href ? 'cursor-pointer' : ''}`}
                  onClick={() => f.href && router.push(f.href)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded whitespace-nowrap">
                      {f.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{f.name}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${MODULE_COLORS[f.module] ?? 'bg-gray-100 text-gray-600'}`}>
                      {f.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{f.isp}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">{f.otsRef}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap hidden lg:table-cell">{f.isoClause}</td>
                  <td className="px-4 py-3">
                    {f.href ? (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                        <ExternalLink className="h-3 w-3" />Generate
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-400 text-center pb-2">
        Hexa-ISM-001 Rev.01 — Supersedes legacy FRM-001 to FRM-027 numbering
      </div>
    </div>
  );
}
