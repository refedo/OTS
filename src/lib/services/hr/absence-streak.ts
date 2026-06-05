/**
 * Shared ANP (ABSENT_NO_PERMISSION) streak helpers.
 *
 * Extracted from the on-demand absence-analytics endpoint so both the
 * analytics view (`/api/hr/analytics/absence`) and the persisted escalation
 * engine (`absence-escalation.service`) compute streaks identically.
 *
 * "Consecutive" is weekend-transparent: a gap of ≤ 3 days bridges the
 * Fri/Sat/Sun rest period so Thu→Sun→Mon counts as one streak.
 */

export interface Streak {
  length: number;
  start: Date;
  end: Date;
}

const MS_PER_DAY = 86_400_000;

/** Two ANP dates belong to the same streak if their gap is > 0 and ≤ 3 days. */
export function isConsecutiveGap(a: Date, b: Date): boolean {
  const diffDays = (b.getTime() - a.getTime()) / MS_PER_DAY;
  return diffDays > 0 && diffDays <= 3;
}

/** Longest run of "consecutive" ANP dates over the whole list. */
export function longestStreak(dates: Date[]): Streak | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let best: Streak = { length: 1, start: sorted[0], end: sorted[0] };
  let runStart = sorted[0];
  let runLen = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (isConsecutiveGap(sorted[i - 1], sorted[i])) {
      runLen++;
      if (runLen > best.length) {
        best = { length: runLen, start: runStart, end: sorted[i] };
      }
    } else {
      runStart = sorted[i];
      runLen = 1;
    }
  }
  return best;
}

/**
 * The streak that ends at the most recent ANP date — i.e. the employee's
 * "current" run of unauthorised absence. As the run grows day-by-day the
 * `start` stays fixed, which is what the escalation engine keys its idempotent
 * dedupeKey on (so the same streak escalates rather than duplicating).
 */
export function currentStreak(dates: Date[]): Streak | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let runStart = sorted[sorted.length - 1];
  let runLen = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (isConsecutiveGap(sorted[i - 1], sorted[i])) {
      runLen++;
      runStart = sorted[i - 1];
    } else {
      break;
    }
  }
  return { length: runLen, start: runStart, end: sorted[sorted.length - 1] };
}
