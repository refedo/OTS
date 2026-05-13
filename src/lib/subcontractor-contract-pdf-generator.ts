'use client';

import { PDFReportBuilder, type LogoData, type PDFFontFamily } from './pdf-builder';

const COMPANY = 'Hexa Steel®';
const TAGLINE = 'Steel Fabrication & Erection · hexasteel.sa';
const FOOTER = 'Hexa Steel® OTS · Confidential · hexasteel.sa/ots';

async function loadSettingsForPDF(): Promise<{ logo?: LogoData; font: PDFFontFamily; companyName: string; companyTagline: string }> {
  try {
    const res = await fetch('/api/settings');
    const data = res.ok ? await res.json() : {};

    const font: PDFFontFamily = (['helvetica', 'courier', 'times'] as PDFFontFamily[]).includes(data.pdfFont)
      ? (data.pdfFont as PDFFontFamily)
      : 'helvetica';

    const companyName: string = data.companyName || COMPANY;
    const companyTagline: string = data.companyTagline || TAGLINE;

    const whitePath: string | undefined = data.logoWhite;
    const colorPath: string | undefined = data.companyLogo;
    const logoPath = whitePath || colorPath;
    if (!logoPath) return { font, companyName, companyTagline };
    const isWhite = !!whitePath;

    const imgRes = await fetch(logoPath);
    if (!imgRes.ok) return { font, companyName, companyTagline };
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

    return { logo: { base64, aspectRatio, isWhite }, font, companyName, companyTagline };
  } catch {
    return { font: 'helvetica', companyName: COMPANY, companyTagline: TAGLINE };
  }
}

export interface SCContractPDFData {
  contractNumber: string;
  name: string;
  status: string;
  contractValue: number;
  currency: string;
  retentionPercentage: number;
  scopeTypes: string[];
  scopeItems: Array<Record<string, unknown>> | null;
  paymentTerms: Array<Record<string, unknown>> | null;
  termsAndConditions: string | null;
  templateType: string | null;
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  project: { projectNumber: string; name: string };
  building: { designation: string; name: string } | null;
  supplier: { supplierCode: string; name: string; rating: string | null; scopeOfApproval: string | null };
  createdBy: { name: string };
  approvedBy: { name: string } | null;
  variations?: Array<{ variationNumber: string; description: string; amount: number; status: string }>;
  deductions?: Array<{ description: string; amount: number; deductionDate: string; status: string }>;
}

