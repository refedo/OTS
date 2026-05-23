import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import {
  getMirEvaluation,
  createMirEvaluation,
  updateMirEvaluation,
} from '@/lib/services/qc/mir-evaluation.service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const scoreField = z.number().int().min(1).max(5);

const createSchema = z.object({
  mirId:              z.string().uuid(),
  evaluationDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scoreQuality:       scoreField,
  scoreOtif:          scoreField,
  scoreService:       scoreField,
  scoreDocumentation: scoreField,
  scoreHse:           scoreField,
  scoreStacking:      scoreField,
  notesQuality:       z.string().optional().nullable(),
  notesOtif:          z.string().optional().nullable(),
  notesService:       z.string().optional().nullable(),
  notesDocumentation: z.string().optional().nullable(),
  notesHse:           z.string().optional().nullable(),
  notesStacking:      z.string().optional().nullable(),
  generalNotes:       z.string().optional().nullable(),
  evaluatorId:        z.string().uuid().optional().nullable(),
});

const updateSchema = createSchema.partial().omit({ mirId: true });

export const GET = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mirId = searchParams.get('mirId');
  if (!mirId) return NextResponse.json({ error: 'mirId is required' }, { status: 400 });

  const evaluation = await getMirEvaluation(mirId);
  if (!evaluation) return NextResponse.json({ error: 'No evaluation found for this MIR' }, { status: 404 });
  return NextResponse.json(evaluation);
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const evaluation = await createMirEvaluation({
      ...parsed.data,
      createdById: session.userId,
    });
    return NextResponse.json(evaluation, { status: 201 });
  } catch (err) {
    const e = err as Error & { status?: number };
    logger.error({ err, mirId: parsed.data.mirId }, '[MIR Eval] Failed to create evaluation');
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
});

export const PATCH = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const evaluation = await updateMirEvaluation(id, parsed.data);
    return NextResponse.json(evaluation);
  } catch (err) {
    const e = err as Error & { status?: number };
    logger.error({ err, id }, '[MIR Eval] Failed to update evaluation');
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
});
