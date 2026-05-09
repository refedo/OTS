'use client';

import { PDFReportBuilder } from './pdf-builder';

const COMPANY = 'Hexa Steel®';
const TAGLINE = 'Integrated Management System — ISO 9001:2015 / ISO 14001:2015 / ISO 45001:2018';
const FOOTER_BASE = 'Hexa Steel® OTS · Confidential IMS Document · hexasteel.sa/ots';

async function loadLogo() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return undefined;
    const data = await res.json();
    const logoPath: string | undefined = data.logoWhite || data.companyLogo;
    if (!logoPath) return undefined;
    const imgRes = await fetch(logoPath);
    if (!imgRes.ok) return undefined;
    const blob = await imgRes.blob();
    const base64 = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const aspectRatio = await new Promise<number>(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => resolve(1);
      img.src = base64;
    });
    return { base64, aspectRatio, isWhite: !!data.logoWhite };
  } catch {
    return undefined;
  }
}

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export type QaNCRPDFData = {
  ncrNumber: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  deadline: string;
  closedAt?: string | null;
  createdAt: string;
  department?: string | null;
  auditNumber?: string | null;
  auditFinding?: { findingNumber: string; type: string; clause: string; description: string } | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  caVerificationMethod?: string | null;
  caEffectivenessRating?: string | null;
  caTargetDate?: string | null;
  raisedBy: { name: string; email: string };
  assignedTo?: { name: string; email: string } | null;
  closedBy?: { name: string; email: string } | null;
  caResponsible?: { name: string } | null;
};

export async function generateQaNCRPDF(data: QaNCRPDFData): Promise<void> {
  const logo = await loadLogo();
  const pdf = new PDFReportBuilder('portrait', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  pdf.addTitle(
    'HEXA-FRM-023 — QA NCR (Non-Product Nonconformance Report)',
    `${data.ncrNumber} · ISO §10.2 · Hexa-ISP-005`
  );

  pdf.addMetadataBox({
    'NCR No.':     data.ncrNumber,
    'Title':       data.title.length > 50 ? data.title.slice(0, 47) + '…' : data.title,
    'Category':    data.category,
    'Severity':    data.severity,
    'Status':      data.status.replace('_', ' '),
    'Department':  data.department ?? '—',
    'Audit No.':   data.auditNumber ?? '—',
    'Deadline':    fmt(data.deadline),
    'Raised By':   data.raisedBy.name,
    'Assigned To': data.assignedTo?.name ?? '—',
    'Created':     fmt(data.createdAt),
    'Closed':      data.closedAt ? fmt(data.closedAt) : '—',
    'ISO Ref.':    '§10.2',
    'Procedure':   'Hexa-ISP-005',
    'Form':        'HEXA-FRM-023',
  });

  if (data.auditFinding) {
    pdf.addSectionHeader('Linked Audit Finding');
    pdf.addInfoGrid({
      'Finding No.': data.auditFinding.findingNumber,
      'Type':        data.auditFinding.type,
      'ISO Clause':  data.auditFinding.clause,
    });
    pdf.addParagraph(`Finding Description: ${data.auditFinding.description}`);
  }

  pdf.addSectionHeader('Nonconformance Description');
  pdf.addParagraph(data.description);

  if (data.rootCause) {
    pdf.addSectionHeader('Root Cause Analysis');
    pdf.addParagraph(data.rootCause);
  }
  if (data.correctiveAction) {
    pdf.addSectionHeader('Corrective Action');
    pdf.addParagraph(data.correctiveAction);
  }
  if (data.preventiveAction) {
    pdf.addSectionHeader('Preventive Action');
    pdf.addParagraph(data.preventiveAction);
  }

  if (data.caVerificationMethod || data.caEffectivenessRating || data.caResponsible || data.caTargetDate) {
    pdf.addSectionHeader('CAPA Verification (ISO §10.2)');
    pdf.addInfoGrid({
      'Verification Method':   data.caVerificationMethod ?? '—',
      'Effectiveness Rating':  data.caEffectivenessRating?.replace(/_/g, ' ') ?? 'Not rated',
      'CA Responsible':        data.caResponsible?.name ?? '—',
      'CA Target Date':        fmt(data.caTargetDate),
    });
  }

  pdf.addSectionHeader('Audit Trail');
  pdf.addTable(
    ['Event', 'Date', 'Person', 'Notes'],
    [
      ['NCR Opened (OPEN)', fmt(data.createdAt), data.raisedBy.name, '—'],
      ...(data.status === 'IN_PROGRESS' || data.status === 'CLOSED'
        ? [['Status → IN PROGRESS', '—', data.assignedTo?.name ?? '—', '—'] as string[]]
        : []),
      ...(data.status === 'CLOSED' && data.closedAt
        ? [['NCR Closed (CLOSED)', fmt(data.closedAt), data.closedBy?.name ?? '—', '—'] as string[]]
        : []),
    ],
    { alternateRows: true }
  );

  pdf.addSignatureSection([
    { label: 'Raised By', name: data.raisedBy.name, date: fmt(data.createdAt) },
    { label: 'IMS Manager / QA', date: '' },
    { label: data.closedBy ? `Closed By: ${data.closedBy.name}` : 'Closed By', date: data.closedAt ? fmt(data.closedAt) : '' },
  ]);

  pdf.addFooter(
    `HEXA-FRM-023 · Procedure: Hexa-ISP-005 · ISO §10.2 · QA NCR · ${FOOTER_BASE}`,
    'HEXA-FRM-023 · Hexa-ISP-005'
  );

  pdf.save(`QA-NCR-${data.ncrNumber}.pdf`);
}
