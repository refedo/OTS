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

export type InternalAuditReportPDFData = {
  // Identifiers
  auditNumber: string;
  planNumber: string;          // Cross-reference to HEXA-FRM-004

  // Audit info
  auditDate: string;
  department: string;
  scope: string;
  auditor: string;
  auditee: string;
  standard: string;
  processArea: string | null;
  riskLevel: string | null;
  isoClausesInScope: string[] | null;
  auditorIndependenceConfirmed: boolean;

  // FRM-005 report fields
  reportExecutiveSummary: string | null;
  reportAuditMethod: string[] | null;
  reportPositiveFindings: string | null;
  reportConclusion: string | null;
  reportRecommendation: string | null;

  // Sign-offs
  reportLeadAuditorName: string | null;
  reportLeadAuditorDate: string | null;
  reportLeadAuditorSigned: boolean;
  reportImsMgrName: string | null;
  reportImsMgrDate: string | null;
  reportImsMgrSigned: boolean;

  // Findings
  findings: {
    findingNumber: string;
    type: string;
    clause: string;
    description: string;
    evidence: string | null;
    correctiveAction: string | null;
    targetDate: string | null;
    status: string;
  }[];

  // Optional enrichment
  strengths?: string[];
  opportunities?: string[];
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
    PLANNED: 'Planned', COMPLETED: 'Completed',
    NC: 'Non-Conformance', OFI: 'OFI', Observation: 'Observation', Conforming: 'Conforming',
  };
  return map[s] ?? s.replace(/_/g, ' ');
}

