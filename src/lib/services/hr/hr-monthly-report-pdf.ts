/**
 * HR Monthly Report PDF Generator — v23.2.0
 *
 * Renders an A4 multi-page PDF report using jsPDF + jspdf-autotable.
 * Output: public/outputs/hr-reports/<YYYY-MM>.pdf
 */

import { promises as fs } from 'fs';
import path from 'path';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logger } from '@/lib/logger';
import type { HrMonthlyReportData } from './hr-monthly-report-service';

const REPORT_DIR = path.join(process.cwd(), 'public', 'outputs', 'hr-reports');
const LOGO_DIR   = path.join(process.cwd(), 'public', 'uploads', 'company-logo');

// Brand palette
const BRAND_DARK:  [number, number, number] = [15, 52, 96];
const BRAND_MID:   [number, number, number] = [30, 100, 170];
const BRAND_LIGHT: [number, number, number] = [224, 237, 251];
const GREEN:       [number, number, number] = [22, 163, 74];
const AMBER:       [number, number, number] = [217, 119, 6];
const RED:         [number, number, number] = [185, 28, 28];
const GREY_TEXT:   [number, number, number] = [80, 80, 80];
const WHITE:       [number, number, number] = [255, 255, 255];

const A4_W   = 595.28;
const A4_H   = 841.89;
const MARGIN = 36;
const CW     = A4_W - MARGIN * 2;

// ─── Logo loader (same as payslip generator) ──────────────────────────────

type LogoInfo = { base64: string; width: number; height: number };

async function loadLogo(): Promise<LogoInfo | null> {
  try {
    const files = await fs.readdir(LOGO_DIR);
    const pngs  = files.filter((f) => f.toLowerCase().endsWith('.png')).sort().reverse();
    if (!pngs.length) return null;
    const buf    = await fs.readFile(path.join(LOGO_DIR, pngs[0]));
    const width  = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { base64: buf.toString('base64'), width, height };
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function sar(n: number): string {
  return `SAR ${n.toLocaleString('en-SA-u-ca-gregory', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

interface DocAT extends jsPDF { lastAutoTable?: { finalY: number } }

function lastY(doc: jsPDF): number {
  return ((doc as DocAT).lastAutoTable?.finalY ?? 0);
}

// ─── Page header / footer ─────────────────────────────────────────────────

function drawPageHeader(doc: jsPDF, logo: LogoInfo | null, data: HrMonthlyReportData, pageNum: number, totalPages: number) {
  // Top band
  doc.setFillColor(...(logo ? WHITE : BRAND_DARK));
  doc.rect(0, 0, A4_W, 60, 'F');
  if (logo) {
    doc.setDrawColor(...BRAND_MID);
    doc.setLineWidth(1);
    doc.line(0, 60, A4_W, 60);
  }

  let textX = MARGIN;
  if (logo) {
    try {
      const MAX_H = 44, MAX_W = 100;
      const scale  = Math.min(MAX_W / logo.width, MAX_H / logo.height);
      const logoW  = logo.width * scale;
      const logoH  = logo.height * scale;
      doc.addImage(logo.base64, 'PNG', MARGIN, (60 - logoH) / 2, logoW, logoH);
      textX = MARGIN + logoW + 10;
    } catch { /* skip */ }
  }

  const hdrColor: [number, number, number] = logo ? BRAND_DARK : WHITE;
  const subColor: [number, number, number] = logo ? BRAND_MID   : [180, 210, 240];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...hdrColor);
  doc.text('Hexa Steel®', textX, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...subColor);
  doc.text('HR MONTHLY REPORT', textX, 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...hdrColor);
  doc.text(data.period.label, A4_W - MARGIN, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...subColor);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-SA-u-ca-gregory')}`, A4_W - MARGIN, 36, { align: 'right' });
  doc.text(`Page ${pageNum} of ${totalPages}`, A4_W - MARGIN, 50, { align: 'right' });
}

function drawPageFooter(doc: jsPDF) {
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, A4_H - 22, A4_W, 22, 'F');
  doc.setTextColor(180, 200, 230);
  doc.setFontSize(7);
  doc.text(
    'Hexa Steel® — Confidential — For internal use only',
    A4_W / 2, A4_H - 8, { align: 'center' },
  );
}

// ─── Section heading ──────────────────────────────────────────────────────

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...BRAND_MID);
  doc.rect(MARGIN, y, CW, 16, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(title, MARGIN + 6, y + 11);
  return y + 22;
}

// ─── KPI strip (4 boxes) ──────────────────────────────────────────────────

