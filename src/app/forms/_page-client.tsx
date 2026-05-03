'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Search, FileText, ExternalLink, CheckCircle2, Database,
} from 'lucide-react';

type FormEntry = {
  code: string;
  name: string;
  href: string | null;
  isRecord?: boolean;
  isoClause: string;
  procedure: string;
  module: string;
  description: string;
};

const FORMS: FormEntry[] = [
  // ── Document Control ───────────────────────────────────────────────────────
  { code: 'HEXA-FRM-001', name: 'Document Change Request (DCR)', href: '/ims/change-requests', isoClause: 'ISO 9001/14001/45001 §7.5', procedure: 'Hexa-ISP-001', module: 'IMS', description: 'Formally request and track changes to controlled IMS documents.' },
  // ── Internal Audit ──────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-002', name: 'Internal Audit Plan', href: '/ims/audit-plans', isoClause: 'ISO 9001/14001/45001 §9.2', procedure: 'Hexa-ISP-002', module: 'IMS', description: 'Annual internal audit planning with schedule, audit type, and status tracking.' },
  { code: 'HEXA-FRM-003', name: 'Internal Audit Report / NCR+CAR', href: '/ims/audit-plans', isoClause: 'ISO 9001/14001/45001 §9.2 §10.2', procedure: 'Hexa-ISP-002', module: 'IMS', description: 'Audit findings, non-conformances, and corrective actions in one unified record.' },
  // ── Management Review ───────────────────────────────────────────────────────
  { code: 'HEXA-FRM-004', name: 'Management Review (MOM + Action Plan)', href: '/ims/management-review', isoClause: 'ISO 9001/14001/45001 §9.3', procedure: 'Hexa-ISP-003', module: 'IMS', description: 'Unified management review — minutes, inputs, outputs, and decisions in one record.' },
  // ── Planning / Objectives ───────────────────────────────────────────────────
  { code: 'HEXA-FRM-005', name: 'IMS Objectives Register', href: '/business-planning/objectives', isoClause: 'ISO 9001/14001/45001 §6.2', procedure: 'Hexa-ISP-003', module: 'Business Planning', description: 'SMART objectives with KPIs, targets, owners, and progress tracking.' },
  // ── Risk & Compliance ───────────────────────────────────────────────────────
  { code: 'HEXA-FRM-006', name: 'Risk & Compliance Register', href: '/ims/risks', isoClause: 'ISO 9001/14001/45001 §6.1', procedure: 'Hexa-ISP-002', module: 'IMS', description: 'Unified register covering RISK, HAZARD, LEGAL, ENVIRONMENTAL, and CONTEXT types.' },
  { code: 'HEXA-FRM-007', name: 'Risk Treatment Tracker', href: '/ims/risks/treatments', isoClause: 'ISO 9001/14001/45001 §6.1', procedure: 'Hexa-ISP-002', module: 'IMS', description: 'Track treatment plans linked to risks with owner, due date, and effectiveness verification.' },
  // ── HR / Competence ─────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-008', name: 'Competence Matrix', href: '/ims/competence-matrix', isoClause: 'ISO 9001/14001/45001 §7.2', procedure: 'Hexa-ISP-015', module: 'IMS', description: 'Skills and competency matrix per role and employee with gap analysis.' },
  { code: 'HEXA-FRM-009', name: 'Training Needs Analysis (TNA)', href: '/hr/training', isoClause: 'ISO 9001 §7.2', procedure: 'Hexa-ISP-015', module: 'HR', description: 'Identify competency gaps per employee and plan required training.' },
  // ── Supply Chain ────────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-010', name: 'Approved Supplier List', href: '/supply-chain/approved-suppliers', isoClause: 'ISO 9001 §8.4', procedure: 'Hexa-ISP-011', module: 'Supply Chain', description: 'ISO 8.4 approved supplier register with rating, approval status, and expiry tracking.' },
  // ── Projects ────────────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-011', name: 'Project Kickoff Meeting Checklist', href: '/projects/kickoff', isoClause: 'ISO 9001 §8.1, §8.2.3', procedure: 'Hexa-ISP-011', module: 'Projects', description: 'Kickoff meeting record with attendees, agenda, deliverables, open items, and sign-off.' },
  // ── QC / Welding ────────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-012', name: 'Welder Qualification Test Record (WQT)', href: '/qc/welder-qualification', isoClause: 'ISO 9001 §7.2, §8.5.1', procedure: 'Hexa-ISP-012', module: 'QC', description: 'Full welder qualification register with process, position, material, test results, and certification validity.' },
  { code: 'HEXA-FRM-013', name: 'Work / Welding Inspection Record (WIR)', href: '/qc/welding', isoClause: 'ISO 9001 §8.5.1', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Welding inspection records per joint/weld with accept/reject, inspector, and witness details.' },
  // ── QC / Inspection ─────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-014', name: 'Inspection & Test Plan (ITP)', href: '/itp', isoClause: 'ISO 9001 §8.5.1', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Project-level inspection and test plans with hold/witness/review points.' },
  { code: 'HEXA-FRM-015', name: 'Material Inspection Record (MIR)', href: '/qc/material', isoClause: 'ISO 9001 §8.4', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Incoming material inspection with heat number, dimension, visual, and certificate verification.' },
  { code: 'HEXA-FRM-016', name: 'Dimensional Inspection Report (DIR)', href: '/qc/dimensional', isoClause: 'ISO 9001 §8.5.1, §8.6', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Dimensional inspection records for fabricated structures against approved drawings.' },
  // ── QC / Coating ────────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-017', name: 'Coating Inspection Record (DFT)', href: '/qc/coating', isoClause: 'ISO 9001 §8.5.1', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Dry Film Thickness inspection with coat layer, ambient conditions, DFT readings, and result.' },
  // ── NCR / QC ────────────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-018', name: 'Non-Conformance Report (NCR)', href: '/qc/ncr', isoClause: 'ISO 9001 §8.7, §10.2', procedure: 'Hexa-ISP-002', module: 'QC', description: 'Record, classify, and resolve non-conformances during production or inspection.' },
  // ── HSE ─────────────────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-019', name: 'Incident / Near-Miss Report', href: '/ims/safety/incidents', isoClause: 'ISO 45001 §10.2.1', procedure: 'Hexa-ISP-020', module: 'Safety', description: 'Incident reporting with type classification, severity, root cause, corrective and preventive actions.' },
  { code: 'HEXA-FRM-020', name: 'Emergency Drill Record', href: '/ims/safety/drills', isoClause: 'ISO 45001 §8.8', procedure: 'Hexa-ISP-020', module: 'Safety', description: 'Emergency drill planning and recording with type, participants, objectives, findings, and corrective actions.' },
  { code: 'HEXA-FRM-021', name: 'Toolbox Talk Record', href: '/ims/safety/toolbox-talks', isoClause: 'ISO 45001 §7.3', procedure: 'Hexa-ISP-020', module: 'Safety', description: 'Safety awareness session records with topic, attendee count, duration, and follow-up actions.' },
  // ── Equipment ───────────────────────────────────────────────────────────────
  { code: 'HEXA-FRM-022', name: 'Calibration Register', href: '/ims/calibration', isoClause: 'ISO 9001 §7.1.5', procedure: 'Hexa-ISP-015', module: 'IMS', description: 'Measuring equipment calibration records with PASS/FAIL/CONDITIONAL results, cert refs, and IAS accreditation.' },
];

const RECORDS: FormEntry[] = [
  { code: 'HEXA-REC-023', name: 'Project Card / Job Order', href: '/projects', isRecord: true, isoClause: 'ISO 9001 §8.1', procedure: 'Hexa-ISP-011', module: 'Projects', description: 'System-generated project record created on order acceptance. Contains all project metadata, BOQ, and milestone data.' },
  { code: 'HEXA-REC-024', name: 'QMS Process List (SIPOC)', href: '/ims/processes', isRecord: true, isoClause: 'ISO 9001/14001 §4.4', procedure: 'Hexa-ISP-001', module: 'IMS', description: 'System-generated on demand. SIPOC register of all QMS processes with owners, inputs, outputs, and KPIs.' },
  { code: 'HEXA-REC-025', name: 'Legal & Regulatory Register Export', href: '/ims/legal-register', isRecord: true, isoClause: 'ISO 9001/14001/45001 §6.1.3', procedure: 'Hexa-ISP-002', module: 'IMS', description: 'Filtered export of HEXA-FRM-006 (type=LEGAL) containing all applicable legal and regulatory requirements.' },
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
      f.description.toLowerCase().includes(q) || f.isoClause.toLowerCase().includes(q) ||
      f.procedure.toLowerCase().includes(q);
  };

  const filteredForms = FORMS.filter(match);
  const filteredRecords = RECORDS.filter(match);

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <FileText className="h-6 w-6 text-[#2c3e50]" />
          <h1 className="text-2xl font-bold text-[#2c3e50]">Forms Directory</h1>
          <span className="text-xs bg-[#2c3e50] text-white px-2 py-0.5 rounded font-medium">Hexa-ISM-001 Rev.01</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">22 Forms · 3 Records</span>
        </div>
        <p className="text-sm text-slate-500">All HEXA-FRM data-entry screens and HEXA-REC system-generated outputs. Click any row to open the module.</p>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search code, name, ISO clause, procedure…"
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
        <div className="px-4 py-3 bg-[#2c3e50]/5 border-b flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#2c3e50]" />
          <span className="text-sm font-semibold text-[#2c3e50]">Data Entry Forms (HEXA-FRM)</span>
          <span className="text-xs text-slate-400 ml-auto">{filteredForms.length} forms</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Form Code', 'Form Name', 'Module', 'ISO Clause', 'Procedure', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredForms.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400 text-sm">No forms match your search.</td></tr>
              ) : filteredForms.map(f => (
                <tr
                  key={f.code}
                  className={`hover:bg-slate-50 transition-colors ${f.href ? 'cursor-pointer' : ''}`}
                  onClick={() => f.href && router.push(f.href)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-xs text-[#2c3e50] bg-[#2c3e50]/8 px-2 py-0.5 rounded">
                      {f.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{f.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 max-w-[320px] leading-relaxed">{f.description}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${MODULE_COLORS[f.module] ?? 'bg-gray-100 text-gray-600'}`}>
                      {f.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">{f.isoClause}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{f.procedure}</td>
                  <td className="px-4 py-3">
                    {f.href ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <ExternalLink className="h-3 w-3" />Open
                      </span>
                    ) : <span className="text-xs text-slate-300">—</span>}
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
          <p className="text-xs text-purple-600/70">Records are generated by OTS automatically — no manual data entry required. Click &quot;Generate&quot; to produce the output.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Record Code', 'Record Name', 'Module', 'ISO Clause', 'Procedure', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap text-xs uppercase tracking-wide">{h}</th>
                ))}
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
                    <span className="font-mono font-bold text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      {f.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{f.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 max-w-[320px] leading-relaxed">{f.description}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${MODULE_COLORS[f.module] ?? 'bg-gray-100 text-gray-600'}`}>
                      {f.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600 whitespace-nowrap">{f.isoClause}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{f.procedure}</td>
                  <td className="px-4 py-3">
                    {f.href ? (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                        <ExternalLink className="h-3 w-3" />Generate
                      </span>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-400 text-center pb-2">
        Hexa-ISM-001 Rev.01 — Supersedes legacy FRM-001 to FRM-027 numbering (22.9.0)
      </div>
    </div>
  );
}
