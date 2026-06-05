/**
 * Saudi Labor Law — Unauthorized-Absence Escalation Engine (OTS-BL-080)
 *
 * Evaluates ABSENT_NO_PERMISSION (ANP) attendance for every active employee and
 * persists graduated `EmployeeAbsenceAlert` rows, notifying HR ahead of each
 * threshold. Two ladders, per the labour-law policy:
 *
 *   CONSECUTIVE  (الغياب المتصل)            5 / 10 / 15 unbroken ANP days
 *   INTERMITTENT (متقطع خلال السنة)         10 / 20 / 30 ANP days, rolling 12 months
 *
 * PRE_THRESHOLD alerts fire a short lead before each boundary so HR can act in
 * time. THRESHOLD alerts recommend the matching HrLetterType (recommend-only —
 * no letter is issued automatically). Fully idempotent via the unique dedupeKey,
 * so the daily cron never creates duplicates.
 */

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';
import { currentStreak } from '@/lib/services/hr/absence-streak';

const log = logger.child({ module: 'AbsenceEscalation' });

type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

interface LadderStage {
  days: number;
  severity: Severity;
  letterType: string; // HrLetterType value
}

/** Consecutive-absence ladder (الغياب المتصل). */
export const CONSECUTIVE_LADDER: LadderStage[] = [
  { days: 5, severity: 'MEDIUM', letterType: 'FIRST_WARNING' },
  { days: 10, severity: 'HIGH', letterType: 'FINAL_WARNING' },
  { days: 15, severity: 'HIGH', letterType: 'DISMISSAL' },
];

/** Intermittent ANP ladder over a rolling 12 months (متقطع خلال السنة التعاقدية). */
export const INTERMITTENT_LADDER: LadderStage[] = [
  { days: 10, severity: 'MEDIUM', letterType: 'ATTENTION' },
  { days: 20, severity: 'MEDIUM', letterType: 'FIRST_WARNING' },
  { days: 30, severity: 'HIGH', letterType: 'NON_RENEWAL_NOTICE' },
];

/** Lead (in ANP days) before a boundary at which a PRE_THRESHOLD alert fires. */
const CONSECUTIVE_PRE_LEAD = 1;
const INTERMITTENT_PRE_LEAD = 2;

const ROLLING_WINDOW_DAYS = 365;
const LOOKBACK_DAYS = 400; // rolling 12 months + slack to capture an ongoing streak

const MS_PER_DAY = 86_400_000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** UTC date with the time component stripped. */
function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface EvaluateResult {
  evaluated: number; // employees with ≥1 ANP day considered
  created: number; // new alerts persisted
  notified: number; // HR notifications dispatched
}

interface CandidateAlert {
  employeeId: string;
  employeeName: string;
  windowType: 'CONSECUTIVE' | 'INTERMITTENT';
  kind: 'PRE_THRESHOLD' | 'THRESHOLD';
  thresholdDays: number;
  anpDays: number;
  severity: Severity;
  recommendedLetterType: string | null;
  periodFrom: Date;
  periodTo: Date;
  detail: string;
  meta: Record<string, unknown>;
  dedupeKey: string;
}

/**
 * Build the candidate alerts for one employee from their ANP dates.
 * Emits, per ladder, every crossed THRESHOLD stage plus a single PRE_THRESHOLD
 * for the nearest not-yet-reached stage.
 */