function fmtCurrency(n: number, currency: string): string {
  return new Intl.NumberFormat('en-SA-u-ca-gregory', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function generateSubcontractorContractPDF(data: SCContractPDFData): Promise<void> {
  const { logo, font, companyName, companyTagline } = await loadSettingsForPDF();

  const pdf = new PDFReportBuilder('portrait', 'orange', font);

  // Header
  pdf.addHeader(companyName, companyTagline, logo);

  // Title
  pdf.addTitle(
    'Subcontractor Contract',
    `${data.contractNumber} · ${data.project.projectNumber} — ${data.project.name}`
  );

  // Metadata box
  pdf.addMetadataBox({
    'Date': fmtDate(data.createdAt),
    'Status': data.status,
    'Currency': data.currency,
  });

  // Parties
  pdf.addSectionHeader('CONTRACTING PARTIES');
  pdf.addInfoGrid({
    'Client (Principal)': companyName,
    'Subcontractor': data.supplier.name,
    'SC Code': data.supplier.supplierCode,
    'Rating': data.supplier.rating || '—',
    'Scope of Approval': data.supplier.scopeOfApproval || '—',
    'Project': `${data.project.projectNumber} — ${data.project.name}`,
    'Building': data.building ? `${data.building.designation} — ${data.building.name}` : 'Full Project',
    'Scope': data.scopeTypes.map(s => s.replace(/_/g, ' ')).join(', '),
  }, 2);

  // Contract Details
  pdf.addSectionHeader('CONTRACT DETAILS');
  pdf.addInfoGrid({
    'Contract Value': fmtCurrency(data.contractValue, data.currency),
    'Retention': `${data.retentionPercentage}%`,
    'Net After Retention': fmtCurrency(data.contractValue * (1 - data.retentionPercentage / 100), data.currency),
    'Template': data.templateType?.replace(/_/g, ' ') || 'Custom',
    'Approved By': data.approvedBy?.name || '—',
    'Approval Date': fmtDate(data.approvedAt),
  }, 2);

  // Scope of Work table
  if (data.scopeItems && data.scopeItems.length > 0) {
    pdf.addSectionHeader('SCOPE OF WORK');
    pdf.addTable(
      ['Scope', 'Orig. Qty', 'Unit', 'Contract Qty', 'Unit', 'Unit Rate', `Subtotal (${data.currency})`],
      data.scopeItems.map(item => [
        String(item.scopeLabel ?? item.scopeType ?? ''),
        item.originalQuantity != null ? String(item.originalQuantity) : '—',
        String(item.originalUnit ?? '—'),
        item.contractQuantity != null ? String(item.contractQuantity) : '—',
        String(item.contractUnit ?? '—'),
        item.unitRate != null ? Number(item.unitRate).toFixed(2) : '—',
        item.subtotal != null ? Number(item.subtotal).toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: 2 }) : '—',
      ]),
      { alternateRows: true }
    );
  }

  // Payment Terms
  if (data.paymentTerms && data.paymentTerms.length > 0) {
    pdf.addSectionHeader('PAYMENT TERMS');
    pdf.addTable(
      ['Milestone', '%', `Amount (${data.currency})`, 'Due Date', 'Description'],
      data.paymentTerms.map(m => [
        String(m.milestone ?? ''),
        `${m.percentage ?? 0}%`,
        m.amount != null ? fmtCurrency(Number(m.amount), data.currency) : '—',
        m.dueDate ? fmtDate(String(m.dueDate)) : '—',
        String(m.description ?? '—'),
      ]),
      { alternateRows: true }
    );
  }

  // Variations
  if (data.variations && data.variations.length > 0) {
    pdf.addSectionHeader('VARIATIONS');
    pdf.addTable(
      ['Variation #', 'Description', `Amount (${data.currency})`, 'Status'],
      data.variations.map(v => [
        v.variationNumber,
        v.description,
        fmtCurrency(v.amount, data.currency),
        v.status,
      ]),
      { alternateRows: true }
    );
  }

  // Deductions
  if (data.deductions && data.deductions.length > 0) {
    pdf.addSectionHeader('DEDUCTIONS');
    pdf.addTable(
      ['Date', 'Description', `Amount (${data.currency})`, 'Status'],
      data.deductions.map(d => [
        fmtDate(d.deductionDate),
        d.description,
        fmtCurrency(d.amount, data.currency),
        d.status,
      ]),
      { alternateRows: true }
    );
  }

  // Terms & Conditions
  if (data.termsAndConditions) {
    pdf.addSectionHeader('TERMS & CONDITIONS');
    pdf.addParagraph(data.termsAndConditions, 8);
  }

  // Notes
  if (data.notes) {
    pdf.addSectionHeader('NOTES');
    pdf.addParagraph(data.notes, 8);
  }

  // Signature section
  pdf.addDivider();
  pdf.addSignatureSection([
    { label: 'Prepared By', name: data.createdBy.name, date: fmtDate(data.createdAt) },
    { label: 'Approved By (Hexa Steel)', name: data.approvedBy?.name, date: fmtDate(data.approvedAt) },
    { label: 'Subcontractor Signature', name: data.supplier.name },
  ]);

  pdf.addFooter(FOOTER, `Contract: ${data.contractNumber}`);

  // Save / open
  const filename = `SC-Contract-${data.contractNumber}.pdf`;
  pdf.save(filename);
}
