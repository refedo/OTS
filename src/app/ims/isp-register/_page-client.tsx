'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

type IspEntry = {
  code: string;
  title: string;
  isoClauses: string;
  domain: 'SYSTEM' | 'OPERATIONS' | 'HSE' | 'TECHNICAL';
  otsRef: string;
  rev: string;
};

// Appendix A — IMS Document Register per Hexa-ISM-001 Rev.01
const ISP_DOCS: IspEntry[] = [
  // ── LEVEL 1 — SYSTEM ──────────────────────────────────────────────────────
  { code: 'Hexa-ISP-001', title: 'Document & Data Governance', isoClauses: '7.5', domain: 'SYSTEM', otsRef: 'IMS Module — Document Control; DCR Workflow', rev: '01' },
  { code: 'Hexa-ISP-002', title: 'Risk & Compliance Management', isoClauses: '4.1, 4.2, 6.1, 6.1.2, 6.1.3', domain: 'SYSTEM', otsRef: 'IMS Module — Risk Register; Hazard Register; Legal Register; Environmental Register', rev: '01' },
  { code: 'Hexa-ISP-003', title: 'Management Review', isoClauses: '9.3', domain: 'SYSTEM', otsRef: 'IMS Module — Management Review (HEXA-FRM-008); Business Planning Module', rev: '01' },
  { code: 'Hexa-ISP-004', title: 'Internal Audit', isoClauses: '9.2', domain: 'SYSTEM', otsRef: 'IMS Module — Audit Tracker (HEXA-FRM-004/005/006)', rev: '01' },
  { code: 'Hexa-ISP-005', title: 'Nonconformance & CAPA', isoClauses: '10.2', domain: 'SYSTEM', otsRef: 'QC Module — NCR/CA Workflow Engine (HEXA-FRM-007)', rev: '01' },
  { code: 'Hexa-ISP-006', title: 'Competence, Training & HR Control', isoClauses: '7.2, 7.3', domain: 'SYSTEM', otsRef: 'HR Module — Training Programs; IMS Module — Competence Matrix', rev: '01' },
  { code: 'Hexa-ISP-030', title: 'Business Planning & KPI Management', isoClauses: '6.2', domain: 'SYSTEM', otsRef: 'Business Planning Module — KPIs and Objectives (HEXA-FRM-009)', rev: '01' },
  // ── LEVEL 2 — OPERATIONS ──────────────────────────────────────────────────
  { code: 'Hexa-ISP-010', title: 'Design & Engineering Control', isoClauses: '8.3', domain: 'OPERATIONS', otsRef: 'OTS™ Tasks Module — Design/Detailing; IMS Document Control (HEXA-DCP-001)', rev: '01' },
  { code: 'Hexa-ISP-011', title: 'Procurement & Supplier Control', isoClauses: '8.4', domain: 'OPERATIONS', otsRef: 'Supply Chain Module — LCR; QC Module — MIR (HEXA-FRM-016); Dolibarr ERP', rev: '01' },
  { code: 'Hexa-ISP-012', title: 'Primary Fabrication & Welding Control', isoClauses: '7.2, 8.5.1', domain: 'OPERATIONS', otsRef: 'QC Module — WPS Register; Welder Qualification Register (HEXA-FRM-013); Production Module', rev: '01' },
  { code: 'Hexa-ISP-013', title: 'Secondary Members & Roll Forming', isoClauses: '8.5.1', domain: 'OPERATIONS', otsRef: 'QC Module — PEB line logging; Assembly Parts; OTS™ Asset Module (HX-ACCFM-001, HX-PEB-001)', rev: '01' },
  { code: 'Hexa-ISP-014', title: 'Shot Blasting, Surface Prep & Coating', isoClauses: '8.5.1', domain: 'OPERATIONS', otsRef: 'QC Module — Coating inspection records (HEXA-FRM-018); NCR — coating stage log', rev: '01' },
  { code: 'Hexa-ISP-015', title: 'QC & Inspection Control (ITP, WIR, NDT, DFT)', isoClauses: '8.5.1, 8.6', domain: 'OPERATIONS', otsRef: 'QC Module — ITP (HEXA-FRM-015); WIR (HEXA-FRM-014); NCR; MIR; Dimensional (HEXA-FRM-017)', rev: '01' },
  { code: 'Hexa-ISP-016', title: 'Dispatch, Delivery & Handover', isoClauses: '8.5.4, 8.5.5', domain: 'OPERATIONS', otsRef: 'Projects Module — dispatch records; delivery dockets', rev: '01' },
  { code: 'Hexa-ISP-017', title: 'Customer Satisfaction & Communication', isoClauses: '8.2, 9.1.2', domain: 'OPERATIONS', otsRef: 'BD Module — customer feedback log; client satisfaction surveys', rev: '01' },
  // ── LEVEL 3 — HSE ─────────────────────────────────────────────────────────
  { code: 'Hexa-ISP-020', title: 'Health, Safety & Environment (HSE)', isoClauses: '4.1, 7.4, 8.1, 10.2', domain: 'HSE', otsRef: 'IMS Module — Incident Log (HEXA-FRM-019); Emergency Drills (HEXA-FRM-020); Toolbox Talks (HEXA-FRM-021)', rev: '01' },
];

