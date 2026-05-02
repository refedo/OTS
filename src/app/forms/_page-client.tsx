'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Search, FileText, ExternalLink, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';

type FormEntry = {
  code: string;
  name: string;
  href: string | null;
  status: 'built' | 'partial' | 'pending';
  isoClause: string;
  procedure: string;
  module: string;
  description: string;
};

const FORMS: FormEntry[] = [
  { code: 'FRM-001', name: 'Document Change Request (DCR)', href: '/ims/change-requests', status: 'built', isoClause: 'ISO 9001/14001/45001 §7.5', procedure: 'Hexa-ISP-001', module: 'IMS', description: 'Formally request and track changes to controlled IMS documents.' },
  { code: 'FRM-002', name: 'Master List of QMS Processes', href: '/ims/processes', status: 'built', isoClause: 'ISO 9001/14001 §4.4', procedure: 'Hexa-ISP-001', module: 'IMS', description: 'Register of all QMS processes with owners, inputs, outputs, and KPIs.' },
  { code: 'FRM-003', name: 'Approved Supplier List', href: '/supply-chain/approved-suppliers', status: 'built', isoClause: 'ISO 9001 §8.4', procedure: 'Hexa-ISP-011', module: 'Supply Chain', description: 'ISO 8.4 approved supplier register with rating, approval status, and expiry tracking.' },
  { code: 'FRM-004', name: 'In-house & Outsourced Processes List', href: '/ims/processes', status: 'built', isoClause: 'ISO 9001 §8.4', procedure: 'Hexa-ISP-011', module: 'IMS', description: 'Covered by the QMS Process List — filter by type OUTSOURCED or IN_HOUSE.' },
  { code: 'FRM-005', name: 'Training Needs Analysis (TNA)', href: '/hr/training', status: 'built', isoClause: 'ISO 9001 §7.2', procedure: 'Hexa-ISP-015', module: 'HR', description: 'Identify competency gaps per employee and plan required training. Second tab on the Training page.' },
  { code: 'FRM-006', name: 'Internal Audit Plan', href: '/ims/audit-plans', status: 'built', isoClause: 'ISO 9001/14001/45001 §9.2', procedure: 'Hexa-ISP-002', module: 'IMS', description: 'Annual internal audit planning with schedule, audit type, and status tracking.' },
  { code: 'FRM-007', name: 'Internal Audit Report', href: '/ims/audit-plans', status: 'built', isoClause: 'ISO 9001/14001/45001 §9.2', procedure: 'Hexa-ISP-002', module: 'IMS', description: 'Detailed audit findings per process linked to an audit plan.' },
  { code: 'FRM-008', name: 'Non-Conformance Report (NCR)', href: '/qc/ncr', status: 'built', isoClause: 'ISO 9001 §8.7, §10.2', procedure: 'Hexa-ISP-002', module: 'QC', description: 'Record, classify, and resolve non-conformances during production or inspection.' },
  { code: 'FRM-009', name: 'Corrective Action Report (CAR)', href: '/ims/audit-plans', status: 'built', isoClause: 'ISO 9001/14001/45001 §10.2', procedure: 'Hexa-ISP-002', module: 'IMS', description: 'Corrective actions linked to audit findings and NCRs.' },
  { code: 'FRM-010', name: 'NCR Close-Out', href: '/qc/ncr', status: 'built', isoClause: 'ISO 9001 §8.7', procedure: 'Hexa-ISP-002', module: 'QC', description: 'Formal close-out of NCRs with verification of corrective action effectiveness.' },
  { code: 'FRM-011', name: 'Management Review Record', href: '/ims/management-review', status: 'built', isoClause: 'ISO 9001/14001/45001 §9.3', procedure: 'Hexa-ISP-003', module: 'IMS', description: 'Structured management review with all 12 ISO §9.3.2 input items and sign-off.' },
  { code: 'FRM-012', name: 'Management Review Action Plan', href: '/ims/management-review', status: 'built', isoClause: 'ISO 9001/14001/45001 §9.3', procedure: 'Hexa-ISP-003', module: 'IMS', description: 'Actions and decisions arising from the management review meeting.' },
  { code: 'FRM-013', name: 'IMS Objectives Register', href: '/business-planning/objectives', status: 'built', isoClause: 'ISO 9001/14001/45001 §6.2', procedure: 'Hexa-ISP-003', module: 'Business Planning', description: 'SMART objectives with KPIs, targets, owners, and progress tracking.' },
  { code: 'FRM-014', name: 'Competence Matrix', href: '/ims/competence-matrix', status: 'built', isoClause: 'ISO 9001/14001/45001 §7.2', procedure: 'Hexa-ISP-015', module: 'IMS', description: 'Skills and competency matrix per role and employee with gap analysis.' },
  { code: 'FRM-015', name: 'Risk & Opportunity Register', href: '/ims/risks', status: 'built', isoClause: 'ISO 9001/14001/45001 §6.1', procedure: 'Hexa-ISP-005', module: 'IMS', description: '5×5 risk matrix with likelihood, severity, treatment plans, and status tracking.' },
  { code: 'FRM-016', name: 'Project Kickoff Meeting Checklist', href: '/projects/kickoff', status: 'built', isoClause: 'ISO 9001 §8.1, §8.2.3', procedure: 'Hexa-ISP-011', module: 'Projects', description: 'Kickoff meeting record with attendees, agenda, deliverables, open items, and sign-off.' },
  { code: 'FRM-017', name: 'Welder Qualification Test Record (WQT)', href: '/qc/welder-qualification', status: 'built', isoClause: 'ISO 9001 §7.2, §8.5.1', procedure: 'Hexa-ISP-012', module: 'QC', description: 'Full welder qualification register with process, position, material, test results, and certification validity.' },
  { code: 'FRM-018', name: 'Work / Welding Inspection Record (WIR)', href: '/qc/welding', status: 'built', isoClause: 'ISO 9001 §8.5.1', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Welding inspection records per joint/weld with accept/reject, inspector, and witness details.' },
  { code: 'FRM-019', name: 'Inspection & Test Plan (ITP)', href: '/itp', status: 'built', isoClause: 'ISO 9001 §8.5.1', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Project-level inspection and test plans with hold/witness/review points.' },
  { code: 'FRM-020', name: 'Material Inspection Record (MIR)', href: '/qc/material', status: 'built', isoClause: 'ISO 9001 §8.4', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Incoming material inspection with heat number, dimension, visual, and certificate verification.' },
  { code: 'FRM-021', name: 'Dimensional Inspection Report (DIR)', href: '/qc/dimensional', status: 'built', isoClause: 'ISO 9001 §8.5.1, §8.6', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Dimensional inspection records for fabricated structures against approved drawings.' },
  { code: 'FRM-022', name: 'Coating Inspection Record (DFT)', href: '/qc/coating', status: 'built', isoClause: 'ISO 9001 §8.5.1', procedure: 'Hexa-ISP-013', module: 'QC', description: 'Dry Film Thickness inspection with coat layer, ambient conditions, DFT readings, and result.' },
  { code: 'FRM-023', name: 'Risk Treatment Tracker', href: '/ims/risks/treatments', status: 'built', isoClause: 'ISO 9001/14001/45001 §6.1', procedure: 'Hexa-ISP-006', module: 'IMS', description: 'Track treatment plans linked to risks with owner, due date, and effectiveness verification.' },
  { code: 'FRM-024', name: 'Incident / Near-Miss Report', href: '/ims/safety/incidents', status: 'built', isoClause: 'ISO 45001 §10.2.1', procedure: 'Hexa-ISP-009', module: 'Safety', description: 'Incident reporting with type classification, severity, root cause, corrective and preventive actions.' },
  { code: 'FRM-025', name: 'Emergency Drill Record', href: '/ims/safety/drills', status: 'built', isoClause: 'ISO 45001 §8.8', procedure: 'Hexa-ISP-010', module: 'Safety', description: 'Emergency drill planning and recording with type, participants, objectives, findings, and corrective actions.' },
  { code: 'FRM-026', name: 'Toolbox Talk Record', href: '/ims/safety/toolbox-talks', status: 'built', isoClause: 'ISO 45001 §7.3', procedure: 'Hexa-ISP-006', module: 'Safety', description: 'Safety awareness session records with topic, attendee count, duration, and follow-up actions.' },
  { code: 'FRM-027', name: 'Legal & Regulatory Register', href: '/ims/legal-register', status: 'built', isoClause: 'ISO 9001/14001/45001 §6.1.3', procedure: 'Hexa-ISP-007', module: 'IMS', description: 'Register of applicable legal and regulatory requirements with compliance status and review dates.' },
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

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  built: { label: 'Built', icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'bg-green-100 text-green-700' },
  partial: { label: 'Partial', icon: <Clock className="h-3.5 w-3.5" />, cls: 'bg-amber-100 text-amber-700' },
  pending: { label: 'Pending', icon: <AlertCircle className="h-3.5 w-3.5" />, cls: 'bg-slate-100 text-slate-500' },
};

const ALL_MODULES = Array.from(new Set(FORMS.map(f => f.module))).sort();

export function FormsDirectoryClient() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = FORMS.filter(f => {
    if (filterModule && f.module !== filterModule) return false;
    if (filterStatus && f.status !== filterStatus) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.code.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.isoClause.toLowerCase().includes(q) ||
      f.procedure.toLowerCase().includes(q)
    );
  });

  const kpi = {
    total: FORMS.length,
    built: FORMS.filter(f => f.status === 'built').length,
    partial: FORMS.filter(f => f.status === 'partial').length,
    pending: FORMS.filter(f => f.status === 'pending').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-6 w-6 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-900">Forms Directory</h1>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">HEXA-FRM Registry</span>
        </div>
        <p className="text-sm text-slate-500">
          All Hexa Steel IMS form templates with ISO clause references. Click any row to navigate to the corresponding page.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Forms', value: kpi.total, color: 'text-slate-700' },
          { label: 'Built in OTS', value: kpi.built, color: 'text-green-700' },
          { label: 'Partial', value: kpi.partial, color: 'text-amber-700' },
          { label: 'Pending', value: kpi.pending, color: 'text-slate-500' },
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
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${filterModule === '' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
          >
            All Modules
          </button>
          {ALL_MODULES.map(m => (
            <button
              key={m}
              onClick={() => setFilterModule(m === filterModule ? '' : m)}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${filterModule === m ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(['', 'built', 'partial', 'pending'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${filterStatus === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
            >
              {s === '' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Form Code', 'Form Name', 'Module', 'ISO Clause', 'Procedure', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">No forms match your search.</td>
                </tr>
              ) : (
                filtered.map(f => {
                  const sc = STATUS_CONFIG[f.status];
                  return (
                    <tr
                      key={f.code}
                      className={`hover:bg-slate-50 transition-colors ${f.href ? 'cursor-pointer' : ''}`}
                      onClick={() => f.href && router.push(f.href)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${sc.cls}`}>
                          {sc.icon}
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {f.href ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-slate-50 border-t text-xs text-slate-400">
          Showing {filtered.length} of {FORMS.length} forms
        </div>
      </div>
    </div>
  );
}
