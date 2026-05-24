/**
 * INV Sequence Service
 * Generates sequential document numbers for INV module documents.
 * Format: MIR-OUT-YYYY-NNNN, RET-YYYY-NNNN, ADJ-YYYY-NNNN
 */

import prisma from '@/lib/db';

/**
 * Generate next MIR-OUT number for the given year.
 * Format: MIR-OUT-2026-0001
 */
export async function nextMirOutNumber(year: number): Promise<string> {
  const prefix = `MIR-OUT-${year}-`;
  const last = await prisma.invMirOut.findFirst({
    where: { mirOutNumber: { startsWith: prefix } },
    orderBy: { mirOutNumber: 'desc' },
    select: { mirOutNumber: true },
  });
  const lastSeq = last
    ? parseInt(last.mirOutNumber.replace(prefix, ''), 10) || 0
    : 0;
  const nextSeq = lastSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Generate next Return number for the given year.
 * Format: RET-2026-0001
 */
export async function nextReturnNumber(year: number): Promise<string> {
  const prefix = `RET-${year}-`;
  const last = await prisma.invReturn.findFirst({
    where: { returnNumber: { startsWith: prefix } },
    orderBy: { returnNumber: 'desc' },
    select: { returnNumber: true },
  });
  const lastSeq = last
    ? parseInt(last.returnNumber.replace(prefix, ''), 10) || 0
    : 0;
  const nextSeq = lastSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Generate next Adjustment number for the given year.
 * Format: ADJ-2026-0001
 */
export async function nextAdjustmentNumber(year: number): Promise<string> {
  const prefix = `ADJ-${year}-`;
  const last = await prisma.invAdjustment.findFirst({
    where: { adjustmentNumber: { startsWith: prefix } },
    orderBy: { adjustmentNumber: 'desc' },
    select: { adjustmentNumber: true },
  });
  const lastSeq = last
    ? parseInt(last.adjustmentNumber.replace(prefix, ''), 10) || 0
    : 0;
  const nextSeq = lastSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}