function buildCandidates(
  employeeId: string,
  employeeName: string,
  anpDates: Date[],
  asOf: Date,
): CandidateAlert[] {
  const out: CandidateAlert[] = [];

  // ---- Consecutive ladder ------------------------------------------------
  const streak = currentStreak(anpDates);
  if (streak) {
    const streakStartIso = isoDate(streak.start);
    const len = streak.length;

    for (const stage of CONSECUTIVE_LADDER) {
      if (len >= stage.days) {
        out.push({
          employeeId,
          employeeName,
          windowType: 'CONSECUTIVE',
          kind: 'THRESHOLD',
          thresholdDays: stage.days,
          anpDays: len,
          severity: stage.severity,
          recommendedLetterType: stage.letterType,
          periodFrom: streak.start,
          periodTo: streak.end,
          detail: `${len} consecutive unauthorized-absence days (${streakStartIso} → ${isoDate(streak.end)}) — reached the ${stage.days}-day threshold.`,
          meta: { streakDays: len, from: streakStartIso, to: isoDate(streak.end), thresholdDays: stage.days },
          dedupeKey: `consec:${employeeId}:${stage.days}:THRESHOLD:${streakStartIso}`,
        });
      }
    }

    const nextStage = CONSECUTIVE_LADDER.find((s) => len < s.days);
    if (nextStage && len >= nextStage.days - CONSECUTIVE_PRE_LEAD) {
      out.push({
        employeeId,
        employeeName,
        windowType: 'CONSECUTIVE',
        kind: 'PRE_THRESHOLD',
        thresholdDays: nextStage.days,
        anpDays: len,
        severity: 'LOW',
        recommendedLetterType: null,
        periodFrom: streak.start,
        periodTo: streak.end,
        detail: `${len} consecutive unauthorized-absence days — ${nextStage.days - len} day(s) from the ${nextStage.days}-day threshold (${nextStage.letterType.replace(/_/g, ' ').toLowerCase()}).`,
        meta: { streakDays: len, approachingThreshold: nextStage.days, recommendedNextLetter: nextStage.letterType },
        dedupeKey: `consec:${employeeId}:${nextStage.days}:PRE_THRESHOLD:${streakStartIso}`,
      });
    }
  }

  // ---- Intermittent ladder (rolling 12 months) ---------------------------
  const windowStart = new Date(asOf.getTime() - ROLLING_WINDOW_DAYS * MS_PER_DAY);
  const inWindow = anpDates.filter((d) => d >= windowStart && d <= asOf);
  const count = inWindow.length;
  if (count > 0) {
    const yearBucket = String(asOf.getUTCFullYear());

    for (const stage of INTERMITTENT_LADDER) {
      if (count >= stage.days) {
        out.push({
          employeeId,
          employeeName,
          windowType: 'INTERMITTENT',
          kind: 'THRESHOLD',
          thresholdDays: stage.days,
          anpDays: count,
          severity: stage.severity,
          recommendedLetterType: stage.letterType,
          periodFrom: windowStart,
          periodTo: asOf,
          detail: `${count} unauthorized-absence days over the past 12 months — reached the ${stage.days}-day threshold.`,
          meta: { anpDays: count, windowFrom: isoDate(windowStart), windowTo: isoDate(asOf), thresholdDays: stage.days },
          dedupeKey: `inter:${employeeId}:${stage.days}:THRESHOLD:${yearBucket}`,
        });
      }
    }

    const nextStage = INTERMITTENT_LADDER.find((s) => count < s.days);
    if (nextStage && count >= nextStage.days - INTERMITTENT_PRE_LEAD) {
      out.push({
        employeeId,
        employeeName,
        windowType: 'INTERMITTENT',
        kind: 'PRE_THRESHOLD',
        thresholdDays: nextStage.days,
        anpDays: count,
        severity: 'LOW',
        recommendedLetterType: null,
        periodFrom: windowStart,
        periodTo: asOf,
        detail: `${count} unauthorized-absence days over the past 12 months — ${nextStage.days - count} day(s) from the ${nextStage.days}-day threshold.`,
        meta: { anpDays: count, approachingThreshold: nextStage.days, recommendedNextLetter: nextStage.letterType },
        dedupeKey: `inter:${employeeId}:${nextStage.days}:PRE_THRESHOLD:${yearBucket}`,
      });
    }
  }

  return out;
}

/** Active users who can see HR analytics — the absence-alert audience. */
async function findHrRecipients(): Promise<{ id: string }[]> {
  return prisma.user.findMany({
    where: {
      status: 'active',
      role: { permissions: { path: '$', string_contains: 'hr.analytics.view' } },
    },
    select: { id: true },
  });
}

/**
 * Evaluate all active employees and persist any new absence alerts.
 * Idempotent — safe to run daily (CLAUDE.md Ops Agent rules).
 */
