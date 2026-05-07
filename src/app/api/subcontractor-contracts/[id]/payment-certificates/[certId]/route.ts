import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const certActionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'mark_paid']),
  paidAmount: z.number().min(0).optional(),
  dolibarrInvoiceRef: z.string().optional().nullable(),
  dolibarrInvoiceId: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const CERT_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'DRAFT'],
  APPROVED: ['PAID'],
  PAID: [],
  CANCELLED: [],
};

const CERT_ACTION_TO_STATUS: Record<string, string> = {
  submit: 'SUBMITTED',
  approve: 'APPROVED',
  reject: 'DRAFT',
  mark_paid: 'PAID',
};

export const GET = withApiContext(async (_req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const certId = context?.params.certId;
  if (!certId) return NextResponse.json({ error: 'Missing cert id' }, { status: 400 });

  try {
    const cert = await prisma.subcontractorPaymentCertificate.findUnique({
      where: { id: certId, deletedAt: null },
      include: {
        contract: {
          select: { id: true, contractNumber: true, name: true, contractValue: true, retentionPercentage: true, status: true },
        },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    return NextResponse.json(cert);
  } catch (error) {
    logger.error({ error, certId }, '[SC Certs] Failed to fetch certificate');
    return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 });
  }
});

export const PATCH = withApiContext(async (req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const certId = context?.params.certId;
  if (!certId) return NextResponse.json({ error: 'Missing cert id' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = certActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  const { action, paidAmount, dolibarrInvoiceRef, dolibarrInvoiceId, notes } = parsed.data;
  const newStatus = CERT_ACTION_TO_STATUS[action];

  try {
    const cert = await prisma.subcontractorPaymentCertificate.findUnique({
      where: { id: certId, deletedAt: null },
    });
    if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });

    const allowed = CERT_TRANSITIONS[cert.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot transition certificate from ${cert.status} to ${newStatus}`,
      }, { status: 409 });
    }

    const now = new Date();
    const updated = await prisma.subcontractorPaymentCertificate.update({
      where: { id: certId },
      data: {
        status: newStatus,
        ...(action === 'submit' ? { submittedAt: now } : {}),
        ...(action === 'approve' ? { approvedAt: now, approvedById: session.userId } : {}),
        ...(action === 'reject' ? { submittedAt: null } : {}),
        ...(action === 'mark_paid' ? { paidAt: now, paidAmount: paidAmount ?? cert.netAmountDue } : {}),
        ...(dolibarrInvoiceRef !== undefined ? { dolibarrInvoiceRef } : {}),
        ...(dolibarrInvoiceId !== undefined ? { dolibarrInvoiceId } : {}),
        ...(notes !== undefined ? { notes } : {}),
        updatedById: session.userId,
      },
    });

    logger.info({ certId, action, newStatus }, '[SC Certs] Certificate status updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, certId, action }, '[SC Certs] Failed to update certificate');
    return NextResponse.json({ error: 'Failed to update certificate' }, { status: 500 });
  }
});