const DOMAIN_CFG = {
  SYSTEM:     { label: 'Level 1 — SYSTEM (company-wide governance)', headerBg: '#1A3A5C', headerText: '#fff', rowBg: '#f0f4f8' },
  OPERATIONS: { label: 'Level 2 — OPERATIONS (design → supply → fabrication → coat → QC → ship)', headerBg: '#2C5F2E', headerText: '#fff', rowBg: '#f0f5f0' },
  HSE:        { label: 'Level 3 — HSE', headerBg: '#7B2D2D', headerText: '#fff', rowBg: '#fdf0f0' },
  TECHNICAL:  { label: 'Level 4 — TECHNICAL', headerBg: '#4A3728', headerText: '#fff', rowBg: '#f5f0ec' },
};

const byDomain = (domain: IspEntry['domain']) => ISP_DOCS.filter(d => d.domain === domain);
const domains: IspEntry['domain'][] = ['SYSTEM', 'OPERATIONS', 'HSE', 'TECHNICAL'];

export function IspRegisterClient() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="flex items-start gap-3">
        <BookOpen className="h-6 w-6 text-[#1A3A5C] mt-0.5 shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-[#1A3A5C]">Appendix A — IMS Document Register</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete register of all Level 1 and Level 2 IMS documents. All documents are controlled in OTS™ IMS Module — Document Control.
            ISP structure follows three levels: System (ISP-001 to ISP-006, ISP-030), Operations (ISP-010 to ISP-017), and HSE (ISP-020).
            Domain header rows are color-coded for quick navigation.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#2c3e50] text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Doc No.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap hidden md:table-cell">ISO Clause(s)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">OTS™ Module Reference</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Rev</th>
            </tr>
          </thead>
          <tbody>
            {domains.map(domain => {
              const entries = byDomain(domain);
              if (entries.length === 0) return null;
              const cfg = DOMAIN_CFG[domain];
              return (
                <>
                  {/* Domain header row */}
                  <tr key={`header-${domain}`}>
                    <td
                      colSpan={6}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wide"
                      style={{ backgroundColor: cfg.headerBg, color: cfg.headerText }}
                    >
                      {cfg.label}
                    </td>
                  </tr>
                  {/* ISP rows */}
                  {entries.map((isp, i) => (
                    <tr
                      key={isp.code}
                      style={{ backgroundColor: i % 2 === 0 ? cfg.rowBg : '#fff' }}
                      className="border-b border-slate-100 hover:brightness-95 transition-all"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/ims/documents?search=${encodeURIComponent(isp.code)}`}
                          className="font-mono font-semibold text-xs px-2 py-0.5 rounded whitespace-nowrap hover:underline"
                          style={{ color: cfg.headerBg, backgroundColor: `${cfg.headerBg}18` }}
                        >
                          {isp.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{isp.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 hidden md:table-cell">{isp.isoClauses}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ color: cfg.headerBg, backgroundColor: `${cfg.headerBg}18` }}
                        >
                          {domain.charAt(0) + domain.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{isp.otsRef}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{isp.rev}</span>
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 text-center pb-2">
        Hexa-ISM-001 Rev.01 — All ISPs maintained in OTS™ Document Registry
      </p>
    </div>
  );
}