export async function evaluateAbsenceEscalations(
  params: { triggeredById?: string } = {},
): Promise<EvaluateResult> {
  const asOf = utcDateOnly(new Date());
  const since = new Date(asOf.getTime() - LOOKBACK_DAYS * MS_PER_DAY);

  // 1. Load ANP attendance for active employees over the lookback window.
  const records = await prisma.attendanceRecord.findMany({
    where: {
      workerType: 'EMPLOYEE',
      status: 'ABSENT_NO_PERMISSION',
      date: { gte: since, lte: asOf },
      employee: { status: 'ACTIVE', deletedAt: null },
    },
    select: {
      employeeId: true,
      date: true,
      employee: { select: { id: true, fullNameEn: true } },
    },
    orderBy: { date: 'asc' },
    take: 200_000,
  });

  // 2. Group ANP dates per employee.
  const byEmployee = new Map<string, { name: string; dates: Date[] }>();
  for (const rec of records) {
    if (!rec.employeeId || !rec.employee) continue;
    let acc = byEmployee.get(rec.employeeId);
    if (!acc) {
      acc = { name: rec.employee.fullNameEn, dates: [] };
      byEmployee.set(rec.employeeId, acc);
    }
    acc.dates.push(utcDateOnly(new Date(rec.date)));
  }

  // 3. Build candidate alerts.
  const candidates: CandidateAlert[] = [];
  for (const [employeeId, { name, dates }] of byEmployee) {
    candidates.push(...buildCandidates(employeeId, name, dates, asOf));
  }

  if (candidates.length === 0) {
    log.info({ evaluated: byEmployee.size }, 'Absence escalation: no candidate alerts');
    return { evaluated: byEmployee.size, created: 0, notified: 0 };
  }

  // 4. Skip candidates that already exist (idempotency via dedupeKey).
  const existing = await prisma.employeeAbsenceAlert.findMany({
    where: { dedupeKey: { in: candidates.map((c) => c.dedupeKey) } },
    select: { dedupeKey: true },
  });
  const existingKeys = new Set(existing.map((e) => e.dedupeKey));
  const fresh = candidates.filter((c) => !existingKeys.has(c.dedupeKey));

  if (fresh.length === 0) {
    log.info({ evaluated: byEmployee.size, candidates: candidates.length }, 'Absence escalation: all alerts already exist');
    return { evaluated: byEmployee.size, created: 0, notified: 0 };
  }

  // 5. Persist new alerts and collect them for notification.
  const recipients = await findHrRecipients();
  const now = new Date();
  let created = 0;
  let notified = 0;

  for (const c of fresh) {
    try {
      const alert = await prisma.employeeAbsenceAlert.create({
        data: {
          employeeId: c.employeeId,
          windowType: c.windowType,
          kind: c.kind,
          thresholdDays: c.thresholdDays,
          anpDays: c.anpDays,
          severity: c.severity,
          recommendedLetterType: c.recommendedLetterType,
          periodFrom: c.periodFrom,
          periodTo: c.periodTo,
          detail: c.detail,
          meta: c.meta as Prisma.InputJsonValue,
          dedupeKey: c.dedupeKey,
          notifiedAt: recipients.length > 0 ? now : null,
        },
        select: { id: true },
      });
      created++;

      // 6. Notify HR (fire-and-forget per recipient; failures are non-fatal).
      const windowLabel = c.windowType === 'CONSECUTIVE' ? 'consecutive' : 'intermittent';
      const title =
        c.kind === 'PRE_THRESHOLD'
          ? `Absence approaching ${c.thresholdDays}-day threshold: ${c.employeeName}`
          : `Absence threshold reached (${c.thresholdDays} ${windowLabel} days): ${c.employeeName}`;
      for (const r of recipients) {
        try {
          await NotificationService.createNotification({
            userId: r.id,
            type: 'SYSTEM',
            title,
            message: c.detail,
            relatedEntityType: 'absence_alert',
            relatedEntityId: alert.id,
            metadata: {
              employeeId: c.employeeId,
              employeeName: c.employeeName,
              windowType: c.windowType,
              kind: c.kind,
              thresholdDays: c.thresholdDays,
              anpDays: c.anpDays,
              severity: c.severity,
              recommendedLetterType: c.recommendedLetterType,
            },
          });
          notified++;
        } catch (err) {
          log.warn({ err, userId: r.id, alertId: alert.id }, 'Failed to notify HR about absence alert');
        }
      }
    } catch (err) {
      // Unique-constraint races (a concurrent run inserted the same key) are expected — skip.
      const isUnique = typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002';
      if (!isUnique) {
        log.error({ err, dedupeKey: c.dedupeKey }, 'Failed to persist absence alert');
      }
    }
  }

  log.info(
    { evaluated: byEmployee.size, candidates: candidates.length, created, notified, triggeredById: params.triggeredById ?? null },
    'Absence escalation evaluation complete',
  );

  return { evaluated: byEmployee.size, created, notified };
}
