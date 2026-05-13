import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  deductionDate: z.string().optional(),
  reason: z.string().optional().nullable(),
});

export const GET = withApiContext(async (_req: NextRequest, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.view'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contractId = ctx?.params?.id;
  if (!contractId) return NextResponse.json({ error: 'Missing contract ID' }, { status: 400 });

  try {
    const deductions = await prisma.subcontractorDeduction.findMany({
      where: { contractId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(deductions.map(d => ({
      ...d,
      amount: Number(d.amount),
      deductionDate: d.deductionDate.toISOString().split('T')[0],
      approvedAt: d.approvedAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })));
  } catch (error) {
    logger.error({ error }, '[SC Deductions] Failed to list');
    return NextResponse.json({ error: 'Failed to fetch deductions' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.edit'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contractId = ctx?.params?.id;
  if (!contractId) return NextResponse.json({ error: 'Missing contract ID' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  const contract = await prisma.subcontractorContract.findFirst({
    where: { id: contractId, deletedAt: null },
    select: { id: true },
  });
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  try {
    const deduction = await prisma.subcontractorDeduction.create({
      data: {
        contractId,
        description: parsed.data.description,
        amount: parsed.data.amount,
        deductionDate: parsed.data.deductionDate ? new Date(parsed.data.deductionDate) : new Date(),
        reason: parsed.data.reason ?? null,
        status: 'PENDING',
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    logger.info({ deductionId: deduction.id, contractId }, '[SC Deductions] Created');
    return NextResponse.json({ ...deduction, amount: Number(deduction.amount) }, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[SC Deductions] Failed to create');
    return NextResponse.json({ error: 'Failed to create deduction' }, { status: 500 });
  }
});
