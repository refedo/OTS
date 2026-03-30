import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  invoiceDolibarrId: z.number().int().nullable().optional(),
  invoiceRef: z.string().max(100).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  triggerType: z.enum(['date', 'milestone', 'delivery', 'drawing_approval', 'manual']).nullable().optional(),
  triggerDescription: z.string().max(500).nullable().optional(),
  actionRequired: z.enum(['issue_invoice', 'collection_call', 'stop_shipping', 'proceed_shipping', 'on_hold', 'no_action']).nullable().optional(),
  actionNotes: z.string().nullable().optional(),
  status: z.enum(['pending', 'triggered', 'invoiced', 'collected', 'overdue']).optional(),
});

export const PUT = withApiContext(async (req: NextRequest, session, ctx) => {
  const hasAccess = await checkPermission('financial.manage');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied. Financial manage permissions required.' }, { status: 403 });
  }

  const id = parseInt(ctx?.params.id ?? '', 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { dueDate, ...rest } = parsed.data;

  try {
    const record = await prisma.projectPaymentSchedule.update({
      where: { id },
      data: {
        ...rest,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        updatedById: session!.userId,
      },
    });

    logger.info({ recordId: record.id }, 'Payment schedule enrichment updated');
    return NextResponse.json(record);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update payment schedule enrichment');
    return NextResponse.json({ error: 'Failed to update payment schedule data' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, ctx) => {
  const hasAccess = await checkPermission('financial.manage');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied. Financial manage permissions required.' }, { status: 403 });
  }

  const id = parseInt(ctx?.params.id ?? '', 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await prisma.projectPaymentSchedule.delete({ where: { id } });
    logger.info({ recordId: id }, 'Payment schedule enrichment deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete payment schedule enrichment');
    return NextResponse.json({ error: 'Failed to delete payment schedule data' }, { status: 500 });
  }
});
