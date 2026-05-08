import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import {
  getSupplierEvaluations,
  createEvaluation,
} from '@/lib/services/supply-chain/supplier-portal.service';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const scoreField = z.number().int().min(1).max(5);

const createSchema = z.object({
  evaluation_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  evaluation_period:    z.string().optional().nullable(),
  score_quality:        scoreField,
  score_delivery:       scoreField,
  score_price:          scoreField,
  score_service:        scoreField,
  score_documentation:  scoreField,
  score_hse:            scoreField,
  notes_quality:        z.string().optional().nullable(),
  notes_delivery:       z.string().optional().nullable(),
  notes_price:          z.string().optional().nullable(),
  notes_service:        z.string().optional().nullable(),
  notes_documentation:  z.string().optional().nullable(),
  notes_hse:            z.string().optional().nullable(),
  general_notes:        z.string().optional().nullable(),
  evaluator_id:         z.string().optional().nullable(),
});

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

  return NextResponse.json(await getSupplierEvaluations(id));
});

export const POST = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

  // Get supplier name for the approved supplier upsert
  const nameRows = await prisma.$queryRawUnsafe<[{ name: string }]>(
    `SELECT name FROM dolibarr_thirdparties WHERE dolibarr_id = ?`, id,
  );
  if (!nameRows.length) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  try {
    const evaluation = await createEvaluation(id, { ...parsed.data, created_by_id: session.userId }, nameRows[0].name);
    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    logger.error({ error, supplierId: id }, 'Failed to create evaluation');
    return NextResponse.json({ error: 'Failed to create evaluation' }, { status: 500 });
  }
});
