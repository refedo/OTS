import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';

const receiptSchema = z.object({
  amount: z.number().positive(),
  receivedDate: z.string().min(1),
  invoiceRef: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const POST = withApiContext(async (req: NextRequest, session, ctx) => {
  const hasAccess = await checkPermission('financial.manage');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const scheduleId = parseInt(ctx?.params.id ?? '', 10);
  if (isNaN(scheduleId)) {
    return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
  }

  const body = await req.json();
  const parsed = receiptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { amount, receivedDate, invoiceRef, notes } = parsed.data;

  try {
    // Create receipt and re-aggregate receivedAmount on the parent schedule
    const [receipt] = await prisma.$transaction([
      prisma.projectPaymentReceipt.create({
        data: {
          scheduleId,
          amount,
          receivedDate: new Date(receivedDate),
          invoiceRef: invoiceRef ?? null,
          notes: notes ?? null,
          createdById: session!.userId,
        },
      }),
    ]);

    // Recalculate total received and update parent status
    const allReceipts = await prisma.projectPaymentReceipt.findMany({
      where: { scheduleId },
      select: { amount: true },
    });
    const totalReceived = allReceipts.reduce((s, r) => s + Number(r.amount), 0);

    const schedule = await prisma.projectPaymentSchedule.findUnique({
      where: { id: scheduleId },
      select: { status: true },
    });

    // Only auto-update status if not already manually set to collected/invoiced
    let newStatus: string | undefined;
    if (schedule && !['collected', 'invoiced'].includes(schedule.status)) {
      newStatus = totalReceived > 0 ? 'partially_received' : 'pending';
    }

    await prisma.projectPaymentSchedule.update({
      where: { id: scheduleId },
      data: {
        receivedAmount: totalReceived,
        ...(newStatus ? { status: newStatus } : {}),
        updatedById: session!.userId,
      },
    });

    logger.info({ scheduleId, amount, totalReceived }, 'Payment receipt recorded');
    return NextResponse.json({ receipt, totalReceived }, { status: 201 });
  } catch (error) {
    logger.error({ error, scheduleId }, 'Failed to record payment receipt');
    return NextResponse.json({ error: 'Failed to record receipt' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, ctx) => {
  const hasAccess = await checkPermission('financial.manage');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const scheduleId = parseInt(ctx?.params.id ?? '', 10);
  const { searchParams } = new URL(req.url);
  const receiptId = parseInt(searchParams.get('receiptId') ?? '', 10);

  if (isNaN(scheduleId) || isNaN(receiptId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await prisma.projectPaymentReceipt.delete({ where: { id: receiptId, scheduleId } });

    // Recalculate total received
    const allReceipts = await prisma.projectPaymentReceipt.findMany({
      where: { scheduleId },
      select: { amount: true },
    });
    const totalReceived = allReceipts.reduce((s, r) => s + Number(r.amount), 0);

    await prisma.projectPaymentSchedule.update({
      where: { id: scheduleId },
      data: {
        receivedAmount: totalReceived > 0 ? totalReceived : null,
        status: totalReceived > 0 ? 'partially_received' : 'pending',
        updatedById: session!.userId,
      },
    });

    return NextResponse.json({ success: true, totalReceived });
  } catch (error) {
    logger.error({ error, scheduleId, receiptId }, 'Failed to delete payment receipt');
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 });
  }
});
