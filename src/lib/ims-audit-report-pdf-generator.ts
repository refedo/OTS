'use client';

import { PDFReportBuilder, type LogoData } from './pdf-builder';

const COMPANY = 'Hexa Steel®';
const TAGLINE = 'Integrated Management System — ISO 9001:2015 / ISO 14001:2015 / ISO 45001:2018';
const FOOTER = 'Hexa Steel® OTS · Confidential IMS Document · hexasteel.sa/ots';

async function loadLogoForPDF(): Promise<LogoData | undefined> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return undefined;
    const data = await res.json();
    const whitePath: string | undefined = data.logoWhite;
    const colorPath: string | undefined = data.companyLogo;
    const logoPath = whitePath || colorPath;
    if (!logoPath) return undefined;
    const isWhite = !!whitePath;

    const imgRes = await fetch(logoPath);
    if (!imgRes.ok) return undefined;
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

    return { base64, aspectRatio, isWhite };
  } catch {
    return undefined;
  }
}

export type InternalAuditReportPDFData = {
  auditNumber: string;
  auditDate: string;
  department: string;
  scope: string;
  auditor: string;
  auditee: string;
  standard: string;
  findings: {
    findingNumber: string;
    type: string;
    clause: string;
    description: string;
    evidence?: string | null;
    correctiveAction?: string | null;
    targetDate?: string | null;
    status: string;
  }[];
  strengths?: string[];
  opportunities?: string[];
  conclusion?: string;
  recommendations?: string;
};

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

export async function generateInternalAuditReportPDF(data: InternalAuditReportPDFData): Promise<Blob> {
  const logo = await loadLogoForPDF();
  const pdf = new PDFReportBuilder('portrait', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  
  pdf.addTitle(
    'Internal Audit Report',
    'HEXA-FRM-005 · Procedure: Hexa-ISP-004 · ISO 9001:2015 §9.2'
  );

  pdf.addMetadataBox({
    'Audit No.': data.auditNumber,
    'Date': fmt(data.auditDate),
    'Standard': data.standard,
    'Status': 'Completed',
  });

  pdf.addSectionHeader('Audit Information');
  pdf.addInfoGrid({
    'Department/Process': data.department,
    'Audit Scope': data.scope,
    'Lead Auditor': data.auditor,
    'Auditee': data.auditee,
    'Audit Date': fmt(data.auditDate),
    'Standard': data.standard,
  }, 2);

  // Findings Summary
  const ncCount = data.findings.filter(f => f.type === 'NC').length;
  const obsCount = data.findings.filter(f => f.type === 'OBS').length;
  const oppCount = data.findings.filter(f => f.type === 'OFI').length;

  pdf.addSectionHeader('Findings Summary');
  pdf.addInfoGrid({
    'Non-Conformities (NC)': ncCount.toString(),
    'Observations (OBS)': obsCount.toString(),
    'Opportunities for Improvement (OFI)': oppCount.toString(),
    'Total Findings': data.findings.length.toString(),
  }, 2);

  // Detailed Findings
  if (data.findings.length > 0) {
    pdf.addSectionHeader('Detailed Findings');
    
    const findingsData = data.findings.map(f => [
      f.findingNumber,
      f.type,
      f.clause || '—',
      f.description,
      f.status,
    ]);

    pdf.addTable(
      ['Finding #', 'Type', 'Clause', 'Description', 'Status'],
      findingsData,
      {
        alternateRows: true,
      }
    );

    // Corrective Actions
    const findingsWithCA = data.findings.filter(f => f.correctiveAction);
    if (findingsWithCA.length > 0) {
      pdf.addSectionHeader('Corrective Actions');
      
      findingsWithCA.forEach(f => {
        pdf.addParagraph(`**${f.findingNumber}** (${f.type}): ${f.correctiveAction}`, 8);
        if (f.targetDate) {
          pdf.addParagraph(`Target Date: ${fmt(f.targetDate)}`, 7);
        }
      });
    }
  } else {
    pdf.addParagraph('No findings identified during this audit. All processes were found to be in conformance with the applicable standards and procedures.');
  }

  // Strengths
  if (data.strengths && data.strengths.length > 0) {
    pdf.addSectionHeader('Strengths Identified');
    data.strengths.forEach(strength => {
      pdf.addParagraph(`• ${strength}`, 9);
    });
  }

  // Opportunities
  if (data.opportunities && data.opportunities.length > 0) {
    pdf.addSectionHeader('Opportunities for Improvement');
    data.opportunities.forEach(opp => {
      pdf.addParagraph(`• ${opp}`, 9);
    });
  }

  // Conclusion
  pdf.addSectionHeader('Audit Conclusion');
  if (data.conclusion) {
    pdf.addParagraph(data.conclusion);
  } else {
    const defaultConclusion = ncCount === 0 
      ? 'The audit confirmed that the audited processes are effectively implemented and maintained in accordance with the applicable standards. The management system demonstrates conformity and effectiveness.'
      : `The audit identified ${ncCount} non-conformity(ies) that require corrective action. The auditee is required to submit corrective action plans within 10 working days. Follow-up audit will be conducted to verify implementation.`;
    pdf.addParagraph(defaultConclusion);
  }

  // Recommendations
  if (data.recommendations) {
    pdf.addSectionHeader('Recommendations');
    pdf.addParagraph(data.recommendations);
  }

  // Compliance Statement
  pdf.addSectionHeader('ISO 9001:2015 Compliance');
  pdf.addParagraph(
    'This internal audit was conducted in accordance with ISO 9001:2015 clause 9.2 requirements. ' +
    'The audit program ensures that all processes are audited at planned intervals, taking into account ' +
    'the importance of the processes concerned, changes affecting the organization, and the results of previous audits.'
  );

  pdf.addSignatureSection([
    { label: 'Lead Auditor', name: data.auditor, date: fmt(data.auditDate) },
    { label: 'Auditee', name: data.auditee },
    { label: 'Management Representative', name: 'IMS Manager' },
  ]);

  pdf.addFooter(FOOTER, 'HEXA-FRM-005 · Hexa-ISP-004 · ISO §9.2');

  return pdf.getBlob();
}
