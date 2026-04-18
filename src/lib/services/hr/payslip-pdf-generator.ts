/**
 * Payslip PDF generator. Renders a single-page A4 payslip per PayrollLine
 * using jsPDF + jspdf-autotable. Files are written under
 * public/outputs/payslips/<periodId>/<employmentId>.pdf.
 */

import { promises as fs } from 'fs';
import path from 'path';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const PAYSLIP_DIR = path.join(process.cwd(), 'public', 'outputs', 'payslips');
const LOGO_DIR = path.join(process.cwd(), 'public', 'uploads', 'company-logo');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Brand colours (RGB)
const BRAND_DARK: [number, number, number] = [15, 52, 96];    // deep navy
const BRAND_MID: [number, number, number] = [30, 100, 170];   // steel blue
const BRAND_LIGHT: [number, number, number] = [224, 237, 251]; // pale blue tint
const ACCENT: [number, number, number] = [22, 163, 74];       // emerald for net pay

function money(n: unknown): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type LogoInfo = { base64: string; width: number; height: number };

/** Try to load the most recent PNG logo, returning base64 + actual pixel dimensions. */
async function loadLogo(): Promise<LogoInfo | null> {
  try {
    const files = await fs.readdir(LOGO_DIR);
    const pngs = files.filter((f) => f.toLowerCase().endsWith('.png')).sort().reverse();
    if (!pngs.length) return null;
    const buf = await fs.readFile(path.join(LOGO_DIR, pngs[0]));
    // PNG stores width at bytes 16-19 and height at bytes 20-23 (big-endian)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { base64: buf.toString('base64'), width, height };
  } catch {
    return null;
  }
}

export type PayslipResult = {
  lineId: string;
  filePath: string;
};

