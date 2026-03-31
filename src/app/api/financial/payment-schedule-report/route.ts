import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

const PAYMENT_SLOTS = [
  'downPayment',
  'payment2',
  'payment3',
  'payment4',
  'payment5',
  'payment6',
  'preliminaryRetention',
  'hoRetention',
] as const;

type PaymentSlot = typeof PAYMENT_SLOTS[number];

interface RawInvoice {
  id: number;
  ref: string;
  ref_client: string | null;
  total_ttc: number;
  date_invoice: string | null;
  date_due: string | null;
  is_paid: number;
  status: number;
}

function toNum(v: Decimal | null | undefined): number {
  if (v == null) return 0;
  return Number(v);
}

const upsertSchema = z.object({
  projectId: z.string().min(1),
  paymentSlot: z.enum(PAYMENT_SLOTS),
  invoiceDolibarrId: z.number().int().nullable().optional(),
  invoiceRef: z.string().max(100).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  triggerType: z.enum(['date', 'milestone', 'delivery', 'drawing_approval', 'manual']).nullable().optional(),
  triggerDescription: z.string().max(500).nullable().optional(),
  actionRequired: z.enum(['issue_invoice', 'collection_call', 'stop_shipping', 'proceed_shipping', 'on_hold', 'no_action']).nullable().optional(),
  actionNotes: z.string().nullable().optional(),
  status: z.enum(['pending', 'triggered', 'invoiced', 'collected', 'overdue']).optional(),
});

