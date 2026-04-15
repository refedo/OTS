/**
 * GET /api/hr/manpower-invoices/[id]/reconcile
 * Reconciliation report: raw attendance hours vs invoice hours per slot.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';

export const GET = withApiContext(async (_req: NextRequest, _session, ctx) => {
  const canView = await checkPermission('hr.billing.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = ctx?.params?.id as string;
  const draft = await prisma.manpowerInvoiceDraft.findUnique({
    where: { id },
    include: {
      agency: { select: { id: true, nameEn: true } },
      payrollPeriod: { select: { year: true, month: true, cutoffDate: true } },
      lines: {
        include: {
          manpowerSlot: { select: { id: true, slotCode: true, trade: true } },
        },
      },
    },
  });

  if (!draft || draft.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const periodStart = new Date(Date.UTC(draft.payrollPeriod.year, draft.payrollPeriod.month - 1, 1));
  const periodEnd = draft.payrollPeriod.cutoffDate;

  type DraftLine = { manpowerSlotId: string; totalHours: unknown; manpowerSlot: { slotCode: string; trade: string } };
  const slotIds = (draft.lines as DraftLine[]).map(l => l.manpowerSlotId);
  const records = await prisma.attendanceRecord.findMany({
    where: {
      manpowerSlotId: { in: slotIds },
      date: { gte: periodStart, lte: periodEnd },
    },
    select: { manpowerSlotId: true, regularHours: true, overtimeHours: true, otMultiplier: true },
  });

  // Aggregate raw attendance per slot
  const rawBySlot = new Map<string, number>();
  for (const rec of records) {
    if (!rec.manpowerSlotId) continue;
    const billable =
      Number(rec.regularHours ?? 0) +
      Number(rec.overtimeHours ?? 0) * Number(rec.otMultiplier ?? 1.0);
    rawBySlot.set(rec.manpowerSlotId, (rawBySlot.get(rec.manpowerSlotId) ?? 0) + billable);
  }

  const rows = (draft.lines as DraftLine[]).map(l => {
    const rawHours = Math.round((rawBySlot.get(l.manpowerSlotId) ?? 0) * 100) / 100;
    const invoiceHours = Number(l.totalHours);
    const delta = Math.round((invoiceHours - rawHours) * 100) / 100;
    return {
      slotId: l.manpowerSlotId,
      slotCode: l.manpowerSlot.slotCode,
      trade: l.manpowerSlot.trade,
      rawAttendanceHours: rawHours,
      invoiceHours,
      delta,
      matched: Math.abs(delta) < 0.01,
    };
  });

  type ReconcileRow = { rawAttendanceHours: number; invoiceHours: number; matched: boolean };
  const totalRaw = Math.round(rows.reduce((s: number, r: ReconcileRow) => s + r.rawAttendanceHours, 0) * 100) / 100;
  const totalInvoice = Math.round(rows.reduce((s: number, r: ReconcileRow) => s + r.invoiceHours, 0) * 100) / 100;

  return NextResponse.json({
    draftId: id,
    agency: draft.agency,
    period: { year: draft.payrollPeriod.year, month: draft.payrollPeriod.month },
    rows,
    summary: {
      totalRawHours: totalRaw,
      totalInvoiceHours: totalInvoice,
      delta: Math.round((totalInvoice - totalRaw) * 100) / 100,
      allMatched: rows.every((r: ReconcileRow) => r.matched),
    },
  });
});
