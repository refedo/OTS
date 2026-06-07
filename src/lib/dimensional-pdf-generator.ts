'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type DimReportItem = {
  sn: number;
  pid: string;
  assemblyMark: string;
  revision: string;
  profile: string;
  designation: string;
  checkedQty: number;
  dwgLengthMm: number | null;
  actualLengthMm: number | null;
  differenceMm: number | null;
  toleranceMm: number;
  finalResult: string;
  totalQty: number;
};

export type DimReportMeta = {
  date: string;
  reportNumber: string;
  projectNumber: string;
  buildingName: string;
  projectName: string;
  preparedBy: string;
  checkedBy: string;
  inspectorName: string;
  rfiNumber: string;
  qtyBuilding: string;
  inspectionDate: string;
  inspectionTime: string;
};

// Brand colours
const NAVY  = [22, 50, 92]  as const;   // #16325C  — header bar
const STEEL = [62, 100, 140] as const;  // #3E648C  — sub-bar
const GOLD  = [180, 140, 50] as const;  // accent
const WHITE = [255, 255, 255] as const;
const LIGHT_GREY = [245, 246, 248] as const;
const DARK_TEXT  = [30, 35, 45]   as const;
const MID_TEXT   = [80, 90, 105]  as const;

export function generateDimensionalReport(
  meta: DimReportMeta,
  items: DimReportItem[]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 297 mm
  const H = doc.internal.pageSize.getHeight();  // 210 mm
  const M = 8;   // margin

  // ── Top header band ──────────────────────────────────────────────────────────
  // Navy full-width bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 18, 'F');

  // Logo area — white left box
  doc.setFillColor(...WHITE);
  doc.rect(M, 2, 42, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('HEXA STEEL®', M + 2, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...STEEL);
  doc.text('THRIVE DIFFERENT', M + 2, 13.5);

  // Divider between logo and title
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(M + 44, 2, M + 44, 16);

  // Report title centred in navy bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text('FINAL DIMENSION & VISUAL INSPECTION REPORT', W / 2, 10.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 200, 220);
  doc.text('Form: HEXA-FRM-021  ·  Procedure: Hexa-ISP-013  ·  ISO §8.5.1, §8.6', W / 2, 15.5, { align: 'center' });

  // Gold bottom accent line on header
  doc.setFillColor(...GOLD);
  doc.rect(0, 17.5, W, 0.8, 'F');

  // ── Meta section ─────────────────────────────────────────────────────────────
  const metaTop = 20;
  const metaH   = 32;

  // Light grey background
  doc.setFillColor(...LIGHT_GREY);
  doc.roundedRect(M, metaTop, W - M * 2, metaH, 1.5, 1.5, 'F');
  doc.setDrawColor(210, 215, 220);
  doc.setLineWidth(0.2);
  doc.roundedRect(M, metaTop, W - M * 2, metaH, 1.5, 1.5, 'S');

  // Left column meta
  const lx = M + 4;
  const lv = M + 36;
  const lineH = 5.2;

  const leftMeta: [string, string][] = [
    ['Date',         meta.date],
    ['Report No.',   meta.reportNumber],
    ['Project No.',  meta.projectNumber],
    ['Project Name', meta.projectName],
    ['Building',     meta.buildingName],
    ['Prepared By',  meta.preparedBy],
  ];

  leftMeta.forEach(([label, value], i) => {
    const y = metaTop + 5 + i * lineH;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MID_TEXT);
    doc.text(label, lx, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    doc.text(value || '—', lv, y);
  });

  // Vertical divider
  const divX = M + (W - M * 2) * 0.45;
  doc.setDrawColor(210, 215, 220);
  doc.setLineWidth(0.3);
  doc.line(divX, metaTop + 3, divX, metaTop + metaH - 3);

  // Right column — info boxes
  const bRight = W - M - 4;
  const bW     = 68;
  const bH     = 9;
  const bGap   = 2;
  const bLeft  = bRight - bW;

  // Box: Checked By  (steel blue)
  const b0Y = metaTop + 3;
  doc.setFillColor(...STEEL);
  doc.roundedRect(bLeft, b0Y, bW, bH, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...WHITE);
  doc.text('CHECKED BY', bLeft + bW / 2, b0Y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(meta.checkedBy || '—', bLeft + bW / 2, b0Y + 7.5, { align: 'center' });

  // Box: Inspector  (navy)
  const b1Y = b0Y + bH + bGap;
  doc.setFillColor(...NAVY);
  doc.roundedRect(bLeft, b1Y, bW, bH, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 200, 220);
  doc.text('HEXA QC INSPECTOR', bLeft + bW / 2, b1Y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(meta.inspectorName || '—', bLeft + bW / 2, b1Y + 7.5, { align: 'center' });

  // Box: RFI  (gold)
  const b2Y = b1Y + bH + bGap;
  doc.setFillColor(...GOLD);
  doc.roundedRect(bLeft, b2Y, bW, bH, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(60, 40, 0);
  doc.text(`RFI NO: ${meta.rfiNumber}`, bLeft + bW / 2, b2Y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`QTY / Building: ${meta.qtyBuilding} Pcs`, bLeft + bW / 2, b2Y + 7.5, { align: 'center' });

  // Box: Inspection Date  (light + border)
  const b3Y = b2Y + bH + bGap;
  doc.setFillColor(240, 248, 255);
  doc.roundedRect(bLeft, b3Y, bW, bH, 1, 1, 'F');
  doc.setDrawColor(...STEEL);
  doc.setLineWidth(0.3);
  doc.roundedRect(bLeft, b3Y, bW, bH, 1, 1, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...STEEL);
  doc.text('INSPECTION DATE & TIME', bLeft + bW / 2, b3Y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_TEXT);
  doc.text(`${meta.inspectionDate}   ${meta.inspectionTime}`, bLeft + bW / 2, b3Y + 7.5, { align: 'center' });

  // ── Data table ───────────────────────────────────────────────────────────────
  const tableY = metaTop + metaH + 3;

  const headers = [
    'SN', 'Assembly\nMark', 'Rev.', 'Profile', 'Designation',
    'Chk\nQty', 'DWG Length\n(mm)', 'Actual Length\n(mm)',
    'Diff\n(mm)', 'Tolerance\n(±mm)', 'Result', 'Total\nQty',
  ];

  const tableRows = items.map((item) => {
    const diff = item.differenceMm !== null ? item.differenceMm.toFixed(1) : '—';
    return [
      item.sn,
      item.assemblyMark,
      item.revision || '',
      item.profile || '—',
      item.designation,
      item.checkedQty,
      item.dwgLengthMm !== null ? item.dwgLengthMm.toFixed(0) : '—',
      item.actualLengthMm !== null ? item.actualLengthMm.toFixed(0) : '—',
      diff,
      `±${item.toleranceMm}`,
      item.finalResult,
      item.totalQty,
    ];
  });

  autoTable(doc, {
    head: [headers],
    body: tableRows,
    startY: tableY,
    margin: { left: M, right: M },
    theme: 'grid',
    headStyles: {
      fillColor: [...NAVY] as [number, number, number],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      lineColor: [40, 70, 110],
      lineWidth: 0.15,
    },
    alternateRowStyles: {
      fillColor: [250, 251, 253],
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 },
      halign: 'center',
      textColor: [...DARK_TEXT] as [number, number, number],
      lineColor: [215, 220, 228],
      lineWidth: 0.15,
    },
    columnStyles: {
      0:  { cellWidth: 7,  halign: 'center' },   // SN
      1:  { cellWidth: 22, halign: 'left' },      // Assembly Mark
      2:  { cellWidth: 8,  halign: 'center' },    // Rev
      3:  { cellWidth: 18, halign: 'center' },    // Profile
      4:  { cellWidth: 30, halign: 'left' },      // Designation
      5:  { cellWidth: 12, halign: 'center' },    // Checked Qty
      6:  { cellWidth: 22, halign: 'center' },    // DWG Length
      7:  { cellWidth: 22, halign: 'center' },    // Actual Length
      8:  { cellWidth: 16, halign: 'center' },    // Difference
      9:  { cellWidth: 18, halign: 'center' },    // Tolerance
      10: { cellWidth: 18, halign: 'center' },    // Result
      11: { cellWidth: 12, halign: 'center' },    // Total Qty
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const result = String(tableRows[data.row.index]?.[10] ?? '');
        if (result === 'Pass' || result === 'Accepted') {
          if (data.column.index === 10) {
            data.cell.styles.fillColor = [210, 245, 220];
            data.cell.styles.textColor = [0, 110, 40];
            data.cell.styles.fontStyle = 'bold';
          }
        } else if (result === 'Fail' || result === 'Rejected') {
          if (data.column.index === 10) {
            data.cell.styles.fillColor = [255, 225, 225];
            data.cell.styles.textColor = [180, 0, 0];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  // ── Signature strip ──────────────────────────────────────────────────────────
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const sigY = Math.min(finalY + 4, H - 22);

  const sigBoxW = (W - M * 2 - 12) / 3;
  const sigBoxH = 12;
  const sigLabels = ['Prepared By', 'Checked By', 'Approved By'];
  const sigNames  = [meta.preparedBy, meta.checkedBy, ''];

  sigLabels.forEach((label, i) => {
    const bx = M + i * (sigBoxW + 6);
    doc.setFillColor(...LIGHT_GREY);
    doc.roundedRect(bx, sigY, sigBoxW, sigBoxH, 1, 1, 'F');
    doc.setDrawColor(200, 205, 215);
    doc.setLineWidth(0.2);
    doc.roundedRect(bx, sigY, sigBoxW, sigBoxH, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MID_TEXT);
    doc.text(label, bx + sigBoxW / 2, sigY + 4, { align: 'center' });

    // Signature line
    doc.setDrawColor(160, 165, 175);
    doc.setLineWidth(0.3);
    doc.line(bx + 6, sigY + 9, bx + sigBoxW - 6, sigY + 9);

    if (sigNames[i]) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...DARK_TEXT);
      doc.text(sigNames[i], bx + sigBoxW / 2, sigY + 8.5, { align: 'center' });
    }
  });

  // ── Footer on every page ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();

    doc.setFillColor(...NAVY);
    doc.rect(0, ph - 8, W, 8, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(160, 185, 210);
    doc.text(
      'Form: HEXA-FRM-021 · Procedure: Hexa-ISP-013 · ISO §8.5.1, §8.6',
      M + 2, ph - 3,
    );
    doc.setTextColor(...WHITE);
    doc.text(`Page ${i} of ${pageCount}`, W - M - 2, ph - 3, { align: 'right' });
    doc.setTextColor(130, 155, 185);
    doc.text('HEXA STEEL® — Confidential', W / 2, ph - 3, { align: 'center' });
  }

  doc.save(`Dim-Report-${meta.reportNumber || 'export'}.pdf`);
}
