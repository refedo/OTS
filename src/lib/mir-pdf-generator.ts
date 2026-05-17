'use client';

import { PDFReportBuilder } from './pdf-builder';

const COMPANY = 'Hexa Steel®';
const TAGLINE = 'Quality Control — Material Inspection Receipt';
const FOOTER_BASE = 'Hexa Steel® OTS · Confidential QC Document · hexasteel.sa/ots';
const FORM_REF = 'HEXA-FRM-016 · Procedure: Hexa-ISP-011 · ISO 9001 §8.4';

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

function fmt(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function val(v: string | null | undefined): string {
  return v || '—';
}

export type MIRItemPDFData = {
  id: string;
  itemName: string;
  specification?: string | null;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit: string;
  surfaceCondition?: string | null;
  surfaceNotes?: string | null;
  dimensionStatus?: string | null;
  dimensionNotes?: string | null;
  thicknessStatus?: string | null;
  thicknessMeasured?: string | null;
  thicknessNotes?: string | null;
  specsCompliance?: string | null;
  specsNotes?: string | null;
  mtcAvailable: boolean;
  mtcNumber?: string | null;
  heatNumber?: string | null;
  batchNumber?: string | null;
  inspectionResult: string;
  rejectionReason?: string | null;
  remarks?: string | null;
};

export type MIRPDFData = {
  receiptNumber: string;
  dolibarrPoRef: string;
  supplierName?: string | null;
  receiptDate: string | Date;
  status: string;
  projectNumber?: string | null;
  projectName?: string | null;
  inspectorName: string;
  remarks?: string | null;
  items: MIRItemPDFData[];
};

export async function generateMIRPDF(data: MIRPDFData): Promise<void> {
  const logo = await loadLogo();
  const pdf = new PDFReportBuilder('landscape', 'steel');

  pdf.addHeader(COMPANY, TAGLINE, logo);
  pdf.addTitle(
    'Material Inspection Receipt (MIR)',
    `${data.receiptNumber} · ${FORM_REF}`
  );

  // Receipt metadata
  pdf.addInfoGrid(
    {
      'MIR No.': data.receiptNumber,
      'PO Reference': data.dolibarrPoRef,
      'Supplier': val(data.supplierName),
      'Receipt Date': fmt(data.receiptDate),
      'Project': data.projectNumber ? `${data.projectNumber}${data.projectName ? ' — ' + data.projectName : ''}` : '—',
      'Inspector': data.inspectorName,
      'Status': data.status,
      'Remarks': val(data.remarks),
    },
    4
  );

  pdf.addDivider();

  // Items summary table
  pdf.addSectionHeader('Items Summary');

  const summaryHeaders = ['Item', 'Spec', 'Ordered', 'Received', 'Accepted', 'Rejected', 'MTC', 'Result'];
  const summaryRows = data.items.map(item => [
    item.itemName.length > 35 ? item.itemName.slice(0, 33) + '…' : item.itemName,
    val(item.specification),
    `${item.orderedQty} ${item.unit}`,
    `${item.receivedQty} ${item.unit}`,
    `${item.acceptedQty} ${item.unit}`,
    `${item.rejectedQty} ${item.unit}`,
    item.mtcAvailable ? (item.mtcNumber || 'Yes') : 'No',
    item.inspectionResult,
  ]);

  pdf.addTable(summaryHeaders, summaryRows, { alternateRows: true });

  // Detailed inspection per item
  const hasAnyDetail = data.items.some(
    i =>
      i.surfaceCondition ||
      i.dimensionStatus ||
      i.thicknessStatus ||
      i.specsCompliance ||
      i.heatNumber ||
      i.batchNumber ||
      i.inspectionResult === 'Rejected'
  );

  if (hasAnyDetail) {
    pdf.addSectionHeader('Inspection Details');

    for (const item of data.items) {
      const hasDetail =
        item.surfaceCondition ||
        item.dimensionStatus ||
        item.thicknessStatus ||
        item.specsCompliance ||
        item.heatNumber ||
        item.batchNumber ||
        item.inspectionResult === 'Rejected';

      if (!hasDetail) continue;

      pdf.addInfoGrid(
        {
          'Item': item.itemName.length > 50 ? item.itemName.slice(0, 48) + '…' : item.itemName,
          'Result': item.inspectionResult,
          'Surface': val(item.surfaceCondition),
          'Dimension': val(item.dimensionStatus),
          'Thickness': item.thicknessStatus ? `${item.thicknessStatus}${item.thicknessMeasured ? ' (' + item.thicknessMeasured + ')' : ''}` : '—',
          'Specs': val(item.specsCompliance),
          'Heat No.': val(item.heatNumber),
          'Batch No.': val(item.batchNumber),
          'MTC': item.mtcAvailable ? (item.mtcNumber || 'Yes') : 'No',
          'MTC Uploaded': item.mtcAvailable ? 'Yes' : 'No',
        },
        5
      );

      if (item.inspectionResult === 'Rejected' && item.rejectionReason) {
        pdf.addLabelValue('Rejection Reason', item.rejectionReason);
      }

      if (item.surfaceNotes) pdf.addLabelValue('Surface Notes', item.surfaceNotes);
      if (item.dimensionNotes) pdf.addLabelValue('Dimension Notes', item.dimensionNotes);
      if (item.thicknessNotes) pdf.addLabelValue('Thickness Notes', item.thicknessNotes);
      if (item.specsNotes) pdf.addLabelValue('Specs Notes', item.specsNotes);
      if (item.remarks) pdf.addLabelValue('Item Remarks', item.remarks);

      pdf.addDivider();
    }
  }

  // Rejected items summary
  const rejectedItems = data.items.filter(i => i.inspectionResult === 'Rejected');
  if (rejectedItems.length > 0) {
    pdf.addSectionHeader('Rejected Items Summary');

    const rejHeaders = ['Item', 'Rejected Qty', 'Surface', 'Dimension', 'Thickness', 'Specs', 'Rejection Reason'];
    const rejRows = rejectedItems.map(item => [
      item.itemName.length > 30 ? item.itemName.slice(0, 28) + '…' : item.itemName,
      `${item.rejectedQty} ${item.unit}`,
      val(item.surfaceCondition),
      val(item.dimensionStatus),
      item.thicknessStatus ? `${item.thicknessStatus}${item.thicknessMeasured ? ' (' + item.thicknessMeasured + ')' : ''}` : '—',
      val(item.specsCompliance),
      val(item.rejectionReason),
    ]);

    pdf.addTable(rejHeaders, rejRows, { alternateRows: true });
  }

  // Signature section
  pdf.addSignatureSection([
    { label: 'Inspector / Receiver', name: data.inspectorName, date: fmt(data.receiptDate) },
    { label: 'QC Review', name: '', date: '' },
    { label: 'Approved By', name: '', date: '' },
  ]);

  pdf.addFooter(FOOTER_BASE, FORM_REF);

  const safeRef = data.receiptNumber.replace(/[^a-zA-Z0-9-]/g, '_');
  pdf.save(`MIR-${safeRef}.pdf`);
}
