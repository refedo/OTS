'use client';

import { PDFReportBuilder, type LogoData, type PDFFontFamily } from './pdf-builder';

const COMPANY = 'Hexa Steel®';
const TAGLINE = 'Integrated Management System — ISO 9001:2015 / ISO 14001:2015 / ISO 45001:2018';
const FOOTER = 'Hexa Steel® OTS · Confidential IMS Document · hexasteel.sa/ots';

async function loadSettingsForPDF(): Promise<{ logo?: LogoData; font: PDFFontFamily }> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return { font: 'helvetica' };
    const data = await res.json();

    const font: PDFFontFamily = (['helvetica', 'courier', 'times'] as PDFFontFamily[]).includes(data.pdfFont)
      ? (data.pdfFont as PDFFontFamily)
      : 'helvetica';

    const whitePath: string | undefined = data.logoWhite;
    const colorPath: string | undefined = data.companyLogo;
    const logoPath = whitePath || colorPath;
    if (!logoPath) return { font };
    const isWhite = !!whitePath;

    const imgRes = await fetch(logoPath);
    if (!imgRes.ok) return { font };
    const blob = await imgRes.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const aspectRatio = await new Promise<number>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => resolve(1);
      img.src = base64;
    });

    return { logo: { base64, aspectRatio, isWhite }, font };
  } catch {
    return { font: 'helvetica' };
  }
}

export type AuditScheduleAudit = {
  auditNumber: string;
  scope: string;
  processArea: string | null;
  riskLevel: string | null;
  isoClausesInScope: string[] | null;
  scheduledDate: string;
  actualDate: string | null;
  auditor: string | null;
  auditee: string | null;
  status: string;
  // FRM-004 approval fields
  auditorIndependenceConfirmed: boolean;
  approvedByImsManagerName: string | null;
  approvedByImsManagerDate: string | null;
  approvedByImsManagerSigned: boolean;
  approvedByTopMgmtName: string | null;
  approvedByTopMgmtDate: string | null;
  approvedByTopMgmtSigned: boolean;
  findingsCount: number;
};

export type AuditSchedulePDFData = {
  planNumber: string;
  year: number;
  auditType: string;
  status: string;
  audits: AuditScheduleAudit[];
};

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    OPEN: 'Open', CLOSED: 'Closed', IN_PROGRESS: 'In Progress',
    PLANNED: 'Planned', COMPLETED: 'Completed', SCHEDULED: 'Scheduled',
    DRAFT: 'Draft', APPROVED: 'Approved',
  };
  return map[s] ?? s.replace(/_/g, ' ');
}

function riskColor(level: string | null): string {
  if (!level) return '';
  if (level === 'High') return 'High';
  if (level === 'Medium') return 'Medium';
  return 'Low';
}

export async function generateAuditSchedulePDF(data: AuditSchedulePDFData): Promise<void> {
  const { logo, font } = await loadSettingsForPDF();
  const pdf = new PDFReportBuilder('landscape', 'steel', font);

  // ── Header ──────────────────────────────────────────────────────────────────
  pdf.addHeader(COMPANY, TAGLINE, logo);

  pdf.addTitle(
    'HEXA-FRM-004 — Internal Audit Schedule',
    `${data.planNumber} · ${data.auditType} Audit Programme · ${data.year}`
  );

  pdf.addMetadataBox({
    'Plan No.': data.planNumber,
    Year: String(data.year),
    Type: data.auditType,
    Status: statusLabel(data.status),
    'Total Audits': String(data.audits.length),
    Issued: fmt(new Date().toISOString()),
    'ISO Ref.': '§9.2',
    Procedure: 'Hexa-ISP-004',
  });

  // ── Programme Overview ────────────────────────────────────────────────────
  pdf.addSectionHeader('§9.2.1 — Annual Audit Programme');

  if (data.audits.length === 0) {
    pdf.addParagraph('No audits have been scheduled under this plan yet.');
  } else {
    pdf.addTable(
      [
        'Audit No.',
        'Process / Scope',
        'Area',
        'Risk',
        'ISO Clauses',
        'Scheduled Date',
        'Actual Date',
        'Auditor',
        'Auditee',
        'Status',
        'Findings',
      ],
      data.audits.map((a) => [
        a.auditNumber,
        a.scope.length > 30 ? a.scope.slice(0, 27) + '…' : a.scope,
        a.processArea ?? '—',
        riskColor(a.riskLevel),
        a.isoClausesInScope?.join(', ') ?? '—',
        fmt(a.scheduledDate),
        fmt(a.actualDate),
        a.auditor ?? '—',
        a.auditee ?? '—',
        statusLabel(a.status),
        String(a.findingsCount),
      ]),
      { alternateRows: true }
    );
  }

  // ── Status Summary ────────────────────────────────────────────────────────
  const planned = data.audits.filter(a => a.status === 'PLANNED' || a.status === 'SCHEDULED').length;
  const inProg  = data.audits.filter(a => a.status === 'IN_PROGRESS').length;
  const done    = data.audits.filter(a => a.status === 'COMPLETED').length;
  const highRisk = data.audits.filter(a => a.riskLevel === 'High').length;

  pdf.addSectionHeader('Programme Summary');
  pdf.addInfoGrid(
    {
      'Total Audits': data.audits.length,
      'Planned / Scheduled': planned,
      'In Progress': inProg,
      Completed: done,
      'High Risk Audits': highRisk,
      'Independence Confirmed': data.audits.filter(a => a.auditorIndependenceConfirmed).length,
    },
    3
  );

  // ── ISO Clause Coverage ───────────────────────────────────────────────────
  const allClauses = data.audits.flatMap(a => a.isoClausesInScope ?? []);
  const uniqueClauses = [...new Set(allClauses)].sort();
  if (uniqueClauses.length > 0) {
    pdf.addSectionHeader('ISO Clause Coverage');
    pdf.addParagraph(`Clauses covered in this programme: ${uniqueClauses.join(' · ')}`);
  }

  // ── Approval Section ──────────────────────────────────────────────────────
  pdf.addSectionHeader('HEXA-FRM-004 — Schedule Approvals');

  // Use the most recent audit's approval data if available
  const lastApproved = [...data.audits]
    .reverse()
    .find(a => a.approvedByImsManagerSigned || a.approvedByTopMgmtSigned);

  const imsMgrName = lastApproved?.approvedByImsManagerName ?? '';
  const imsMgrDate = lastApproved?.approvedByImsManagerDate;
  const topMgmtName = lastApproved?.approvedByTopMgmtName ?? '';
  const topMgmtDate = lastApproved?.approvedByTopMgmtDate;

  pdf.addSignatureSection([
    { label: 'Prepared By (Lead Auditor)', date: fmt(new Date().toISOString()) },
    {
      label: `IMS Manager${imsMgrName ? ' ✓' : ''}`,
      name: imsMgrName || undefined,
      date: imsMgrDate ? fmt(imsMgrDate) : '',
    },
    {
      label: `Top Management${topMgmtName ? ' ✓' : ''}`,
      name: topMgmtName || undefined,
      date: topMgmtDate ? fmt(topMgmtDate) : '',
    },
  ]);

  pdf.addFooter(FOOTER, 'HEXA-FRM-004 · Procedure: Hexa-ISP-004 · ISO 9001:2015 §9.2');
  pdf.save(`${data.planNumber}-FRM-004-Audit-Schedule.pdf`);
}
