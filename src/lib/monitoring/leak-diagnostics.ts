/**
 * Leak Diagnostics
 *
 * Turns an otherwise-invisible memory leak into hard evidence:
 *
 *  1. Heap snapshot on demand — `writeHeapSnapshotOnce()` dumps a
 *     `.heapsnapshot` file (openable in Chrome DevTools → Memory) the first
 *     time the process crosses a memory threshold or receives a kill signal.
 *     The snapshot names the retained objects, so the leak is identified by
 *     class/closure rather than guessed at.
 *
 *  2. Per-route heap attribution — API routes feed `recordRouteMemory()` with
 *     the heap delta of each request. We keep the worst offenders so the
 *     snapshot / shutdown log can point at the endpoint that grows the heap.
 *
 * This module holds NO timers and registers NO handlers; it is pure state +
 * helpers so it can be imported from both the request path (api-utils) and the
 * restart logger without circular side effects.
 */

import fs from 'fs';
import path from 'path';
import v8 from 'v8';
import { logger } from '@/lib/logger';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const SNAPSHOT_DIR = path.join(LOGS_DIR, 'heapsnapshots');

// ── per-route memory attribution ─────────────────────────────────────────────

export interface RouteMemSample {
  method: string;
  url: string;
  heapDeltaMb: number;
  rssAfterMb: number;
  durationMs: number;
  at: string;
}

/** Keep the worst N requests by heap growth observed this process lifetime. */
const MAX_SAMPLES = 25;
const worstSamples: RouteMemSample[] = [];

export function recordRouteMemory(sample: RouteMemSample): void {
  // Only worth tracking meaningful growth — ignore the noise floor.
  if (sample.heapDeltaMb < 5) return;

  worstSamples.push(sample);
  worstSamples.sort((a, b) => b.heapDeltaMb - a.heapDeltaMb);
  if (worstSamples.length > MAX_SAMPLES) worstSamples.length = MAX_SAMPLES;
}

export function getTopRouteMemory(n = 10): RouteMemSample[] {
  return worstSamples.slice(0, n);
}

// ── in-flight request tracking ───────────────────────────────────────────────
// Catches the blind spots that defeated the first round of diagnostics:
//   (a) a request that allocates so much it OOMs *before completing* leaves no
//       post-hoc heap delta, but it WILL still be "in flight" at kill time;
//   (b) requests are tracked at start, so even slow/stuck handlers are visible.

interface InFlightRequest {
  route: string;
  startedAt: number;
  heapAtStartMb: number;
}

const inFlight = new Map<number, InFlightRequest>();
let _reqSeq = 0;

export function markRequestStart(route: string): number {
  const id = ++_reqSeq;
  inFlight.set(id, {
    route,
    startedAt: Date.now(),
    heapAtStartMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
  return id;
}

export function markRequestEnd(id: number): void {
  inFlight.delete(id);
}

/** Requests still running, oldest first — the prime suspects at an OOM kill. */
export function getInFlightRequests(n = 20): Array<InFlightRequest & { ageMs: number; count: number }> {
  const now = Date.now();
  // Group by route so a route hammered by many concurrent calls stands out.
  const byRoute = new Map<string, { count: number; oldest: number; heapAtStartMb: number }>();
  for (const r of inFlight.values()) {
    const g = byRoute.get(r.route);
    if (g) {
      g.count += 1;
      if (r.startedAt < g.oldest) g.oldest = r.startedAt;
    } else {
      byRoute.set(r.route, { count: 1, oldest: r.startedAt, heapAtStartMb: r.heapAtStartMb });
    }
  }
  return Array.from(byRoute.entries())
    .map(([route, g]) => ({ route, startedAt: g.oldest, heapAtStartMb: g.heapAtStartMb, ageMs: now - g.oldest, count: g.count }))
    .sort((a, b) => b.count - a.count || b.ageMs - a.ageMs)
    .slice(0, n);
}

// ── DB query frequency ───────────────────────────────────────────────────────
// Hooked from the Prisma query stream, so it sees EVERY query — including
// unwrapped routes and background jobs that the request wrapper never sees. A
// runaway loop or a hammered heavy query dominates this list.

const queryCounts = new Map<string, number>();

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 90);
}

export function recordQuery(sql: string): void {
  const key = normalizeSql(sql);
  queryCounts.set(key, (queryCounts.get(key) ?? 0) + 1);
  // Bound the map: if too many distinct shapes accumulate, drop the rare ones.
  if (queryCounts.size > 1500) {
    for (const [k, c] of queryCounts) {
      if (c <= 1) queryCounts.delete(k);
    }
  }
}

export function getTopQueries(n = 12): Array<{ query: string; count: number }> {
  return Array.from(queryCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

// ── heap snapshot (one per process) ──────────────────────────────────────────

let _snapshotWritten = false;

/**
 * Write a single heap snapshot for this process. No-op on subsequent calls so a
 * memory spike can't itself spiral into repeated multi-second snapshot writes.
 *
 * Returns the file path written, or null if skipped/failed.
 */
export function writeHeapSnapshotOnce(reason: string): string | null {
  if (_snapshotWritten) return null;
  _snapshotWritten = true;

  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

    const mem = process.memoryUsage();
    const file = path.join(
      SNAPSHOT_DIR,
      `heap-${new Date().toISOString().replace(/[:.]/g, '-')}-${reason}.heapsnapshot`,
    );

    // Synchronous and can block the event loop for a couple of seconds at high
    // heap usage — acceptable for a once-per-process diagnostic that only fires
    // when the process is already about to be killed.
    const written = v8.writeHeapSnapshot(file);

    logger.error(
      {
        file: written,
        reason,
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        topRoutesByHeapGrowth: getTopRouteMemory(10),
        inFlightRequests: getInFlightRequests(20),
        topQueries: getTopQueries(12),
      },
      '[LeakDiagnostics] Heap snapshot written — open in Chrome DevTools → Memory to identify retained objects',
    );

    return written;
  } catch (err) {
    logger.error({ err, reason }, '[LeakDiagnostics] Failed to write heap snapshot');
    return null;
  }
}

export function hasSnapshotBeenWritten(): boolean {
  return _snapshotWritten;
}
