import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  generateCertificateNumber,
  getLastCertificateTotals,
  getNextCertSequence,
} from '@/lib/services/subcontractor-contract.service';

const createCertSchema = z.object({
  certificateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  periodTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  currentPercentage: z.number().min(0).max(100),
  dolibarrInvoiceRef: z.string().optional().nullable(),
  dolibarrInvoiceId: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const GET = withApiContext(async (_req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const contractId = context?.params.id;
  if (!contractId) return NextResponse.json({ error: 'Missing contract id' }, { status: 400 });

  try {
    const certs = await prisma.subcontractorPaymentCertificate.findMany({
      where: { contractId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(certs);
  } catch (error) {
    logger.error({ error, contractId }, '[SC Certs] Failed to list certificates');
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const contractId = context?.params.id;
  if (!contractId) return NextResponse.json({ error: 'Missing contract id' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = createCertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;

  try {
    const contract = await prisma.subcontractorContract.findUnique({
      where: { id: contractId, deletedAt: null },
    });
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    if (contract.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Payment certificates can only be created for ACTIVE contracts' }, { status: 409 });
    }

    const prev = await getLastCertificateTotals(contractId);
    const cumulativePercentage = prev.cumulativePercentage + data.currentPercentage;
    if (cumulativePercentage > 100) {
      return NextResponse.json({ error: 'Cumulative percentage would exceed 100%' }, { status: 409 });
    }

    const contractValue = Number(contract.contractValue);
    const currentAmount = (data.currentPercentage / 100) * contractValue;
    const cumulativeAmount = prev.cumulativeAmount + currentAmount;
    const retentionAmount = currentAmount * (Number(contract.retentionPercentage) / 100);
    const netAmountDue = currentAmount - retentionAmount;

    const sequence = await getNextCertSequence(contractId);
    const certificateNumber = generateCertificateNumber(contract.contractNumber, sequence);

    const cert = await prisma.subcontractorPaymentCertificate.create({
      data: {
        certificateNumber,
        contractId,
        certificateDate: new Date(data.certificateDate),
        periodFrom: data.periodFrom ? new Date(data.periodFrom) : null,
        periodTo: data.periodTo ? new Date(data.periodTo) : null,
        currentPercentage: data.currentPercentage,
        previousCumulativePercentage: prev.cumulativePercentage,
        cumulativePercentage,
        currentAmount,
        previousCumulativeAmount: prev.cumulativeAmount,
        cumulativeAmount,
        retentionAmount,
        netAmountDue,
        paidAmount: 0,
        status: 'DRAFT',
        dolibarrInvoiceRef: data.dolibarrInvoiceRef ?? null,
        dolibarrInvoiceId: data.dolibarrInvoiceId ?? null,
        notes: data.notes ?? null,
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    logger.info({ certId: cert.id, certificateNumber, contractId }, '[SC Certs] Certificate created');
    return NextResponse.json(cert, { status: 201 });
  } catch (error) {
    logger.error({ error, contractId }, '[SC Certs] Failed to create certificate');
    return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
  }
});
