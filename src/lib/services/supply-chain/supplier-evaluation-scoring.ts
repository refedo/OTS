/**
 * Supplier Evaluation Scoring (ISO9001 Form-002)
 *
 * Pure, dependency-free scoring helpers shared by:
 *  - the supplier-portal service (server)
 *  - the EvaluationScoreForm client component (browser)
 *
 * Keep this module free of any server-only imports (db, fs, v8, …) so it can
 * be safely bundled into client components without dragging Node built-ins
 * into the browser bundle.
 */

// Weight constants (ISO9001 Form-002)
const WEIGHTS = {
  quality: 0.25,
  delivery: 0.20,
  price: 0.20,
  service: 0.15,
  documentation: 0.15,
  hse: 0.05,
};

export function computeWeightedScore(scores: {
  quality: number; delivery: number; price: number;
  service: number; documentation: number; hse: number;
}): number {
  return (
    scores.quality * 20 * WEIGHTS.quality +
    scores.delivery * 20 * WEIGHTS.delivery +
    scores.price * 20 * WEIGHTS.price +
    scores.service * 20 * WEIGHTS.service +
    scores.documentation * 20 * WEIGHTS.documentation +
    scores.hse * 20 * WEIGHTS.hse
  );
}

export function scoreToRating(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

export function ratingToOutcome(rating: string): string {
  if (rating === 'A') return 'APPROVED';
  if (rating === 'B') return 'CONDITIONAL';
  if (rating === 'C') return 'SUSPENDED';
  return 'REJECTED';
}
