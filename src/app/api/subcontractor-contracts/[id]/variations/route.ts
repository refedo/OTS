import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number(),
  notes: z.string().optional().nullable(),
});

export const GET = withApiContext(async (_req: NextRequest, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('subcontractors.view'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contractId = ctx?.params?.id;
  if (!contractId) return NextResponse.json({ error: 'Missing contract ID' }, { status: 400 });

  try {
    const variations = await prisma.subcontractorVariation.findMany({
      where: { contractId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(variations.map(v => ({
      ...v,
      amount: Number(v.amount),
      approvedAt: v.approvedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })));
  } catch (error) {
    logger.error({ error }, '[SC Variations] Failed to list');
    return NextResponse.json({ error: 'Failed to fetch variations' }, { status: 500 });
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

  try {
    const contract = await prisma.subcontractorContract.findFirst({
      where: { id: contractId, deletedAt: null },
      select: { contractNumber: true },
    });
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const count = await prisma.subcontractorVariation.count({ where: { contractId, deletedAt: null } });
    const variationNumber = `${contract.contractNumber}-VAR-${String(count + 1).padStart(3, '0')}`;

    const variation = await prisma.subcontractorVariation.create({
      data: {
        contractId,
        variationNumber,
        description: parsed.data.description,
        amount: parsed.data.amount,
        notes: parsed.data.notes ?? null,
        status: 'PENDING',
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    logger.info({ variationId: variation.id, contractId }, '[SC Variations] Created');
    return NextResponse.json({ ...variation, amount: Number(variation.amount) }, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[SC Variations] Failed to create');
    return NextResponse.json({ error: 'Failed to create variation' }, { status: 500 });
  }
});
