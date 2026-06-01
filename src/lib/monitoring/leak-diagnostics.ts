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
