/**
 * MIR Shipment Evaluation Service (v32.0.0)
 * Manages per-shipment supplier evaluations linked to Material Inspection Receipts.
 * Evaluations feed the "Evaluations Receiving Bank" and drive supplier aggregate ratings.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// ─── Weight constants ─────────────────────────────────────────────────────────

const MIR_WEIGHTS = {
  quality:       0.30,
  otif:          0.25,
  service:       0.15,
  documentation: 0.15,
  hse:           0.10,
  stacking:      0.05,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MirScores {
  quality:       number;
  otif:          number;
  service:       number;
  documentation: number;
  hse:           number;
  stacking:      number;
}

export interface CreateMirEvaluationInput {
  mirId:              string;
  evaluationDate:     string; // YYYY-MM-DD
  scoreQuality:       number;
  scoreOtif:          number;
  scoreService:       number;
  scoreDocumentation: number;
  scoreHse:           number;
  scoreStacking:      number;
  notesQuality?:       string | null;
  notesOtif?:          string | null;
  notesService?:       string | null;
  notesDocumentation?: string | null;
  notesHse?:           string | null;
  notesStacking?:      string | null;
  generalNotes?:       string | null;
  evaluatorId?:        string | null;
  createdById:         string;
}

export interface ShipmentEvaluationRow {
  id:                string;
  mirId:             string;
  mirNumber:         string;
  dolibarrId:        number;
  evaluationDate:    string;
  scoreQuality:      number;
  scoreOtif:         number;
  scoreService:      number;
  scoreDocumentation:number;
  scoreHse:          number;
  scoreStacking:     number;
  weightedScore:     number;
  rating:            string;
  outcome:           string;
  generalNotes:      string | null;
  evaluatorName:     string | null;
  createdAt:         string;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function computeMirWeightedScore(scores: MirScores): number {
  return (
    scores.quality       * 20 * MIR_WEIGHTS.quality +
    scores.otif          * 20 * MIR_WEIGHTS.otif +
    scores.service       * 20 * MIR_WEIGHTS.service +
    scores.documentation * 20 * MIR_WEIGHTS.documentation +
    scores.hse           * 20 * MIR_WEIGHTS.hse +
    scores.stacking      * 20 * MIR_WEIGHTS.stacking
  );
}

export function mirScoreToRating(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

export function mirRatingToOutcome(rating: string): string {
  if (rating === 'A') return 'APPROVED';
  if (rating === 'B') return 'CONDITIONAL';
  if (rating === 'C') return 'SUSPENDED';
  return 'REJECTED';
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getMirEvaluation(mirId: string) {
  return prisma.mirShipmentEvaluation.findUnique({ where: { mirId } });
}

export async function createMirEvaluation(input: CreateMirEvaluationInput) {
  const mir = await prisma.materialInspectionReceipt.findUnique({
    where: { id: input.mirId },
    select: { id: true, dolibarrSocId: true, receiptNumber: true, supplierName: true },
  });

  if (!mir) throw Object.assign(new Error('MIR not found'), { status: 404 });

  // If dolibarrSocId is missing, try to resolve it from dolibarr_thirdparties by supplier name
  let resolvedSocId = mir.dolibarrSocId;
  if (!resolvedSocId && mir.supplierName) {
    try {
      const rows = await prisma.$queryRawUnsafe<[{ dolibarr_id: number }]>(
        'SELECT dolibarr_id FROM dolibarr_thirdparties WHERE name = ? LIMIT 1',
        mir.supplierName,
      );
      if (rows.length > 0 && rows[0].dolibarr_id) {
        resolvedSocId = Number(rows[0].dolibarr_id);
        await prisma.materialInspectionReceipt.update({
          where: { id: mir.id },
          data: { dolibarrSocId: resolvedSocId },
        });
        logger.info({ mirId: mir.id, resolvedSocId, supplierName: mir.supplierName }, '[MIR Eval] Resolved dolibarrSocId from supplier name');
      }
    } catch (err) {
      logger.warn({ err, mirId: mir.id }, '[MIR Eval] Could not auto-resolve dolibarrSocId from supplier name');
    }
  }

  if (!resolvedSocId) {
    throw Object.assign(
      new Error('Cannot evaluate: this MIR has no supplier linked. It may predate the evaluation system.'),
      { status: 422 },
    );
  }

  const existing = await prisma.mirShipmentEvaluation.findUnique({ where: { mirId: input.mirId } });
  if (existing) {
    throw Object.assign(
      new Error('An evaluation already exists for this MIR. Use PATCH to update it.'),
      { status: 409 },
    );
  }

  const weightedScore = computeMirWeightedScore({
    quality:       input.scoreQuality,
    otif:          input.scoreOtif,
    service:       input.scoreService,
    documentation: input.scoreDocumentation,
    hse:           input.scoreHse,
    stacking:      input.scoreStacking,
  });
  const rating  = mirScoreToRating(weightedScore);
  const outcome = mirRatingToOutcome(rating);

  const evaluation = await prisma.mirShipmentEvaluation.create({
    data: {
      id:                uuidv4(),
      mirId:             input.mirId,
      dolibarrId:        resolvedSocId,
      evaluationDate:    new Date(input.evaluationDate),
      scoreQuality:      input.scoreQuality,
      scoreOtif:         input.scoreOtif,
      scoreService:      input.scoreService,
      scoreDocumentation:input.scoreDocumentation,
      scoreHse:          input.scoreHse,
      scoreStacking:     input.scoreStacking,
      notesQuality:      input.notesQuality       ?? null,
      notesOtif:         input.notesOtif          ?? null,
      notesService:      input.notesService        ?? null,
      notesDocumentation:input.notesDocumentation ?? null,
      notesHse:          input.notesHse            ?? null,
      notesStacking:     input.notesStacking       ?? null,
      generalNotes:      input.generalNotes        ?? null,
      weightedScore,
      rating,
      outcome,
      evaluatorId:       input.evaluatorId  ?? null,
      createdById:       input.createdById,
    },
  });

  logger.info(
    { mirId: input.mirId, mirNumber: mir.receiptNumber, dolibarrId: resolvedSocId, rating, weightedScore },
    '[MIR Eval] Shipment evaluation created',
  );

  await recomputeSupplierAggregate(resolvedSocId);
  return evaluation;
}

export async function updateMirEvaluation(
  id: string,
  input: Partial<Omit<CreateMirEvaluationInput, 'mirId' | 'createdById'>>,
) {
  const existing = await prisma.mirShipmentEvaluation.findUnique({
    where: { id },
    select: { dolibarrId: true },
  });
  if (!existing) throw Object.assign(new Error('Evaluation not found'), { status: 404 });

  const scores: Partial<MirScores> = {
    quality:       input.scoreQuality,
    otif:          input.scoreOtif,
    service:       input.scoreService,
    documentation: input.scoreDocumentation,
    hse:           input.scoreHse,
    stacking:      input.scoreStacking,
  };

  const currentEval = await prisma.mirShipmentEvaluation.findUnique({ where: { id } });
  if (!currentEval) throw Object.assign(new Error('Evaluation not found'), { status: 404 });

  const mergedScores: MirScores = {
    quality:       scores.quality       ?? currentEval.scoreQuality,
    otif:          scores.otif          ?? currentEval.scoreOtif,
    service:       scores.service       ?? currentEval.scoreService,
    documentation: scores.documentation ?? currentEval.scoreDocumentation,
    hse:           scores.hse           ?? currentEval.scoreHse,
    stacking:      scores.stacking      ?? currentEval.scoreStacking,
  };

  const weightedScore = computeMirWeightedScore(mergedScores);
  const rating  = mirScoreToRating(weightedScore);
  const outcome = mirRatingToOutcome(rating);

  const updated = await prisma.mirShipmentEvaluation.update({
    where: { id },
    data: {
      ...(input.evaluationDate     !== undefined && { evaluationDate: new Date(input.evaluationDate) }),
      ...(input.scoreQuality       !== undefined && { scoreQuality: input.scoreQuality }),
      ...(input.scoreOtif          !== undefined && { scoreOtif: input.scoreOtif }),
      ...(input.scoreService       !== undefined && { scoreService: input.scoreService }),
      ...(input.scoreDocumentation !== undefined && { scoreDocumentation: input.scoreDocumentation }),
      ...(input.scoreHse           !== undefined && { scoreHse: input.scoreHse }),
      ...(input.scoreStacking      !== undefined && { scoreStacking: input.scoreStacking }),
      ...(input.notesQuality       !== undefined && { notesQuality: input.notesQuality }),
      ...(input.notesOtif          !== undefined && { notesOtif: input.notesOtif }),
      ...(input.notesService       !== undefined && { notesService: input.notesService }),
      ...(input.notesDocumentation !== undefined && { notesDocumentation: input.notesDocumentation }),
      ...(input.notesHse           !== undefined && { notesHse: input.notesHse }),
      ...(input.notesStacking      !== undefined && { notesStacking: input.notesStacking }),
      ...(input.generalNotes       !== undefined && { generalNotes: input.generalNotes }),
      ...(input.evaluatorId        !== undefined && { evaluatorId: input.evaluatorId }),
      weightedScore,
      rating,
      outcome,
    },
  });

  await recomputeSupplierAggregate(existing.dolibarrId);
  return updated;
}

export async function getSupplierShipmentEvaluations(dolibarrId: number): Promise<ShipmentEvaluationRow[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      e.id,
      e.mir_id       AS mirId,
      r.receipt_number AS mirNumber,
      e.dolibarr_id  AS dolibarrId,
      e.evaluation_date AS evaluationDate,
      e.score_quality      AS scoreQuality,
      e.score_otif         AS scoreOtif,
      e.score_service      AS scoreService,
      e.score_documentation AS scoreDocumentation,
      e.score_hse          AS scoreHse,
      e.score_stacking     AS scoreStacking,
      e.weighted_score     AS weightedScore,
      e.rating,
      e.outcome,
      e.general_notes      AS generalNotes,
      ev.name              AS evaluatorName,
      e.created_at         AS createdAt
    FROM mir_shipment_evaluations e
    JOIN material_inspection_receipts r ON r.id = e.mir_id
    LEFT JOIN User ev ON ev.id = e.evaluator_id
    WHERE e.dolibarr_id = ?
    ORDER BY e.evaluation_date DESC
  `, dolibarrId);

  const s = (v: unknown) => (v == null ? null : String(v));
  return rows.map(r => ({
    id:                s(r.id)!,
    mirId:             s(r.mirId)!,
    mirNumber:         s(r.mirNumber)!,
    dolibarrId:        Number(r.dolibarrId),
    evaluationDate:    r.evaluationDate instanceof Date
      ? r.evaluationDate.toISOString().slice(0, 10)
      : String(r.evaluationDate),
    scoreQuality:       Number(r.scoreQuality),
    scoreOtif:          Number(r.scoreOtif),
    scoreService:       Number(r.scoreService),
    scoreDocumentation: Number(r.scoreDocumentation),
    scoreHse:           Number(r.scoreHse),
    scoreStacking:      Number(r.scoreStacking),
    weightedScore:      Number(r.weightedScore),
    rating:             s(r.rating)!,
    outcome:            s(r.outcome)!,
    generalNotes:       s(r.generalNotes),
    evaluatorName:      s(r.evaluatorName),
    createdAt:          r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }));
}

// ─── Private: recompute supplier aggregate ────────────────────────────────────

async function recomputeSupplierAggregate(dolibarrId: number): Promise<void> {
  try {
    const aggRows = await prisma.$queryRawUnsafe<[{ avg_score: number | null; cnt: bigint }]>(`
      SELECT AVG(weighted_score) AS avg_score, COUNT(*) AS cnt
      FROM mir_shipment_evaluations
      WHERE dolibarr_id = ?
    `, dolibarrId);

    const avg = Number(aggRows[0]?.avg_score ?? 0);
    const cnt = Number(aggRows[0]?.cnt ?? 0);
    if (cnt === 0) return;

    const rating  = mirScoreToRating(avg);
    const outcome = mirRatingToOutcome(rating);
    const approvalStatus =
      outcome === 'APPROVED'    ? 'APPROVED' :
      outcome === 'CONDITIONAL' ? 'CONDITIONAL' :
      'SUSPENDED';

    const nameRows = await prisma.$queryRawUnsafe<[{ name: string; code_supplier: string | null }]>(`
      SELECT name, code_supplier FROM dolibarr_thirdparties WHERE dolibarr_id = ?
    `, dolibarrId);
    if (!nameRows.length) return;

    const codeSupplier = nameRows[0].code_supplier ?? null;
    let supplierCode = codeSupplier;
    if (!supplierCode) {
      const last = await prisma.scApprovedSupplier.findFirst({
        where: { supplierCode: { startsWith: 'SUP-' } },
        orderBy: { supplierCode: 'desc' },
        select: { supplierCode: true },
      });
      const n = last ? (parseInt(last.supplierCode.replace('SUP-', '')) || 0) + 1 : 1;
      supplierCode = `SUP-${String(n).padStart(3, '0')}`;
    }

    const existing = await prisma.scApprovedSupplier.findFirst({
      where: { dolibarrId, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.scApprovedSupplier.update({
        where: { id: existing.id },
        data: { approvalStatus, rating, updatedAt: new Date() },
      });
    } else {
      await prisma.scApprovedSupplier.create({
        data: {
          dolibarrId,
          supplierCode,
          name: nameRows[0].name,
          approvalStatus,
          rating,
          approvalDate: new Date(),
        },
      });
    }

    logger.info({ dolibarrId, avg, rating, cnt }, '[MIR Eval] Supplier aggregate rating updated');
  } catch (err) {
    logger.error({ err, dolibarrId }, '[MIR Eval] Failed to recompute supplier aggregate');
  }
}
