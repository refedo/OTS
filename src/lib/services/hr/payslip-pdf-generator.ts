/**
 * Payslip PDF generator. Renders a single-page A4 payslip per PayrollLine
 * using jsPDF + jspdf-autotable. Files are written under
 * public/outputs/payslips/<periodId>/<employmentId>.pdf.
 *
 * The payslip is a deliberately simple, legally-sufficient layout:
 *   - Company + period header
 *   - Employee info block
 *   - Earnings / Deductions two-column table
 *   - Net pay in words + figure
 *   - Signature lines
 */

import { promises as fs } from 'fs';
import path from 'path';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const PAYSLIP_DIR = path.join(process.cwd(), 'public', 'outputs', 'payslips');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function money(n: unknown): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Hexa Steel®', 40, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Payslip', 40, 68);

  const periodLabel = `${MONTH_NAMES[line.period.month - 1]} ${line.period.year}`;
  doc.setFontSize(11);
  doc.text(`Period: ${periodLabel}`, 420, 50);
  doc.text(`Pay date: ${line.period.payDate.toISOString().slice(0, 10)}`, 420, 68);

  // Employee block
  doc.setFont('helvetica', 'bold');
  doc.text('Employee', 40, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`ID: ${line.employee.employmentId}`, 40, 128);
  doc.text(`Name: ${line.employee.fullNameEn}`, 40, 142);
  if (line.employee.nationalId) doc.text(`National ID: ${line.employee.nationalId}`, 40, 156);
  if (line.employee.jobTitleEn) doc.text(`Title: ${line.employee.jobTitleEn}`, 40, 170);
  if (line.employee.department) doc.text(`Department: ${line.employee.department}`, 40, 184);

  doc.text(`Calendar days: ${line.calendarDays}`, 320, 128);
  doc.text(`Working days: ${line.workingDays}`, 320, 142);
  doc.text(`Worked days: ${Number(line.workedDays).toFixed(2)}`, 320, 156);
  doc.text(`Overtime hours: ${Number(line.overtimeHours).toFixed(2)}`, 320, 170);
  doc.text(`Bank: ${line.bankName ?? '—'}`, 320, 184);

  // Earnings vs Deductions table
  const earnings = [
    ['Basic salary', money(line.basicSalary)],
    ['Housing allowance', money(line.housingAllowance)],
    ['Transport allowance', money(line.transportAllowance)],
    ['Mobile allowance', money(line.mobileAllowance)],
    ['Food allowance', money(line.foodAllowance)],
    ['Other allowances', money(line.otherAllowances)],
    ['Overtime pay', money(line.overtimePay)],
    ['Bonuses', money(line.bonuses)],
    ['Other additions', money(line.otherAdditions)],
  ];
  const deductions = [
    ['GOSI (employee)', money(line.gosiEmployee)],
    ['Unpaid leave', money(line.unpaidLeaveDeduction)],
    ['Absence deduction', money(line.absenceDeduction)],
    ['Other deductions', money(line.otherDeductions)],
  ];

  const maxRows = Math.max(earnings.length, deductions.length);
  const tableRows: (string | number)[][] = [];
  for (let i = 0; i < maxRows; i++) {
    tableRows.push([
      earnings[i]?.[0] ?? '',
      earnings[i]?.[1] ?? '',
      deductions[i]?.[0] ?? '',
      deductions[i]?.[1] ?? '',
    ]);
  }

  autoTable(doc, {
    startY: 220,
    head: [['Earnings', 'Amount (SAR)', 'Deductions', 'Amount (SAR)']],
    body: tableRows,
    headStyles: { fillColor: [40, 60, 100], halign: 'center' },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      1: { halign: 'right' },
      3: { halign: 'right' },
    },
  });

  // Totals block
  interface DocWithAutoTable extends jsPDF {
    lastAutoTable?: { finalY: number };
  }
  const finalY = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? 400) + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Gross pay: SAR ${money(Number(line.grossPay) + Number(line.totalAdditions))}`, 40, finalY);
  doc.text(`Total deductions: SAR ${money(line.totalDeductions)}`, 40, finalY + 16);
  doc.setFontSize(14);
  doc.text(`Net pay: SAR ${money(line.netPay)}`, 40, finalY + 40);

  // Signature lines
  const sigY = finalY + 90;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Employee signature: ______________________________', 40, sigY);
  doc.text('HR signature: ______________________________', 320, sigY);

  // Save
  const dir = path.join(PAYSLIP_DIR, line.period.id);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${line.employee.employmentId}_${line.period.year}_${String(line.period.month).padStart(2, '0')}.pdf`;
  const diskPath = path.join(dir, filename);
  const publicPath = `/outputs/payslips/${line.period.id}/${filename}`;
  const buffer = Buffer.from(doc.output('arraybuffer'));
  await fs.writeFile(diskPath, buffer);

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
