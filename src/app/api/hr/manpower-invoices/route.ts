/**
 * GET  /api/hr/manpower-invoices  — list invoice drafts (filterable by status/period/agency)
 * POST /api/hr/manpower-invoices  — manually trigger generation for a period
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { generateManpowerInvoicesForPeriod } from '@/lib/services/hr/manpower-invoice-generator';

const generateSchema = z.object({
  payrollPeriodId: z.string().min(1),
});

export const GET = withApiContext(async (req: NextRequest) => {
  const canView = await checkPermission('hr.billing.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const payrollPeriodId = searchParams.get('payrollPeriodId') ?? undefined;
  const agencyId = searchParams.get('agencyId') ?? undefined;

  const drafts = await prisma.manpowerInvoiceDraft.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status: status as 'DRAFT' | 'CONFIRMED' | 'PUSHED' | 'PAID' } : {}),
      ...(payrollPeriodId ? { payrollPeriodId } : {}),
      ...(agencyId ? { agencyId } : {}),
    },
    include: {
      agency: { select: { id: true, nameEn: true, nameAr: true, dolibarrThirdPartyId: true } },
      payrollPeriod: { select: { id: true, year: true, month: true } },
      lines: {
        include: {
          manpowerSlot: { select: { id: true, slotCode: true, trade: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ payrollPeriod: { year: 'desc' } }, { payrollPeriod: { month: 'desc' } }, { agency: { nameEn: 'asc' } }],
  });

  return NextResponse.json(drafts);
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const canManage = await checkPermission('hr.billing.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body: unknown = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { payrollPeriodId } = parsed.data;
  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollPeriodId } });
  if (!period) {
    return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
  }

  try {
    const result = await generateManpowerInvoicesForPeriod(payrollPeriodId, session!.userId);
    logger.info({ result, triggeredById: session!.userId }, '[ManpowerBilling] Manual generation triggered');
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    logger.error({ error: err, payrollPeriodId }, '[ManpowerBilling] Manual generation failed');
    return NextResponse.json({ error: 'Generation failed', details: String(err) }, { status: 500 });
  }
});