export async function generateInternalAuditReportPDF(
  data: InternalAuditReportPDFData
): Promise<Blob> {
  const { logo, font } = await loadSettingsForPDF();
  const pdf = new PDFReportBuilder('portrait', 'steel', font);

  // ── Header ──────────────────────────────────────────────────────────────────
  pdf.addHeader(COMPANY, TAGLINE, logo);

  pdf.addTitle(
    'HEXA-FRM-005 — Internal Audit Report',
    `${data.auditNumber} · Ref. Plan: ${data.planNumber} · ISO 9001:2015 §9.2`
  );

  pdf.addMetadataBox({
    'Audit No.': data.auditNumber,
    'Plan Ref.': data.planNumber,
    Date: fmt(data.auditDate),
    Standard: data.standard,
    'ISO Ref.': '§9.2',
    Procedure: 'Hexa-ISP-004',
  });

  // ── Section 1: Audit Information ─────────────────────────────────────────
  pdf.addSectionHeader('1 — Audit Information (§9.2.2)');
  pdf.addInfoGrid(
    {
      'Department / Process': data.department,
      'Audit Scope': data.scope,
      'Lead Auditor': data.auditor,
      Auditee: data.auditee,
      'Audit Date': fmt(data.auditDate),
      Standard: data.standard,
      'Process Area': data.processArea ?? '—',
      'Risk Level': data.riskLevel ?? '—',
      'Auditor Independence': data.auditorIndependenceConfirmed ? 'Confirmed ✓' : 'Not Confirmed',
      'ISO Clauses in Scope': data.isoClausesInScope?.join(', ') ?? '—',
    },
    2
  );

  // ── Section 2: Audit Method ───────────────────────────────────────────────
  if (data.reportAuditMethod && data.reportAuditMethod.length > 0) {
    pdf.addSectionHeader('2 — Audit Method');
    pdf.addParagraph(data.reportAuditMethod.join(' · '));
  }

  // ── Section 3: Executive Summary ─────────────────────────────────────────
  if (data.reportExecutiveSummary) {
    pdf.addSectionHeader('3 — Executive Summary');
    pdf.addParagraph(data.reportExecutiveSummary);
  }

  // ── Section 4: Findings Summary ──────────────────────────────────────────
  const ncCount  = data.findings.filter(f => f.type === 'NC').length;
  const obsCount = data.findings.filter(f => f.type === 'Observation').length;
  const ofiCount = data.findings.filter(f => f.type === 'OFI').length;
  const confCount = data.findings.filter(f => f.type === 'Conforming').length;

  pdf.addSectionHeader('4 — Findings Summary');
  pdf.addInfoGrid(
    {
      'Non-Conformities (NC)': ncCount,
      'Observations': obsCount,
      'Opportunities for Improvement (OFI)': ofiCount,
      'Conforming': confCount,
      'Total Findings': data.findings.length,
      'Open Items': data.findings.filter(f => f.status === 'OPEN' || f.status === 'IN_PROGRESS').length,
    },
    3
  );

  // ── Section 5: Detailed Findings ─────────────────────────────────────────
  if (data.findings.length > 0) {
    pdf.addSectionHeader('5 — Detailed Findings Register');

    pdf.addTable(
      ['Finding #', 'Type', 'Clause', 'Description', 'Evidence', 'Status'],
      data.findings.map((f) => [
        f.findingNumber,
        f.type,
        f.clause || '—',
        f.description.length > 55 ? f.description.slice(0, 52) + '…' : f.description,
        (f.evidence ?? '—').length > 30 ? (f.evidence ?? '').slice(0, 27) + '…' : (f.evidence ?? '—'),
        statusLabel(f.status),
      ]),
      { alternateRows: true }
    );

    // NC / OFI detail blocks
    const actionRequired = data.findings.filter(f => f.type === 'NC' || f.type === 'OFI');
    if (actionRequired.length > 0) {
      pdf.addSectionHeader('5a — Non-Conformities & OFIs — Detail');
      for (const f of actionRequired) {
        pdf.addInfoGrid(
          {
            'Finding No.': f.findingNumber,
            Type: f.type,
            Clause: f.clause || '—',
            Status: statusLabel(f.status),
            'Target Date': fmt(f.targetDate),
          },
          3
        );
        pdf.addLabelValue('Description', f.description);
        if (f.evidence) pdf.addLabelValue('Evidence', f.evidence);
        if (f.correctiveAction) pdf.addLabelValue('Corrective Action', f.correctiveAction);
        pdf.addDivider();
      }
    }
  } else {
    pdf.addSectionHeader('5 — Findings');
    pdf.addParagraph(
      'No findings were identified during this audit. All processes were found to be in ' +
      'conformance with the applicable standards, procedures, and planned arrangements.'
    );
  }

  // ── Section 6: Positive Findings / Strengths ─────────────────────────────
  const hasPositive = data.reportPositiveFindings || (data.strengths && data.strengths.length > 0);
  if (hasPositive) {
    pdf.addSectionHeader('6 — Positive Findings & Strengths');
    if (data.reportPositiveFindings) pdf.addParagraph(data.reportPositiveFindings);
    if (data.strengths) data.strengths.forEach(s => pdf.addParagraph(`• ${s}`));
  }

  // ── Section 7: Opportunities for Improvement ─────────────────────────────
  if (data.opportunities && data.opportunities.length > 0) {
    pdf.addSectionHeader('7 — Opportunities for Improvement');
    data.opportunities.forEach(o => pdf.addParagraph(`• ${o}`));
  }

  // ── Section 8: Audit Conclusion ──────────────────────────────────────────
  pdf.addSectionHeader('8 — Audit Conclusion (§9.2.2 f)');
  if (data.reportConclusion) {
    pdf.addParagraph(data.reportConclusion);
  } else {
    const defaultConclusion = ncCount === 0
      ? 'The audit confirmed that the audited processes are effectively implemented and ' +
        'maintained in accordance with the applicable management system standards. ' +
        'The system demonstrates conformity and effectiveness.'
      : `The audit identified ${ncCount} non-conformity(ies) and ${ofiCount} opportunity(ies) for improvement. ` +
        'The auditee is required to submit a corrective action plan within 10 working days of receiving this report. ' +
        'A follow-up audit will be conducted to verify effective implementation and closure.';
    pdf.addParagraph(defaultConclusion);
  }

  // ── Section 9: Recommendations ───────────────────────────────────────────
  if (data.reportRecommendation) {
    pdf.addSectionHeader('9 — Recommendations');
    pdf.addParagraph(data.reportRecommendation);
  }

  // ── Section 10: ISO Compliance Statement ─────────────────────────────────
  pdf.addSectionHeader('10 — ISO 9001:2015 §9.2 Compliance Statement');
  pdf.addParagraph(
    'This internal audit was conducted in accordance with the documented audit programme ' +
    '(HEXA-FRM-004) and Procedure Hexa-ISP-004. The audit programme considers the importance ' +
    'of the processes concerned, changes affecting the organization, and the results of ' +
    'previous audits. Audit results have been communicated to relevant management.'
  );

  // ── Signatures ───────────────────────────────────────────────────────────
  pdf.addSignatureSection([
    {
      label: `Lead Auditor${data.reportLeadAuditorSigned ? ' ✓ Signed' : ''}`,
      name: data.reportLeadAuditorName || data.auditor || undefined,
      date: data.reportLeadAuditorDate ? fmt(data.reportLeadAuditorDate) : fmt(data.auditDate),
    },
    {
      label: 'Auditee / Process Owner',
      name: data.auditee || undefined,
    },
    {
      label: `IMS Manager${data.reportImsMgrSigned ? ' ✓ Signed' : ''}`,
      name: data.reportImsMgrName || undefined,
      date: data.reportImsMgrDate ? fmt(data.reportImsMgrDate) : '',
    },
  ]);

  pdf.addFooter(FOOTER, 'HEXA-FRM-005 · Hexa-ISP-004 · ISO 9001:2015 §9.2');

  return pdf.getBlob();
}