function kpiStrip(
  doc: jsPDF,
  y: number,
  items: Array<{ label: string; value: string; color?: [number, number, number] }>,
): number {
  const boxW = CW / items.length;
  items.forEach((item, i) => {
    const bx = MARGIN + i * boxW;
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(bx + 2, y, boxW - 4, 42, 3, 3, 'F');
    doc.setTextColor(...(item.color ?? BRAND_MID));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(item.value, bx + boxW / 2, y + 24, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY_TEXT);
    doc.text(item.label, bx + boxW / 2, y + 36, { align: 'center' });
  });
  return y + 50;
}

// ─── Burnout gauge bar ────────────────────────────────────────────────────

function burnoutBar(doc: jsPDF, y: number, score: number, level: string): number {
  const barW = CW;
  const barH = 14;
  // Background gradient zones
  const zones: Array<{ pct: number; color: [number, number, number] }> = [
    { pct: 0.25, color: GREEN },
    { pct: 0.25, color: [132, 204, 22] },
    { pct: 0.25, color: AMBER },
    { pct: 0.25, color: RED },
  ];
  let cx = MARGIN;
  for (const z of zones) {
    const w = barW * z.pct;
    doc.setFillColor(...z.color);
    doc.rect(cx, y, w, barH, 'F');
    cx += w;
  }

  // Fill up to score
  const filledW = (score / 100) * barW;
  doc.setFillColor(...BRAND_DARK);
  doc.setLineWidth(2);
  doc.line(MARGIN + filledW, y - 3, MARGIN + filledW, y + barH + 3);

  // Labels
  doc.setFontSize(7);
  doc.setTextColor(...GREY_TEXT);
  ['Low', 'Moderate', 'High', 'Critical'].forEach((lbl, i) => {
    doc.text(lbl, MARGIN + (i + 0.5) * barW * 0.25, y + barH + 10, { align: 'center' });
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const levelColor: [number, number, number] =
    level === 'low'      ? GREEN
    : level === 'moderate' ? AMBER
    : RED;
  doc.setTextColor(...levelColor);
  doc.text(`${score.toFixed(0)}/100 — ${level.charAt(0).toUpperCase() + level.slice(1)}`, A4_W - MARGIN, y + 7, { align: 'right' });

  return y + barH + 16;
}

// ─── Main PDF generator ───────────────────────────────────────────────────

export async function generateMonthlyReportPdf(
  data: HrMonthlyReportData,
): Promise<string> {
  const logo = await loadLogo();
  const doc  = new jsPDF({ unit: 'pt', format: 'a4' });

  // We pre-allocate pages:
  // Page 1: Executive Summary + Headcount KPIs + Turnover + Burnout
  // Page 2: Leave + Documents
  // Page 3: Payroll + New Hires / Departures tables
  const totalPages = 3;
  let currentPage  = 1;

  // ── PAGE 1 ─────────────────────────────────────────────────────────────────
  drawPageHeader(doc, logo, data, currentPage, totalPages);
  drawPageFooter(doc);

  let y = 72;

  // ── Executive Summary ─────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'EXECUTIVE SUMMARY');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  const summaryLines = doc.splitTextToSize(data.executiveSummary, CW - 12);
  doc.text(summaryLines, MARGIN + 6, y);
  y += summaryLines.length * 11 + 10;

  // ── Headcount KPIs ────────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'WORKFORCE SNAPSHOT');
  y = kpiStrip(doc, y, [
    { label: 'Headcount (end of month)', value: String(data.headcount.atEnd) },
    { label: 'New Hires',                value: String(data.headcount.newHires.length), color: GREEN },
    { label: 'Departures',               value: String(data.turnover.leavers), color: data.turnover.leavers > 0 ? RED : GREY_TEXT },
    { label: 'Turnover Rate',            value: pct(data.turnover.rate), color: data.turnover.rating === 'good' ? GREEN : data.turnover.rating === 'normal' ? AMBER : RED },
  ]);

  // Turnover detail row
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY_TEXT);
  doc.text(
    `Avg headcount: ${data.turnover.avgHeadcount}  |  Resignations: ${data.headcount.resignations.length}  |  Terminations: ${data.headcount.terminations.length}  |  Rating: ${data.turnover.rating.toUpperCase()}`,
    MARGIN, y,
  );
  y += 14;

  // ── Burnout Indicator ─────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'BURNOUT INDICATOR');
  y = burnoutBar(doc, y, data.burnout.score, data.burnout.level);

  // Component breakdown table
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Component', 'Score (max 25)', 'Value']],
    body: [
      ['Overtime Hours',        data.burnout.components.overtimeScore.toFixed(1),    `${data.burnout.avgOvertimeHours.toFixed(1)} hrs/emp`],
      ['Absenteeism Rate',      data.burnout.components.absenteeismScore.toFixed(1), pct(data.burnout.absenteeismRate)],
      ['Open Leave Requests',   data.burnout.components.openRequestsScore.toFixed(1),`${data.burnout.avgOpenRequests.toFixed(2)} req/emp`],
      ['Departmental Turnover', data.burnout.components.turnoverScore.toFixed(1),    pct(data.burnout.departmentalTurnoverRate)],
    ],
    headStyles: { fillColor: BRAND_MID, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 4 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: CW * 0.50 },
      1: { halign: 'center', cellWidth: CW * 0.25, fontStyle: 'bold' },
      2: { halign: 'right',  cellWidth: CW * 0.25 },
    },
  });
  y = lastY(doc) + 12;

  // ── PAGE 2 ─────────────────────────────────────────────────────────────────
  doc.addPage();
  currentPage = 2;
  drawPageHeader(doc, logo, data, currentPage, totalPages);
  drawPageFooter(doc);
  y = 72;

  // ── Leave Statistics ───────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'LEAVE REQUESTS');
  y = kpiStrip(doc, y, [
    { label: 'Total Submitted', value: String(data.leave.totalRequests) },
    { label: 'Approved',        value: String(data.leave.approved),  color: GREEN },
    { label: 'Rejected',        value: String(data.leave.rejected),  color: RED },
    { label: 'Pending',         value: String(data.leave.pending),   color: AMBER },
  ]);

  doc.setFontSize(8);
  doc.setTextColor(...GREY_TEXT);
  doc.text(
    `Avg leave days per employee: ${data.leave.avgDaysPerEmployee}  |  Cancelled: ${data.leave.cancelled}`,
    MARGIN, y,
  );
  y += 14;

  if (data.leave.byType.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Leave Type', 'Requests', 'Total Days']],
      body: data.leave.byType.map((t) => [t.typeName, String(t.count), String(t.totalDays)]),
      headStyles: { fillColor: BRAND_MID, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: CW * 0.60 },
        1: { halign: 'center', cellWidth: CW * 0.20 },
        2: { halign: 'center', cellWidth: CW * 0.20 },
      },
    });
    y = lastY(doc) + 12;
  }

  // ── Document Renewals ─────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'IQAMA & DOCUMENT RENEWALS');

  const totalDocAlerts = data.documents.iqamaExpired.length
    + data.documents.iqamaDueSoon.length
    + data.documents.workPermitsDueSoon.length
    + data.documents.insuranceDueSoon.length
    + data.documents.otherDueSoon.length;

  if (totalDocAlerts === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREEN);
    doc.setFont('helvetica', 'bold');
    doc.text('All documents are current — no renewals required.', MARGIN + 6, y + 8);
    y += 20;
  } else {
    const allDocs = [
      ...data.documents.iqamaExpired.map((d) => ({ ...d, category: 'Iqama — EXPIRED' })),
      ...data.documents.iqamaDueSoon.map((d) => ({ ...d, category: 'Iqama — Due Soon' })),
      ...data.documents.workPermitsDueSoon.map((d) => ({ ...d, category: 'Work Permit' })),
      ...data.documents.insuranceDueSoon.map((d) => ({ ...d, category: 'Insurance' })),
      ...data.documents.otherDueSoon.map((d) => ({ ...d, category: 'Other' })),
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Category', 'Document', 'Employee', 'Expiry Date', 'Days']],
      body: allDocs.map((d) => [
        d.category,
        d.title,
        d.employeeName ?? '—',
        d.expiryDate,
        d.daysUntilExpiry <= 0 ? `${Math.abs(d.daysUntilExpiry)}d ago` : `${d.daysUntilExpiry}d`,
      ]),
      headStyles: { fillColor: BRAND_MID, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: CW * 0.22 },
        1: { cellWidth: CW * 0.28 },
        2: { cellWidth: CW * 0.22 },
        3: { halign: 'center', cellWidth: CW * 0.16 },
        4: { halign: 'center', cellWidth: CW * 0.12 },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 4 && hookData.section === 'body') {
          const val = String(hookData.cell.raw ?? '');
          if (val.includes('ago')) hookData.cell.styles.textColor = RED;
          else if (parseInt(val) <= 30) hookData.cell.styles.textColor = AMBER;
        }
      },
    });
    y = lastY(doc) + 12;
  }

  // ── PAGE 3 ─────────────────────────────────────────────────────────────────
  doc.addPage();
  currentPage = 3;
  drawPageHeader(doc, logo, data, currentPage, totalPages);
  drawPageFooter(doc);
  y = 72;

  // ── Payroll KPIs ──────────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'MONTHLY PAYROLL KPI');

  if (!data.payroll.periodFound) {
    doc.setFontSize(8.5);
    doc.setTextColor(...AMBER);
    doc.setFont('helvetica', 'italic');
    doc.text('No payroll period found for this month.', MARGIN + 6, y + 8);
    y += 20;
  } else {
    y = kpiStrip(doc, y, [
      { label: 'Total Gross Payroll',  value: sar(data.payroll.totalGross) },
      { label: 'Total Net Payroll',    value: sar(data.payroll.totalNet),   color: GREEN },
      { label: 'Employees Paid',       value: String(data.payroll.employeesPaid) },
      { label: 'Avg Net Salary',       value: sar(data.payroll.avgNetSalary) },
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Payroll Component', 'Amount (SAR)']],
      body: [
        ['Total Gross Payroll',        sar(data.payroll.totalGross)],
        ['Total Deductions',           sar(data.payroll.totalDeductions)],
        ['Total Net Payroll',          sar(data.payroll.totalNet)],
        ['GOSI — Employee (10%)',      sar(data.payroll.gosiEmployee)],
        ['GOSI — Employer (12%)',      sar(data.payroll.gosiEmployer)],
        ['Average Net Salary',         sar(data.payroll.avgNetSalary)],
        ['Employees Paid',             String(data.payroll.employeesPaid)],
        ['Period Status',              data.payroll.periodStatus ?? '—'],
      ],
      headStyles: { fillColor: BRAND_MID, textColor: WHITE, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5, cellPadding: 5 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: CW * 0.60 },
        1: { halign: 'right', cellWidth: CW * 0.40, fontStyle: 'bold' },
      },
    });
    y = lastY(doc) + 14;
  }

  // ── New Hires table ───────────────────────────────────────────────────────
  y = sectionTitle(doc, y, `NEW HIRES (${data.headcount.newHires.length})`);

  if (data.headcount.newHires.length === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY_TEXT);
    doc.text('No new hires this month.', MARGIN + 6, y + 8);
    y += 20;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['ID', 'Full Name', 'Position', 'Department', 'Joined']],
      body: data.headcount.newHires.map((h) => [
        h.employmentId,
        h.fullNameEn,
        h.occupation ?? '—',
        h.department ?? '—',
        h.dateOfJoining,
      ]),
      headStyles: { fillColor: GREEN, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: {
        0: { cellWidth: CW * 0.14 },
        1: { cellWidth: CW * 0.26 },
        2: { cellWidth: CW * 0.22 },
        3: { cellWidth: CW * 0.22 },
        4: { halign: 'center', cellWidth: CW * 0.16 },
      },
    });
    y = lastY(doc) + 12;
  }

  // ── Departures table ──────────────────────────────────────────────────────
  const allDepartures = [
    ...data.headcount.resignations,
    ...data.headcount.terminations,
  ];
  y = sectionTitle(doc, y, `DEPARTURES (${allDepartures.length})`);

  if (allDepartures.length === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY_TEXT);
    doc.text('No departures this month.', MARGIN + 6, y + 8);
    y += 20;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['ID', 'Full Name', 'Position', 'Department', 'Left On', 'Reason']],
      body: allDepartures.map((d) => [
        d.employmentId,
        d.fullNameEn,
        d.occupation ?? '—',
        d.department ?? '—',
        d.dateOfLeaving,
        d.reason,
      ]),
      headStyles: { fillColor: RED, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      columnStyles: {
        0: { cellWidth: CW * 0.12 },
        1: { cellWidth: CW * 0.24 },
        2: { cellWidth: CW * 0.20 },
        3: { cellWidth: CW * 0.20 },
        4: { halign: 'center', cellWidth: CW * 0.14 },
        5: { halign: 'center', cellWidth: CW * 0.10, fontStyle: 'bold' },
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 5 && hookData.section === 'body') {
          hookData.cell.styles.textColor =
            hookData.cell.raw === 'RESIGNED' ? AMBER : RED;
        }
      },
    });
  }

  // ── Write to disk ──────────────────────────────────────────────────────────
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const filename   = `${data.period.year}-${String(data.period.month).padStart(2, '0')}.pdf`;
  const diskPath   = path.join(REPORT_DIR, filename);
  const publicPath = `/outputs/hr-reports/${filename}`;
  const raw        = doc.output('arraybuffer');
  await fs.writeFile(diskPath, Buffer.from(raw));

  logger.info({ publicPath }, '[HrMonthlyReport] PDF written');
  return publicPath;
}
