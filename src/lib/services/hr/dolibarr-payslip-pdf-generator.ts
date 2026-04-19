/**
 * PDF generator for Dolibarr historical payslips. Unlike the OTS payslip
 * generator, these are streamed in-memory (not saved to disk) since they are
 * read-only historical records managed by Dolibarr's own data.
 */

import { promises as fs } from 'fs';
import path from 'path';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_DIR = path.join(process.cwd(), 'public', 'uploads', 'company-logo');

// Brand colours (same palette as OTS payslip generator)
const BRAND_DARK: [number, number, number] = [15, 52, 96];
const BRAND_MID: [number, number, number] = [30, 100, 170];
const BRAND_LIGHT: [number, number, number] = [224, 237, 251];
const ACCENT: [number, number, number] = [22, 163, 74];

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadLogo(): Promise<{ base64: string; width: number; height: number } | null> {
  try {
    const files = await fs.readdir(LOGO_DIR);
    const pngs = files.filter((f: string) => f.toLowerCase().endsWith('.png')).sort().reverse();
    if (!pngs.length) return null;
    const buf = await fs.readFile(path.join(LOGO_DIR, pngs[0]));
    return {
      base64: buf.toString('base64'),
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  } catch {
    return null;
  }
}

export interface DolibarrPayslipData {
  // Dolibarr salary record fields
  id: number;
  ref: string;
  label: string | null;
  salary: number;   // base salary
  amount: number;   // total disbursed
  dateStart: string;
  dateEnd: string;
  datePayment: string | null;
  isPaid: boolean;
  // Employee fields
  employmentId: string;
  fullNameEn: string;
  fullNameAr?: string | null;
  nationalId?: string | null;
  occupation?: string | null;
  department?: string | null;
  bankName?: string | null;
}

export async function generateDolibarrPayslipPdf(data: DolibarrPayslipData): Promise<Buffer> {
  const logo = await loadLogo();

  const A4_W = 595.28;
  const A4_H = 841.89;
  const MARGIN = 36;
  const CONTENT_W = A4_W - MARGIN * 2;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  // Format period label from date range
  const startDate = data.dateStart ? new Date(data.dateStart) : null;
  const endDate = data.dateEnd ? new Date(data.dateEnd) : null;
  const periodLabel = startDate
    ? startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : data.ref;

  // ── Header band ──────────────────────────────────────────────────────────
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

  let textOffsetX = MARGIN;
  if (logo) {
    try {
      const MAX_H = 52;
      const MAX_W = 120;
      const scale = Math.min(MAX_W / logo.width, MAX_H / logo.height);
      const logoW = logo.width * scale;
      const logoH = logo.height * scale;
      doc.addImage(logo.base64, 'PNG', MARGIN, (72 - logoH) / 2, logoW, logoH);
      textOffsetX = MARGIN + logoW + 10;
    } catch {
      // skip silently
    }
  }

  const headerTextColor: [number, number, number] = logo ? BRAND_DARK : [255, 255, 255];
  const headerSubColor: [number, number, number] = logo ? BRAND_MID : [200, 220, 245];
  doc.setTextColor(...headerTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Hexa Steel\u00AE', textOffsetX, 32);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...headerSubColor);
  doc.text('EMPLOYEE PAYSLIP (DOLIBARR)', textOffsetX, 50);

  // Period label right-aligned
  doc.setTextColor(...headerTextColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(periodLabel, A4_W - MARGIN, 30, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...headerSubColor);
  if (startDate && endDate) {
    doc.text(
      `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      A4_W - MARGIN, 46, { align: 'right' },
    );
  }
  if (data.datePayment) {
    doc.text(`Pay date: ${data.datePayment}`, A4_W - MARGIN, 60, { align: 'right' });
  }

  // ── Employee info box ────────────────────────────────────────────────────
  const EMP_TOP = 86;
  doc.setFillColor(...BRAND_LIGHT);
  doc.roundedRect(MARGIN, EMP_TOP, CONTENT_W, 68, 4, 4, 'F');
  doc.setDrawColor(...BRAND_MID);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, EMP_TOP, CONTENT_W, 68, 4, 4, 'S');

  const lx = MARGIN + 10;
  const rx = MARGIN + CONTENT_W / 2 + 10;
  let ey = EMP_TOP + 16;

  function infoRow(label: string, value: string, x: number, y: number) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_MID);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(value || '—', x + 75, y);
  }

  infoRow('Employee ID:', data.employmentId, lx, ey);
  infoRow('Name:', data.fullNameEn, lx, ey + 14);
  if (data.nationalId) infoRow('National ID:', data.nationalId, lx, ey + 28);
  if (data.occupation) infoRow('Position:', data.occupation, lx, ey + 42);

  infoRow('Ref:', data.ref, rx, ey);
  if (data.department) infoRow('Department:', data.department, rx, ey + 14);
  infoRow('Status:', data.isPaid ? 'Paid' : 'Unpaid', rx, ey + 28);

  // ── Salary table ─────────────────────────────────────────────────────────
  const TABLE_TOP = EMP_TOP + 80;

  autoTable(doc, {
    startY: TABLE_TOP,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Description', 'SAR']],
    body: [
      ['Base Salary', money(data.salary)],
      ...(data.label ? [['Note', data.label]] : []),
    ],
    headStyles: {
      fillColor: BRAND_MID,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: { fontSize: 9, cellPadding: 5 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.75 },
      1: { halign: 'right', cellWidth: CONTENT_W * 0.25, fontStyle: 'bold' },
    },
    tableLineColor: BRAND_MID,
    tableLineWidth: 0.3,
  });

  // ── Total amount band ─────────────────────────────────────────────────────
  interface DocAT extends jsPDF { lastAutoTable?: { finalY: number } }
  const afterTable = ((doc as DocAT).lastAutoTable?.finalY ?? 300) + 16;

  const TOTAL_H = 60;
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(MARGIN, afterTable, CONTENT_W, TOTAL_H, 'F');
  doc.setDrawColor(...BRAND_MID);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, afterTable, CONTENT_W, TOTAL_H, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Total Amount Disbursed', A4_W / 2, afterTable + 18, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...ACCENT);
  doc.text(`SAR ${money(data.amount)}`, A4_W / 2, afterTable + 42, { align: 'center' });

  // ── Signature lines ───────────────────────────────────────────────────────
  const sigY = afterTable + TOTAL_H + 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Employee signature', MARGIN + 60, sigY, { align: 'center' });
  doc.setDrawColor(150, 150, 150);
  doc.line(MARGIN, sigY + 6, MARGIN + 120, sigY + 6);
  doc.text('HR Manager', A4_W - MARGIN - 60, sigY, { align: 'center' });
  doc.line(A4_W - MARGIN - 120, sigY + 6, A4_W - MARGIN, sigY + 6);

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, A4_H - 28, A4_W, 28, 'F');
  doc.setTextColor(180, 200, 230);
  doc.setFontSize(7.5);
  doc.text('This is a system-generated payslip — Hexa Steel® Confidential', A4_W / 2, A4_H - 10, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