export const GET = withApiContext(async (req: NextRequest, session) => {
  const hasAccess = await checkPermission('financial.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied. Financial permissions required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filterProjectId = searchParams.get('projectId') || undefined;
  const filterStatus = searchParams.get('status') || undefined;
  const filterAction = searchParams.get('action') || undefined;
  const filterProjectStatus = searchParams.get('projectStatus') || undefined;
  const filterDateFrom = searchParams.get('dateFrom') || undefined;
  const filterDateTo = searchParams.get('dateTo') || undefined;

  try {
    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        ...(filterProjectId ? { id: filterProjectId } : {}),
        ...(filterProjectStatus ? { status: filterProjectStatus } : {}),
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        contractValue: true,
        downPaymentPercentage: true,
        downPayment: true,
        downPaymentAck: true,
        downPaymentMilestone: true,
        downPaymentDate: true,
        payment2Percentage: true,
        payment2: true,
        payment2Ack: true,
        payment2Milestone: true,
        payment3Percentage: true,
        payment3: true,
        payment3Ack: true,
        payment3Milestone: true,
        payment4Percentage: true,
        payment4: true,
        payment4Ack: true,
        payment4Milestone: true,
        payment5Percentage: true,
        payment5: true,
        payment5Ack: true,
        payment5Milestone: true,
        payment6Percentage: true,
        payment6: true,
        payment6Ack: true,
        payment6Milestone: true,
        preliminaryRetention: true,
        hoRetention: true,
        client: { select: { id: true, name: true } },
        paymentSchedules: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch available Dolibarr invoices for linking
    let invoices: RawInvoice[] = [];
    try {
      invoices = await prisma.$queryRaw<RawInvoice[]>`
        SELECT id, ref, ref_client, total_ttc, date_invoice, date_due, is_paid, status
        FROM fin_customer_invoices
        WHERE is_active = 1
        ORDER BY date_invoice DESC
        LIMIT 500
      `;
    } catch {
      // fin_customer_invoices may not exist if financial sync hasn't run
    }

    // Flatten project payment slots into rows
    type EnrichmentRecord = (typeof projects)[number]['paymentSchedules'][number];

    const allRows: {
      id: string;
      projectId: string;
      projectNumber: string;
      projectName: string;
      projectStatus: string;
      clientName: string;
      paymentSlot: PaymentSlot;
      slotLabel: string;
      percentage: number;
      amount: number;
      ack: boolean;
      milestone: string | null;
      baseDate: Date | null;
      enrichment: EnrichmentRecord | null;
    }[] = [];

    for (const project of projects) {
      const enrichmentMap = new Map(
        project.paymentSchedules.map((e) => [e.paymentSlot, e])
      );

      const slots: Array<{
        slot: PaymentSlot;
        label: string;
        percentage: Decimal | null;
        amount: Decimal | null;
        ack: boolean;
        milestone: string | null;
        baseDate: Date | null;
      }> = [
        {
          slot: 'downPayment',
          label: 'Down Payment',
          percentage: project.downPaymentPercentage,
          amount: project.downPayment,
          ack: project.downPaymentAck,
          milestone: project.downPaymentMilestone,
          baseDate: project.downPaymentDate,
        },
        { slot: 'payment2', label: 'Payment 2', percentage: project.payment2Percentage, amount: project.payment2, ack: project.payment2Ack, milestone: project.payment2Milestone, baseDate: null },
        { slot: 'payment3', label: 'Payment 3', percentage: project.payment3Percentage, amount: project.payment3, ack: project.payment3Ack, milestone: project.payment3Milestone, baseDate: null },
        { slot: 'payment4', label: 'Payment 4', percentage: project.payment4Percentage, amount: project.payment4, ack: project.payment4Ack, milestone: project.payment4Milestone, baseDate: null },
        { slot: 'payment5', label: 'Payment 5', percentage: project.payment5Percentage, amount: project.payment5, ack: project.payment5Ack, milestone: project.payment5Milestone, baseDate: null },
        { slot: 'payment6', label: 'Payment 6', percentage: project.payment6Percentage, amount: project.payment6, ack: project.payment6Ack, milestone: project.payment6Milestone, baseDate: null },
        {
          slot: 'preliminaryRetention',
          label: 'Preliminary Retention',
          percentage: null,
          amount: project.preliminaryRetention,
          ack: false,
          milestone: null,
          baseDate: null,
        },
        {
          slot: 'hoRetention',
          label: 'HO Retention',
          percentage: null,
          amount: project.hoRetention,
          ack: false,
          milestone: null,
          baseDate: null,
        },
      ];

      for (const s of slots) {
        const amount = toNum(s.amount);
        if (amount <= 0) continue;

        const enrichment = enrichmentMap.get(s.slot) ?? null;

        allRows.push({
          id: `${project.id}::${s.slot}`,
          projectId: project.id,
          projectNumber: project.projectNumber,
          projectName: project.name,
          projectStatus: project.status,
          clientName: project.client.name,
          paymentSlot: s.slot,
          slotLabel: s.label,
          percentage: toNum(s.percentage),
          amount,
          ack: s.ack,
          milestone: s.milestone,
          baseDate: s.baseDate,
          enrichment,
        });
      }
    }

    // Apply enrichment-based filters
    const now = new Date();

    function computeEffectiveStatus(row: typeof allRows[number]): string {
      const e = row.enrichment;
      // Down payment with a date set is always received (precondition to start the project)
      if (row.paymentSlot === 'downPayment' && row.baseDate) {
        if (!e || e.status === 'pending') return 'collected';
      }
      if (!e) return 'pending';
      if (e.status === 'collected' || e.status === 'invoiced') return e.status;
      const dueDate = e.dueDate ?? row.baseDate;
      if (dueDate && dueDate < now) return 'overdue';
      return e.status;
    }

    const filteredRows = allRows.filter((row) => {
      const e = row.enrichment;
      const effectiveStatus = computeEffectiveStatus(row);

      if (filterStatus && effectiveStatus !== filterStatus) return false;
      if (filterAction && e?.actionRequired !== filterAction) return false;
      if (filterDateFrom && e?.dueDate && e.dueDate < new Date(filterDateFrom)) return false;
      if (filterDateTo && e?.dueDate && e.dueDate > new Date(filterDateTo)) return false;

      return true;
    });

    // Summary totals
    const summary = filteredRows.reduce(
      (acc, row) => {
        const effectiveStatus = computeEffectiveStatus(row);

        acc.total += row.amount;
        if (effectiveStatus === 'collected') acc.collected += row.amount;
        else if (effectiveStatus === 'overdue') acc.overdue += row.amount;
        else acc.pending += row.amount;
        return acc;
      },
      { total: 0, collected: 0, pending: 0, overdue: 0 }
    );

    return NextResponse.json({ rows: filteredRows, summary, invoices });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch payment schedule report');
    return NextResponse.json({ error: 'Failed to fetch payment schedule report' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const hasAccess = await checkPermission('financial.manage');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied. Financial manage permissions required.' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, paymentSlot, dueDate, ...rest } = parsed.data;

  try {
    const record = await prisma.projectPaymentSchedule.upsert({
      where: { projectId_paymentSlot: { projectId, paymentSlot } },
      update: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : null,
        updatedById: session!.userId,
      },
      create: {
        projectId,
        paymentSlot,
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session!.userId,
        updatedById: session!.userId,
      },
    });

    logger.info({ recordId: record.id, projectId, paymentSlot }, 'Payment schedule enrichment upserted');
    return NextResponse.json(record);
  } catch (error) {
    logger.error({ error, projectId, paymentSlot }, 'Failed to upsert payment schedule enrichment');
    return NextResponse.json({ error: 'Failed to save payment schedule data' }, { status: 500 });
  }
});
