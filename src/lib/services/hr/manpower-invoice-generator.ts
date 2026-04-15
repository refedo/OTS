/**
 * Phase 4 — Manpower Invoice Generator
 *
 * Aggregates AttendanceRecord rows for manpower slots within a payroll
 * period's date range, groups them by agency, and upserts one
 * ManpowerInvoiceDraft + ManpowerInvoiceLine set per agency.
 *
 * Idempotent: calling this a second time for the same period simply
 * re-aggregates and overwrites DRAFT invoices. CONFIRMED/PUSHED/PAID
 * drafts are left untouched (skipped).
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export interface ManpowerInvoiceGenerationResult {
  periodId: string;
  agenciesProcessed: number;
  draftsCreated: number;
  draftsUpdated: number;
  draftsSkipped: number; // already CONFIRMED/PUSHED/PAID
  errors: { agencyId: string; agencyName: string; message: string }[];
}

/**
 * Generate manpower invoice drafts for all agencies with attendance in the
 * given payroll period. Called automatically on period approval.
 */
export async function generateManpowerInvoicesForPeriod(
  periodId: string,
  triggeredById: string,
): Promise<ManpowerInvoiceGenerationResult> {
  const result: ManpowerInvoiceGenerationResult = {
    periodId,
    agenciesProcessed: 0,
    draftsCreated: 0,
    draftsUpdated: 0,
    draftsSkipped: 0,
    errors: [],
  };

  // 1. Load the payroll period to get the date range
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) {
    throw new Error(`PayrollPeriod ${periodId} not found`);
  }

  // Period range: first day of month → last day of month (or cutoffDate)
  const periodStart = new Date(Date.UTC(period.year, period.month - 1, 1));
  const periodEnd = period.cutoffDate; // already a Date

  // 2. Aggregate attendance hours per manpower slot in the period
  //    Include only PRESENT rows with positive regularHours or overtimeHours
  const records = await prisma.attendanceRecord.findMany({
    where: {
      workerType: 'MANPOWER_SLOT',
      manpowerSlotId: { not: null },
      date: { gte: periodStart, lte: periodEnd },
    },
    select: {
      manpowerSlotId: true,
      regularHours: true,
      overtimeHours: true,
      otMultiplier: true,
      manpowerSlot: {
        select: {
          id: true,
          agencyId: true,
          slotCode: true,
          trade: true,
          hourlyRate: true,
        },
      },
    },
  });

  if (records.length === 0) {
    logger.info({ periodId }, '[ManpowerBilling] No manpower attendance records found for period — no drafts generated');
    return result;
  }

  // 3. Group by slot, summing billable hours (regular + OT weighted by multiplier)
  const slotHours = new Map<
    string,
    {
      slot: { id: string; agencyId: string; slotCode: string; trade: string; hourlyRate: number };
      totalHours: number;
    }
  >();

  for (const rec of records) {
    if (!rec.manpowerSlotId || !rec.manpowerSlot) continue;

    const regular = Number(rec.regularHours ?? 0);
    const ot = Number(rec.overtimeHours ?? 0);
    const multiplier = Number(rec.otMultiplier ?? 1.0);
    // Billable hours: regular at 1× + overtime at the OT multiplier
    const billable = regular + ot * multiplier;

    const existing = slotHours.get(rec.manpowerSlotId);
    if (existing) {
      existing.totalHours += billable;
    } else {
      slotHours.set(rec.manpowerSlotId, {
        slot: {
          id: rec.manpowerSlot.id,
          agencyId: rec.manpowerSlot.agencyId,
          slotCode: rec.manpowerSlot.slotCode,
          trade: rec.manpowerSlot.trade,
          hourlyRate: Number(rec.manpowerSlot.hourlyRate),
        },
        totalHours: billable,
      });
    }
  }

  // 4. Group slot totals by agency
  const agencyMap = new Map<
    string,
    { totalHours: number; totalAmount: number; lines: { slotId: string; hours: number; rate: number; lineTotal: number }[] }
  >();

  for (const { slot, totalHours } of slotHours.values()) {
    const lineTotal = totalHours * slot.hourlyRate;
    const existing = agencyMap.get(slot.agencyId);
    if (existing) {
      existing.totalHours += totalHours;
      existing.totalAmount += lineTotal;
      existing.lines.push({ slotId: slot.id, hours: totalHours, rate: slot.hourlyRate, lineTotal });
    } else {
      agencyMap.set(slot.agencyId, {
        totalHours,
        totalAmount: lineTotal,
        lines: [{ slotId: slot.id, hours: totalHours, rate: slot.hourlyRate, lineTotal }],
      });
    }
  }

  result.agenciesProcessed = agencyMap.size;

  // 5. Upsert one ManpowerInvoiceDraft per agency
  for (const [agencyId, data] of agencyMap.entries()) {
    try {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        select: { id: true, nameEn: true },
      });
      if (!agency) {
        result.errors.push({ agencyId, agencyName: agencyId, message: 'Agency not found' });
        continue;
      }

      // Check for existing draft
      const existing = await prisma.manpowerInvoiceDraft.findUnique({
        where: { agencyId_payrollPeriodId: { agencyId, payrollPeriodId: periodId } },
        select: { id: true, status: true },
      });

      if (existing && existing.status !== 'DRAFT') {
        // Don't overwrite CONFIRMED/PUSHED/PAID drafts
        logger.info({ draftId: existing.id, status: existing.status }, '[ManpowerBilling] Skipping non-DRAFT invoice');
        result.draftsSkipped++;
        continue;
      }

      const totalHoursDecimal = Math.round(data.totalHours * 100) / 100;
      const totalAmountDecimal = Math.round(data.totalAmount * 100) / 100;

      if (existing) {
        // Overwrite DRAFT — delete old lines then recreate
        await prisma.$transaction([
          prisma.manpowerInvoiceLine.deleteMany({ where: { invoiceDraftId: existing.id } }),
          prisma.manpowerInvoiceDraft.update({
            where: { id: existing.id },
            data: {
              periodStart,
              periodEnd,
              totalHours: totalHoursDecimal.toString(),
              totalAmount: totalAmountDecimal.toString(),
              updatedById: triggeredById,
            },
          }),
          prisma.manpowerInvoiceLine.createMany({
            data: data.lines.map(l => ({
              invoiceDraftId: existing.id,
              manpowerSlotId: l.slotId,
              totalHours: (Math.round(l.hours * 100) / 100).toString(),
              hourlyRate: l.rate.toString(),
              lineTotal: (Math.round(l.lineTotal * 100) / 100).toString(),
            })),
          }),
        ]);
        result.draftsUpdated++;
        logger.info({ draftId: existing.id, agencyId, totalHours: totalHoursDecimal }, '[ManpowerBilling] Draft updated');
      } else {
        // Create new draft
        const draft = await prisma.manpowerInvoiceDraft.create({
          data: {
            agencyId,
            payrollPeriodId: periodId,
            periodStart,
            periodEnd,
            status: 'DRAFT',
            totalHours: totalHoursDecimal.toString(),
            totalAmount: totalAmountDecimal.toString(),
            createdById: triggeredById,
          },
        });
        await prisma.manpowerInvoiceLine.createMany({
          data: data.lines.map(l => ({
            invoiceDraftId: draft.id,
            manpowerSlotId: l.slotId,
            totalHours: (Math.round(l.hours * 100) / 100).toString(),
            hourlyRate: l.rate.toString(),
            lineTotal: (Math.round(l.lineTotal * 100) / 100).toString(),
          })),
        });
        result.draftsCreated++;
        logger.info({ draftId: draft.id, agencyId, totalHours: totalHoursDecimal }, '[ManpowerBilling] Draft created');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ agencyId, agencyName: agencyId, message: msg });
      logger.error({ error: err, agencyId, periodId }, '[ManpowerBilling] Error generating draft for agency');
    }
  }

  return result;
}
