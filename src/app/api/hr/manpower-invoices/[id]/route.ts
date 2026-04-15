/**
 * GET    /api/hr/manpower-invoices/[id]  — get single draft with full lines
 * PUT    /api/hr/manpower-invoices/[id]  — update notes or line hours (DRAFT only)
 * DELETE /api/hr/manpower-invoices/[id]  — soft-delete a DRAFT/CONFIRMED
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  notes: z.string().max(1000).optional(),
  lines: z
    .array(
      z.object({
        id: z.string(),
        totalHours: z.number().min(0),
        hourlyRate: z.number().min(0),
      }),
    )
    .optional(),
});

const deleteSchema = z.object({
  deleteReason: z.string().min(1).max(500),
});

export const GET = withApiContext(async (_req: NextRequest, _session, ctx) => {
  const canView = await checkPermission('hr.billing.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = ctx?.params?.id as string;
  const draft = await prisma.manpowerInvoiceDraft.findUnique({
    where: { id },
    include: {
      agency: { select: { id: true, nameEn: true, nameAr: true, dolibarrThirdPartyId: true } },
      payrollPeriod: { select: { id: true, year: true, month: true, cutoffDate: true } },
      lines: {
        include: {
          manpowerSlot: { select: { id: true, slotCode: true, trade: true } },
        },
        orderBy: { manpowerSlot: { slotCode: 'asc' } },
      },
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  });

  if (!draft || draft.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(draft);
});

export const PUT = withApiContext(async (req: NextRequest, session, ctx) => {
  const canManage = await checkPermission('hr.billing.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = ctx?.params?.id as string;
  const draft = await prisma.manpowerInvoiceDraft.findUnique({
    where: { id },
    select: { id: true, status: true, deletedAt: true },
  });

  if (!draft || draft.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (draft.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only DRAFT invoices can be edited' }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { notes, lines } = parsed.data;
  const updates: Record<string, unknown> = { updatedById: session!.userId };
  if (notes !== undefined) updates.notes = notes;

  // Update individual line adjustments
  if (lines && lines.length > 0) {
    await Promise.all(
      lines.map((l: { id: string; totalHours: number; hourlyRate: number }) =>
        prisma.manpowerInvoiceLine.update({
          where: { id: l.id },
          data: {
            totalHours: l.totalHours.toString(),
            hourlyRate: l.hourlyRate.toString(),
            lineTotal: (l.totalHours * l.hourlyRate).toFixed(2),
          },
        }),
      ),
    );

    // Recalculate draft totals
    const allLines = await prisma.manpowerInvoiceLine.findMany({
      where: { invoiceDraftId: id },
      select: { totalHours: true, lineTotal: true },
    });
    const totalHours = allLines.reduce((s: number, l: { totalHours: unknown }) => s + Number(l.totalHours), 0);
    const totalAmount = allLines.reduce((s: number, l: { lineTotal: unknown }) => s + Number(l.lineTotal), 0);
    updates.totalHours = (Math.round(totalHours * 100) / 100).toString();
    updates.totalAmount = (Math.round(totalAmount * 100) / 100).toString();
  }

  const updated = await prisma.manpowerInvoiceDraft.update({ where: { id }, data: updates });
  logger.info({ id, updatedById: session!.userId }, '[ManpowerBilling] Draft updated');
  return NextResponse.json(updated);
});

export const DELETE = withApiContext(async (req: NextRequest, session, ctx) => {
  const canManage = await checkPermission('hr.billing.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = ctx?.params?.id as string;
  const draft = await prisma.manpowerInvoiceDraft.findUnique({
    where: { id },
    select: { id: true, status: true, deletedAt: true },
  });

  if (!draft || draft.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!['DRAFT', 'CONFIRMED'].includes(draft.status)) {
    return NextResponse.json({ error: 'Cannot delete a PUSHED or PAID invoice' }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'deleteReason is required' }, { status: 400 });
  }

  const deleted = await prisma.manpowerInvoiceDraft.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: session!.userId, deleteReason: parsed.data.deleteReason },
  });

  logger.info({ id, deletedById: session!.userId }, '[ManpowerBilling] Draft soft-deleted');
  return NextResponse.json(deleted);
});