export async function generatePayslipPdf(lineId: string): Promise<PayslipResult> {
  const line = await prisma.payrollLine.findUnique({
    where: { id: lineId },
    include: {
      period: true,
      employee: {
        select: {
          id: true,
          employmentId: true,
          fullNameEn: true,
          fullNameAr: true,
          nationalId: true,
          jobTitleEn: true,
          department: true,
          dateOfJoining: true,
        },
      },
    },
  });
  if (!line) throw new Error('Payroll line not found');

  const logo = await loadLogo();
  const periodLabel = `${MONTH_NAMES[line.period.month - 1]} ${line.period.year}`;
  const A4_W = 595.28;
  const A4_H = 841.89;
  const MARGIN = 36;
  const CONTENT_W = A4_W - MARGIN * 2;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // ── Header band ────────────────────────────────────────────────────────────
  // White background when logo present (so coloured logos render correctly);
  // dark navy when no logo (fallback brand style).
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, A4_W, 72, 'F');
    doc.setDrawColor(...BRAND_MID);
    doc.setLineWidth(1);
    doc.line(0, 72, A4_W, 72);
  } else {
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, 0, A4_W, 72, 'F');
  }

  // Logo (top-left inside header), correct aspect ratio
  let textOffsetX = MARGIN;
  if (logo) {
    try {
      const MAX_H = 52;
      const MAX_W = 120;
      const scale = Math.min(MAX_W / logo.width, MAX_H / logo.height);
      const logoW = logo.width * scale;
      const logoH = logo.height * scale;
      const logoY = (72 - logoH) / 2;
      doc.addImage(logo.base64, 'PNG', MARGIN, logoY, logoW, logoH);
      textOffsetX = MARGIN + logoW + 10;
    } catch {
      // logo failed — skip silently
    }
  }

  // Company name + payslip label
  const headerTextColor: [number, number, number] = logo ? BRAND_DARK : [255, 255, 255];
  const headerSubColor: [number, number, number] = logo ? BRAND_MID : [200, 220, 245];
  doc.setTextColor(...headerTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Hexa Steel\u00AE', textOffsetX, 32);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...headerSubColor);
  doc.text('EMPLOYEE PAYSLIP', textOffsetX, 50);

  // Period + pay date (right-aligned in header)
  doc.setTextColor(...headerTextColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(periodLabel, A4_W - MARGIN, 30, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...headerSubColor);
  doc.text(`Pay date: ${line.period.payDate.toISOString().slice(0, 10)}`, A4_W - MARGIN, 46, { align: 'right' });
  doc.text(`Cutoff:   ${line.period.cutoffDate.toISOString().slice(0, 10)}`, A4_W - MARGIN, 60, { align: 'right' });

  // ── Employee info box ──────────────────────────────────────────────────────
  const EMP_TOP = 86;
  doc.setFillColor(...BRAND_LIGHT);
  doc.roundedRect(MARGIN, EMP_TOP, CONTENT_W, 78, 4, 4, 'F');
  doc.setDrawColor(...BRAND_MID);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, EMP_TOP, CONTENT_W, 78, 4, 4, 'S');

  // Left column
  doc.setTextColor(...BRAND_DARK);
  doc.setFontSize(9);
  const lx = MARGIN + 10;
  const rx = MARGIN + CONTENT_W / 2 + 10;
  let ey = EMP_TOP + 16;

  function infoRow(label: string, value: string, x: number, y: number) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_MID);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(value, x + 70, y);
  }

  infoRow('Employee ID:', line.employee.employmentId, lx, ey);
  infoRow('Name:', line.employee.fullNameEn, lx, ey + 14);
  if (line.employee.nationalId) infoRow('National ID:', line.employee.nationalId, lx, ey + 28);
  if (line.employee.jobTitleEn) infoRow('Job Title:', line.employee.jobTitleEn, lx, ey + 42);

  infoRow('Calendar Days:', String(line.calendarDays), rx, ey);
  infoRow('Working Days:', String(line.workingDays), rx, ey + 14);
  infoRow('Worked Days:', Number(line.workedDays).toFixed(1), rx, ey + 28);
  infoRow('OT Hours:', Number(line.overtimeHours).toFixed(2), rx, ey + 42);
  if (line.bankName) infoRow('Bank:', line.bankName, rx, ey + 56);
  if (line.employee.department) infoRow('Department:', line.employee.department, lx, ey + 56);

  // ── Earnings / Deductions table ────────────────────────────────────────────
  const TABLE_TOP = EMP_TOP + 88;

  const earnings: string[][] = [
    ['Basic salary', money(line.basicSalary)],
    ['Housing allowance', money(line.housingAllowance)],
    ['Transport allowance', money(line.transportAllowance)],
    ['Mobile allowance', money(line.mobileAllowance)],
    ['Food allowance', money(line.foodAllowance)],
    ['Other allowances', money(line.otherAllowances)],
    ['Overtime pay', money(line.overtimePay)],
  ];
  if (Number(line.bonuses) > 0) earnings.push(['Bonuses', money(line.bonuses)]);
  if (Number(line.otherAdditions) > 0) earnings.push(['Other additions', money(line.otherAdditions)]);

  const deductions: string[][] = [
    ['GOSI (employee 10%)', money(line.gosiEmployee)],
  ];
  if (Number(line.unpaidLeaveDeduction) > 0) deductions.push(['Unpaid leave deduction', money(line.unpaidLeaveDeduction)]);
  if (Number(line.absenceWithPermissionDeduction) > 0) deductions.push(['Leave w/ permission ded.', money(line.absenceWithPermissionDeduction)]);
  if (Number(line.absenceDeduction) > 0) deductions.push(['Leave w/o permission ded.', money(line.absenceDeduction)]);
  if (Number(line.loanDeduction) > 0) deductions.push(['Loan deduction', money(line.loanDeduction)]);
  if (Number(line.custodyDeduction) > 0) deductions.push(['Custody deduction', money(line.custodyDeduction)]);
  if (Number(line.violationDeduction) > 0) deductions.push(['Violation deduction', money(line.violationDeduction)]);
  if (Number(line.otherDeductions) > 0) deductions.push(['Other deductions', money(line.otherDeductions)]);

  const maxRows = Math.max(earnings.length, deductions.length);
  const tableRows: string[][] = [];
  for (let i = 0; i < maxRows; i++) {
    tableRows.push([
      earnings[i]?.[0] ?? '',
      earnings[i]?.[1] ?? '',
      deductions[i]?.[0] ?? '',
      deductions[i]?.[1] ?? '',
    ]);
  }

  autoTable(doc, {
    startY: TABLE_TOP,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Earnings', 'SAR', 'Deductions', 'SAR']],
    body: tableRows,
    headStyles: {
      fillColor: BRAND_MID,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 5,
    },
    bodyStyles: { fontSize: 8.5, cellPadding: 4 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.36 },
      1: { halign: 'right', cellWidth: CONTENT_W * 0.14, fontStyle: 'bold' },
      2: { cellWidth: CONTENT_W * 0.36 },
      3: { halign: 'right', cellWidth: CONTENT_W * 0.14, fontStyle: 'bold', textColor: [185, 28, 28] },
    },
    tableLineColor: BRAND_MID,
    tableLineWidth: 0.3,
  });

  // ── Totals band ────────────────────────────────────────────────────────────
  interface DocAT extends jsPDF { lastAutoTable?: { finalY: number } }
  const afterTable = ((doc as DocAT).lastAutoTable?.finalY ?? 500) + 12;

  const TOTALS_H = 60;
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(MARGIN, afterTable, CONTENT_W, TOTALS_H, 'F');
  doc.setDrawColor(...BRAND_MID);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, afterTable, CONTENT_W, TOTALS_H, 'S');

  const grossAmt = Number(line.grossPay) + Number(line.totalAdditions);
  const col3W = CONTENT_W / 3;

  function totalCell(label: string, amount: string, x: number, color: [number, number, number]) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(label, x + col3W / 2, afterTable + 18, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(`SAR ${amount}`, x + col3W / 2, afterTable + 38, { align: 'center' });
  }

  totalCell('Gross Pay', money(grossAmt), MARGIN, BRAND_MID);

  // Dividers
  doc.setDrawColor(180, 200, 220);
  doc.setLineWidth(0.4);
  doc.line(MARGIN + col3W, afterTable + 8, MARGIN + col3W, afterTable + TOTALS_H - 8);
  doc.line(MARGIN + col3W * 2, afterTable + 8, MARGIN + col3W * 2, afterTable + TOTALS_H - 8);

  totalCell('Total Deductions', money(line.totalDeductions), MARGIN + col3W, [185, 28, 28]);
  totalCell('Net Pay', money(line.netPay), MARGIN + col3W * 2, ACCENT);

  // ── Signature lines ────────────────────────────────────────────────────────
  const sigY = afterTable + TOTALS_H + 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  doc.text('Employee signature', MARGIN + 60, sigY, { align: 'center' });
  doc.setDrawColor(150, 150, 150);
  doc.line(MARGIN, sigY + 6, MARGIN + 120, sigY + 6);

  doc.text('HR Manager', A4_W - MARGIN - 60, sigY, { align: 'center' });
  doc.line(A4_W - MARGIN - 120, sigY + 6, A4_W - MARGIN, sigY + 6);

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, A4_H - 28, A4_W, 28, 'F');
  doc.setTextColor(180, 200, 230);
  doc.setFontSize(7.5);
  doc.text('This is a system-generated payslip — Hexa Steel® Confidential', A4_W / 2, A4_H - 10, { align: 'center' });

  // ── Save ───────────────────────────────────────────────────────────────────
  const dir = path.join(PAYSLIP_DIR, line.period.id);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${line.employee.employmentId}_${line.period.year}_${String(line.period.month).padStart(2, '0')}.pdf`;
  const diskPath = path.join(dir, filename);
  const publicPath = `/outputs/payslips/${line.period.id}/${filename}`;
  const raw = doc.output('arraybuffer');
  await fs.writeFile(diskPath, Buffer.from(raw));

  await prisma.payrollLine.update({
    where: { id: line.id },
    data: { payslipPdfPath: publicPath, payslipGeneratedAt: new Date() },
  });

  logger.info({ lineId: line.id, publicPath }, '[Payslip] PDF generated');
  return { lineId: line.id, filePath: publicPath };
}

export async function generateAllPayslipsForPeriod(periodId: string): Promise<number> {
  const lines = await prisma.payrollLine.findMany({ where: { periodId }, select: { id: true } });
  let count = 0;
  for (const l of lines) {
    try {
      await generatePayslipPdf(l.id);
      count += 1;
    } catch (e) {
      logger.warn({ e, lineId: l.id }, '[Payslip] Generation failed');
    }
  }
  return count;
}
