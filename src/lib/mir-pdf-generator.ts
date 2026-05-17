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

function fmtTs(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-SA-u-ca-gregory', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function val(v: string | null | undefined): string {
  return v || '—';
}

function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

// Status → { label, rgb }
function workflowStatusStyle(ws: string): { label: string; r: number; g: number; b: number } {
  switch (ws) {
    case 'Approved':  return { label: 'APPROVED',  r: 21,  g: 128, b: 61  };
    case 'Rejected':  return { label: 'REJECTED',  r: 185, g: 28,  b: 28  };
    case 'Inspected': return { label: 'INSPECTED', r: 180, g: 120, b: 0   };
    case 'Reviewed':  return { label: 'REVIEWED',  r: 30,  g: 100, b: 200 };
    default:          return { label: 'DRAFT',     r: 100, g: 100, b: 100 };
  }
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
  workflowStatus: string;
  projectNumber?: string | null;
  projectName?: string | null;
  inspectorName: string;
  inspectorId?: string | null;
  submittedAt?: string | Date | null;
  submittedByName?: string | null;
  submittedById?: string | null;
  reviewedAt?: string | Date | null;
  reviewedByName?: string | null;
  reviewedById?: string | null;
  approvedAt?: string | Date | null;
  approvedByName?: string | null;
  approvedById?: string | null;
  approvalNotes?: string | null;
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

  // Workflow status badge (inline with metadata)
  const ws = workflowStatusStyle(data.workflowStatus || 'Draft');

  // Receipt metadata (4 columns - compact row layout)
  pdf.addInfoGrid(
    {
      'MIR No.':      data.receiptNumber,
      'PO Reference': data.dolibarrPoRef,
      'Supplier':     val(data.supplierName),
      'Receipt Date': fmt(data.receiptDate),
      'Project':      data.projectNumber
        ? `${data.projectNumber}${data.projectName ? ' — ' + data.projectName : ''}`
        : '—',
      'Inspector':    data.inspectorName,
      'Status':       data.status,
      'Remarks':      val(data.remarks),
    },
    4
  );

  // Workflow status pill — rendered as a colored label row
  pdf.addWorkflowStatusBadge(ws.label, ws.r, ws.g, ws.b);

  pdf.addDivider();

  // ── Items Summary table ──────────────────────────────────────────────────
  pdf.addSectionHeader('Items Summary');

  const summaryHeaders = ['Item', 'Spec', 'Ordered', 'Received', 'Accepted', 'Rejected', 'MTC', 'Result'];
  const summaryRows = data.items.map(item => [
    item.itemName,
    val(item.specification),
    `${item.orderedQty} ${item.unit}`,
    `${item.receivedQty} ${item.unit}`,
    `${item.acceptedQty} ${item.unit}`,
    `${item.rejectedQty} ${item.unit}`,
    item.mtcAvailable ? (item.mtcNumber || 'Yes') : 'No',
    item.inspectionResult,
  ]);

  // Explicit column widths to prevent overflow in landscape (267mm available)
  pdf.addTableWithColumnWidths(
    summaryHeaders,
    summaryRows,
    [85, 20, 22, 22, 22, 22, 28, 22],
    { alternateRows: true }
  );

  // ── Detailed inspection per item ─────────────────────────────────────────
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

      const thicknessStr = item.thicknessStatus
        ? `${item.thicknessStatus}${item.thicknessMeasured ? ' — ' + item.thicknessMeasured : ''}`
        : '—';

      const detailRows: string[][] = [
        ['Surface',   val(item.surfaceCondition), 'Dimension', val(item.dimensionStatus)],
        ['Thickness', thicknessStr,               'Specs',     val(item.specsCompliance)],
        ['Heat No.',  val(item.heatNumber),        'Batch No.', val(item.batchNumber)],
        ['MTC Cert.', item.mtcAvailable ? (item.mtcNumber || 'Yes') : 'No',
         'MTC Uploaded', item.mtcAvailable ? 'Yes' : 'No'],
      ];

      pdf.addItemInspectionTable(item.itemName, item.inspectionResult, detailRows);

      if (item.inspectionResult === 'Rejected' && item.rejectionReason)
        pdf.addLabelValue('Rejection Reason', item.rejectionReason);
      if (item.surfaceNotes)    pdf.addLabelValue('Surface Notes',   item.surfaceNotes);
      if (item.dimensionNotes)  pdf.addLabelValue('Dimension Notes', item.dimensionNotes);
      if (item.thicknessNotes)  pdf.addLabelValue('Thickness Notes', item.thicknessNotes);
      if (item.specsNotes)      pdf.addLabelValue('Specs Notes',     item.specsNotes);
      if (item.remarks)         pdf.addLabelValue('Item Remarks',    item.remarks);

      pdf.addDivider();
    }
  }

  // ── Rejected items summary ───────────────────────────────────────────────
  const rejectedItems = data.items.filter(i => i.inspectionResult === 'Rejected');
  if (rejectedItems.length > 0) {
    pdf.addSectionHeader('Rejected Items Summary');

    const rejHeaders = ['Item', 'Rejected Qty', 'Surface', 'Dimension', 'Thickness', 'Specs', 'Rejection Reason'];
    const rejRows = rejectedItems.map(item => [
      item.itemName,
      `${item.rejectedQty} ${item.unit}`,
      val(item.surfaceCondition),
      val(item.dimensionStatus),
      item.thicknessStatus
        ? `${item.thicknessStatus}${item.thicknessMeasured ? ' (' + item.thicknessMeasured + ')' : ''}`
        : '—',
      val(item.specsCompliance),
      val(item.rejectionReason),
    ]);

    pdf.addTableWithColumnWidths(
      rejHeaders,
      rejRows,
      [70, 24, 28, 28, 28, 28, 55],
      { alternateRows: true }
    );
  }

  // ── Approval notes ───────────────────────────────────────────────────────
  if (data.approvalNotes) {
    pdf.addLabelValue('Approval Notes', data.approvalNotes);
  }

  // ── Signatures ───────────────────────────────────────────────────────────
  pdf.addSignatureSection([
    {
      label:     'Inspector / Receiver',
      name:      data.inspectorName,
      userId:    shortId(data.inspectorId),
      timestamp: data.submittedAt ? fmtTs(data.submittedAt) : fmt(data.receiptDate),
    },
    {
      label:     'QC Reviewer',
      name:      data.reviewedByName ?? '',
      userId:    data.reviewedById ? shortId(data.reviewedById) : undefined,
      timestamp: data.reviewedAt ? fmtTs(data.reviewedAt) : undefined,
    },
    {
      label:     'Approved By',
      name:      data.approvedByName ?? '',
      userId:    data.approvedById ? shortId(data.approvedById) : undefined,
      timestamp: data.approvedAt ? fmtTs(data.approvedAt) : undefined,
    },
  ]);

  pdf.addFooter(FOOTER_BASE, FORM_REF);

  const safeRef = data.receiptNumber.replace(/[^a-zA-Z0-9-]/g, '_');
  pdf.save(`MIR-${safeRef}.pdf`);
}
