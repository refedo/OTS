/**
 * POST /api/hr/manpower-invoices/[id]/push
 * Pushes a CONFIRMED invoice to Dolibarr as a supplier (vendor) invoice.
 * Requires the agency to have dolibarrThirdPartyId set.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';

export const POST = withApiContext(async (_req: NextRequest, session, ctx) => {
  const canPush = await checkPermission('hr.billing.push');
  if (!canPush) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = ctx?.params?.id as string;
  const draft = await prisma.manpowerInvoiceDraft.findUnique({
    where: { id },
    include: {
      agency: { select: { id: true, nameEn: true, dolibarrThirdPartyId: true } },
      payrollPeriod: { select: { year: true, month: true } },
      lines: {
        include: {
          manpowerSlot: { select: { slotCode: true, trade: true } },
        },
      },
    },
  });

  if (!draft || draft.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (draft.status !== 'CONFIRMED') {
    return NextResponse.json(
      { error: `Only CONFIRMED invoices can be pushed (current: ${draft.status})` },
      { status: 400 },
    );
  }
  if (!draft.agency.dolibarrThirdPartyId) {
    return NextResponse.json(
      { error: 'Agency has no Dolibarr third-party ID. Set dolibarrThirdPartyId on the agency first.' },
      { status: 422 },
    );
  }

  // Build OTS reference: MPOWER-YYYY-MM-<AGENCY_SUFFIX>
  const agencySuffix = draft.agency.nameEn.replace(/\s+/g, '').slice(0, 6).toUpperCase();
  const refSupplier = `MPOWER-${draft.payrollPeriod.year}-${String(draft.payrollPeriod.month).padStart(2, '0')}-${agencySuffix}`;

  const dolibarrLines = draft.lines.map((l: { manpowerSlot: { slotCode: string; trade: string }; totalHours: unknown; lineTotal: unknown }) => ({
    label: `${l.manpowerSlot.slotCode} — ${l.manpowerSlot.trade} (${Number(l.totalHours).toFixed(2)} h)`,
    qty: 1,
    unitPrice: Number(l.lineTotal),
  }));

  try {
    const client = createDolibarrClient();
    const dolibarrInvoiceId = await client.createSupplierInvoice({
      thirdPartyId: draft.agency.dolibarrThirdPartyId,
      refSupplier,
      date: new Date(),
      lines: dolibarrLines,
      note: `Manpower billing — ${draft.agency.nameEn} — ${draft.payrollPeriod.year}/${String(draft.payrollPeriod.month).padStart(2, '0')}`,
    });

    const updated = await prisma.manpowerInvoiceDraft.update({
      where: { id },
      data: {
        status: 'PUSHED',
        dolibarrInvoiceId,
        dolibarrInvoiceRef: refSupplier,
        pushedAt: new Date(),
        updatedById: session!.userId,
      },
    });

    logger.info({ id, dolibarrInvoiceId, refSupplier, pushedById: session!.userId }, '[ManpowerBilling] Invoice pushed to Dolibarr');
    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ error: err, id }, '[ManpowerBilling] Dolibarr push failed');
    return NextResponse.json({ error: 'Dolibarr push failed', details: String(err) }, { status: 502 });
  }
});
