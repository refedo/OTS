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
  inspectorName: string;
  rfiNumber: string;
  qtyBuilding: string;
  inspectionDate: string;
  inspectionTime: string;
};

export function generateDimensionalReport(
  meta: DimReportMeta,
  items: DimReportItem[]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();   // 297mm
  const margin = 8;

  // ── Header band ─────────────────────────────────────────────────────────────
  // Light grey top bar
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, margin, pageWidth - margin * 2, 14, 'F');

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('HEXA STEEL®', margin + 2, margin + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('THRIVE DIFFERENT', margin + 2, margin + 10.5);

  // Centered report title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text('Final Dimension & Visual Report', pageWidth / 2, margin + 9, { align: 'center' });

  // ── Meta rows ────────────────────────────────────────────────────────────────
  const metaY = margin + 16;
  const col1X = margin;
  const col2X = margin + 55;
  const lineH = 5.5;

  const leftMeta = [
    ['Date', meta.date],
    ['Report #', meta.reportNumber],
    ['Project #', meta.projectNumber],
    ['Building Name', meta.buildingName],
    ['Project Name', meta.projectName],
    ['Prepared By', meta.preparedBy],
  ];

  doc.setFontSize(8);
  leftMeta.forEach(([label, value], i) => {
    const y = metaY + i * lineH;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(label, col1X, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(value || '', col2X, y);
  });

  // ── Info boxes (top-right) ───────────────────────────────────────────────────
  const boxRight = pageWidth - margin;
  const boxW = 58;
  const boxH = 8;
  const boxGap = 2;

  // Inspector box (pink/rose)
  const b1Y = metaY;
  doc.setFillColor(255, 182, 193);
  doc.rect(boxRight - boxW, b1Y, boxW, boxH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 0, 0);
  doc.text('Hexa QC Inspector', boxRight - boxW / 2, b1Y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 30, 30);
  doc.text(meta.inspectorName || '—', boxRight - boxW / 2, b1Y + 7, { align: 'center' });

  // RFI number box (green)
  const b2Y = b1Y + boxH + boxGap;
  doc.setFillColor(100, 200, 100);
  doc.rect(boxRight - boxW, b2Y, boxW, boxH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 80, 0);
  doc.text(`RFI NO : ${meta.rfiNumber}`, boxRight - boxW / 2, b2Y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 30, 30);
  doc.text(`QTY / Building  ${meta.qtyBuilding} Pcs`, boxRight - boxW / 2, b2Y + 7, { align: 'center' });

  // Inspection date box (yellow)
  const b3Y = b2Y + boxH + boxGap;
  doc.setFillColor(255, 255, 0);
  doc.rect(boxRight - boxW, b3Y, boxW, boxH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 60, 0);
  doc.text('Inspection Date & Time', boxRight - boxW / 2, b3Y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text(
    `${meta.inspectionDate}   ${meta.inspectionTime}`,
    boxRight - boxW / 2,
    b3Y + 7,
    { align: 'center' }
  );

  // ── Main data table ──────────────────────────────────────────────────────────
  const tableY = metaY + leftMeta.length * lineH + 4;

  const headers = [
    'SN', 'PID', 'Assembly Mark', 'Rev.', 'Profile', 'Designation',
    'Checked Qty', 'DWG Dim.\nLength (mm)', 'Actual Dim.\nLength (mm)',
    'Difference\n(mm)', 'Tolerance as\nper code', 'Final Result',
    'Designation', 'Total Qty',
  ];

  const tableRows = items.map((item) => {
    const diff = item.differenceMm !== null ? item.differenceMm.toFixed(1) : '—';
    const tol = `±${item.toleranceMm}`;
    return [
      item.sn,
      item.pid,
      item.assemblyMark,
      item.revision || '',
      item.profile || 'BEAM',
      item.designation,
      item.checkedQty,
      item.dwgLengthMm !== null ? item.dwgLengthMm.toFixed(0) : '—',
      item.actualLengthMm !== null ? item.actualLengthMm.toFixed(0) : '—',
      diff,
      tol,
      item.finalResult,
      item.designation,
      item.totalQty,
    ];
  });

  autoTable(doc, {
    head: [headers],
    body: tableRows,
    startY: tableY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [44, 62, 80],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 7 },    // SN
      1: { cellWidth: 13 },   // PID
      2: { cellWidth: 22 },   // Assembly Mark
      3: { cellWidth: 8 },    // Rev
      4: { cellWidth: 13 },   // Profile
      5: { cellWidth: 22 },   // Designation
      6: { cellWidth: 15 },   // Checked Qty
      7: { cellWidth: 20 },   // DWG Length
      8: { cellWidth: 20 },   // Actual Length
      9: { cellWidth: 17 },   // Difference
      10: { cellWidth: 18 },  // Tolerance
      11: { cellWidth: 17 },  // Result
      12: { cellWidth: 22 },  // Designation (repeat)
      13: { cellWidth: 14 },  // Total Qty
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const result = String(tableRows[data.row.index]?.[11] ?? '');
        if (result === 'Pass' || result === 'Accepted') {
          data.cell.styles.fillColor = [200, 240, 210];
          data.cell.styles.textColor = [0, 100, 0];
          if (data.column.index === 11) data.cell.styles.fontStyle = 'bold';
        } else if (result === 'Fail' || result === 'Rejected') {
          data.cell.styles.fillColor = [255, 220, 220];
          data.cell.styles.textColor = [160, 0, 0];
          if (data.column.index === 11) data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(margin, ph - 10, pageWidth - margin, ph - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(130, 130, 130);
    doc.text(
      'Form: HEXA-FRM-021 · Procedure: Hexa-ISP-013 · ISO §8.5.1, §8.6',
      pageWidth / 2,
      ph - 7,
      { align: 'center' }
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      ph - 7,
      { align: 'right' }
    );
  }

  void finalY;

  doc.save(`Dim-Report-${meta.reportNumber || 'export'}.pdf`);
}
