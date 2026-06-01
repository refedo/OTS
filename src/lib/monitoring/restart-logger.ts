/**
 * Restart Logger
 *
 * Persists the reason for every PM2 restart so we can investigate the root cause.
 *
 * How it works:
 *  1. Writes process state (memory, uptime, peak RSS) to logs/process-state.json
 *     every 5s using synchronous I/O so it survives OOM kills. The 5s cadence is
 *     deliberate: the process was dying every ~30s while state was only written
 *     every 60s, so the high-memory reading was never captured and every restart
 *     was misclassified as "reason unknown".
 *  2. On SIGTERM / SIGINT / SIGHUP (PM2 restarts via SIGINT) / uncaughtException /
 *     unhandledRejection writes logs/last-shutdown.json synchronously, including
 *     the memory at kill time, before the process exits.
 *  3. When RSS climbs past SNAPSHOT_RSS_MB it writes a one-shot heap snapshot to
 *     logs/heapsnapshots/ that names the retained objects causing the leak.
 *  4. On startup, reads both files and posts a PROCESS_RESTART event to the DB:
 *       - CLEAN_SHUTDOWN   → signal received with low memory (cron/manual restart)
 *       - CRASH_EXCEPTION  → uncaughtException
 *       - CRASH_REJECTION  → unhandledRejection
 *       - OOM_SUSPECTED    → killed/signalled with peak rss ≥ OOM_RSS_MB
 *       - UNKNOWN_RESTART  → hard kill with no shutdown file and low peak rss
 *       - FIRST_START      → no prior state at all
 */

import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { writeHeapSnapshotOnce, getTopRouteMemory, getInFlightRequests, getTopQueries } from '@/lib/monitoring/leak-diagnostics';

// ─── paths ─────────────────────────────────────────────────────────────────

const LOGS_DIR = path.join(process.cwd(), 'logs');
const SHUTDOWN_FILE = path.join(LOGS_DIR, 'last-shutdown.json');
const STATE_FILE = path.join(LOGS_DIR, 'process-state.json');

// Sample frequently so the run-up to a kill is always persisted.
const STATE_INTERVAL_MS = 5_000;

// RSS (MB) at which we proactively dump a heap snapshot. Kept low because this
// host's OS OOM-killer fires around ~1GB: writing a snapshot of a 700MB+ heap
// would itself push past the ceiling and be killed mid-write. Snapshotting at
// ~450MB RSS captures the already-dominant leaking objects while it can still
// complete safely.
const SNAPSHOT_RSS_MB = 450;

// Peak RSS (MB) at/above which a restart with no clean cause is attributed to
// memory pressure rather than left as "unknown".
const OOM_RSS_MB = 700;

// ─── types ─────────────────────────────────────────────────────────────────

interface MemSnapshot {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
}

type ShutdownReason =
  | 'SIGTERM'
  | 'SIGINT'
  | 'SIGHUP'
  | 'UNCAUGHT_EXCEPTION'
  | 'UNHANDLED_REJECTION'
  | 'EXIT_NONZERO';

interface ShutdownRecord {
  reason: ShutdownReason;
  exitCode?: number;
  error?: string;
  stack?: string;
  mem: MemSnapshot;
  /** Highest RSS (MB) observed during this process's lifetime. */
  peakRssMb: number;
  uptimeSec: number;
  timestamp: string;
}

interface StateRecord {
  pid: number;
  startedAt: string;
  updatedAt: string;
  uptimeSec: number;
  mem: MemSnapshot;
  /** Highest RSS (MB) observed so far — survives a kill that strikes between samples. */
  peakRssMb: number;
  /** Requests in flight at last sample — survives an OS OOM kill via the state file. */
  inFlight?: ReturnType<typeof getInFlightRequests>;
  /** Most frequent DB queries at last sample. */
  topQueries?: ReturnType<typeof getTopQueries>;
  /** Endpoints with the largest per-request heap growth at last sample. */
  topRoutes?: ReturnType<typeof getTopRouteMemory>;
}

// Running peak RSS for this process, updated on every sample / signal.
let _peakRssMb = 0;

function trackPeak(mem: MemSnapshot): number {
  if (mem.rssMb > _peakRssMb) _peakRssMb = mem.rssMb;
  return _peakRssMb;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function ensureLogsDir(): void {
  try {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  } catch {
    // non-fatal
  }
}

function currentMem(): MemSnapshot {
  const u = process.memoryUsage();
  return {
    heapUsedMb: Math.round(u.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(u.heapTotal / 1024 / 1024),
    rssMb: Math.round(u.rss / 1024 / 1024),
  };
}

function readJsonSync<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeStateSync(startedAt: Date): void {
  const mem = currentMem();
  const peakRssMb = trackPeak(mem);
  const state: StateRecord = {
    pid: process.pid,
    startedAt: startedAt.toISOString(),
    updatedAt: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    mem,
    peakRssMb,
    // Persisted every 5s so the next boot can attribute even an OS OOM kill
    // (which leaves no shutdown record) to a route / query. These live in
    // module memory that dies with the process, so the state file is the only
    // way the next process can read the dead one's last-known activity.
    inFlight: getInFlightRequests(20),
    topQueries: getTopQueries(12),
    topRoutes: getTopRouteMemory(10),
  };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // non-fatal — disk full or permissions issue
  }

  // Capture the leak before the kill: dump a heap snapshot the first time RSS
  // crosses the threshold. One per process — the guard lives in leak-diagnostics.
  if (mem.rssMb >= SNAPSHOT_RSS_MB) {
    writeHeapSnapshotOnce('high-rss');
  }
}

function writeShutdownSync(record: ShutdownRecord): void {
  try {
    fs.writeFileSync(SHUTDOWN_FILE, JSON.stringify(record, null, 2), 'utf8');
  } catch {
    // non-fatal
  }
}

function deleteSync(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // file may not exist
  }
}

// ─── DB writer ──────────────────────────────────────────────────────────────

type RestartKind =
  | 'CLEAN_SHUTDOWN'
  | 'CRASH_EXCEPTION'
  | 'CRASH_REJECTION'
  | 'OOM_SUSPECTED'
  | 'UNKNOWN_RESTART'
  | 'FIRST_START';

async function postRestartEvent(
  kind: RestartKind,
  prevState: StateRecord | null,
  shutdown: ShutdownRecord | null,
): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma');

    const prevUptimeSec = prevState?.uptimeSec ?? null;
    const prevMem = prevState?.mem ?? shutdown?.mem ?? null;
    const peakRssMb = Math.max(
      prevState?.peakRssMb ?? 0,
      shutdown?.peakRssMb ?? 0,
      prevState?.mem.rssMb ?? 0,
      shutdown?.mem.rssMb ?? 0,
    ) || null;
    const errorMsg = shutdown?.error ?? null;
    const stack = shutdown?.stack ?? null;
    const signal = shutdown?.reason ?? null;
    // Read from the DEAD process's last 5s sample — NOT the live getters, which
    // would return this fresh process's empty buffers.
    const topRoutes = prevState?.topRoutes ?? [];
    const inFlightAtKill = prevState?.inFlight ?? [];
    const topQueries = prevState?.topQueries ?? [];

    const titleMap: Record<RestartKind, string> = {
      CLEAN_SHUTDOWN: `Process restarted cleanly${signal ? ` (${signal})` : ''}`,
      CRASH_EXCEPTION: `Process crashed — uncaughtException${errorMsg ? `: ${errorMsg.slice(0, 100)}` : ''}`,
      CRASH_REJECTION: `Process crashed — unhandledRejection${errorMsg ? `: ${errorMsg.slice(0, 100)}` : ''}`,
      OOM_SUSPECTED: `Process killed — memory pressure (peak RSS ${peakRssMb ?? '?'} MB${signal ? `, ${signal}` : ', hard kill'})`,
      UNKNOWN_RESTART: `Process restarted — hard kill, low memory (peak RSS ${peakRssMb ?? '?'} MB)`,
      FIRST_START: 'Process started for the first time',
    };

    const severityMap: Record<RestartKind, string> = {
      CLEAN_SHUTDOWN: 'INFO',
      CRASH_EXCEPTION: 'CRITICAL',
      CRASH_REJECTION: 'CRITICAL',
      OOM_SUSPECTED: 'CRITICAL',
      UNKNOWN_RESTART: 'WARNING',
      FIRST_START: 'INFO',
    };

    await prisma.systemEvent.create({
      data: {
        eventType: 'PROCESS_RESTART',
        eventCategory: 'SYSTEM',
        category: 'system',
        severity: severityMap[kind] as 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
        title: titleMap[kind],
        entityType: 'Process',
        entityId: String(process.pid),
        // JSON-serialize so the typed interfaces (MemSnapshot / RouteMemSample)
        // satisfy Prisma's InputJsonValue and undefined fields are dropped.
        metadata: JSON.parse(
          JSON.stringify({
            kind,
            signal,
            prevUptimeSec,
            prevMem,
            peakRssMb,
            exitCode: shutdown?.exitCode ?? null,
            error: errorMsg,
            stack,
            prevStartedAt: prevState?.startedAt ?? null,
            prevUpdatedAt: prevState?.updatedAt ?? null,
            // The endpoints that grew the heap the most before the kill — the
            // prime suspects for a request-driven leak.
            topRoutesByHeapGrowth: topRoutes,
            // From the dead process's last 5s sample (not this fresh process):
            // requests in flight at the kill (catches a request that OOMs before
            // completing, including unwrapped routes) and the most frequent DB
            // queries (catches runaway loops on ANY code path).
            inFlightAtKill,
            topQueries,
          }),
        ),
      },
    });

    logger.info(
      { kind, signal, prevUptimeSec, peakRssMb, topRoutes },
      '[RestartLogger] Restart event recorded',
    );
  } catch (err) {
    // Never let this crash the startup sequence
    logger.error({ err }, '[RestartLogger] Failed to post restart event to DB');
  }
}

// ─── signal / process handlers ──────────────────────────────────────────────

let _startedAt = new Date();
let _handlersRegistered = false;

function registerHandlers(): void {
  if (_handlersRegistered) return;
  _handlersRegistered = true;

  // PM2 stops a process with SIGINT, manual `pm2 restart` / OS shutdown use
  // SIGTERM/SIGHUP. We record all three the same way: write a shutdown record
  // with the memory at kill time so the next boot can tell a clean restart
  // (low memory) apart from a memory-pressure kill (high peak RSS).
  const onSignal = (signal: 'SIGTERM' | 'SIGINT' | 'SIGHUP') => () => {
    const mem = currentMem();
    const peakRssMb = trackPeak(mem);
    writeShutdownSync({
      reason: signal,
      mem,
      peakRssMb,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    // If we're already near the limit, grab a snapshot in the kill window
    // (PM2 kill_timeout gives us a few seconds before SIGKILL).
    if (mem.rssMb >= SNAPSHOT_RSS_MB) writeHeapSnapshotOnce(`${signal}-high-rss`);
    try {
      logger.info({ signal, uptimeSec: Math.round(process.uptime()), rssMb: mem.rssMb, peakRssMb }, '[RestartLogger] Termination signal received');
    } catch {
      process.stderr.write(`[RestartLogger] ${signal} received (rss ${mem.rssMb} MB)\n`);
    }
    // Do NOT call process.exit(): let the existing graceful-shutdown handlers
    // ($disconnect) run; PM2 force-kills after kill_timeout if needed.
  };

  process.once('SIGTERM', onSignal('SIGTERM'));
  process.once('SIGINT', onSignal('SIGINT'));
  process.once('SIGHUP', onSignal('SIGHUP'));

  process.on('uncaughtException', (err: Error) => {
    const mem = currentMem();
    writeShutdownSync({
      reason: 'UNCAUGHT_EXCEPTION',
      error: err.message,
      stack: err.stack,
      mem,
      peakRssMb: trackPeak(mem),
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    // Logger may be broken at this point, use stderr as fallback
    try {
      logger.error({ err }, '[RestartLogger] uncaughtException — process will exit');
    } catch {
      process.stderr.write(`[RestartLogger] uncaughtException: ${err.message}\n`);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const message =
      reason instanceof Error ? reason.message : String(reason);
    const stack =
      reason instanceof Error ? reason.stack : undefined;
    const mem = currentMem();
    writeShutdownSync({
      reason: 'UNHANDLED_REJECTION',
      error: message,
      stack,
      mem,
      peakRssMb: trackPeak(mem),
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    try {
      logger.error({ reason }, '[RestartLogger] unhandledRejection — process will exit');
    } catch {
      process.stderr.write(`[RestartLogger] unhandledRejection: ${message}\n`);
    }
    process.exit(1);
  });
}

// ─── public API ─────────────────────────────────────────────────────────────

declare global {
  var __restartLoggerInterval: NodeJS.Timeout | undefined;
  var __restartLoggerInitialized: boolean | undefined;
}

export async function initRestartLogger(): Promise<void> {
  // Singleton guard across Next.js hot reloads
  if (global.__restartLoggerInitialized) return;
  global.__restartLoggerInitialized = true;

  _startedAt = new Date();
  ensureLogsDir();

  // ── 1. Read previous state before overwriting ──
  const prevShutdown = readJsonSync<ShutdownRecord>(SHUTDOWN_FILE);
  const prevState = readJsonSync<StateRecord>(STATE_FILE);

  // ── 2. Determine restart kind ──
  // Peak RSS is the deciding signal: a process that was sitting near the memory
  // ceiling and then disappeared was almost certainly killed for memory, whether
  // PM2 did it via a signal or the OS OOM killer did it via SIGKILL.
  const peakRssMb = Math.max(
    prevState?.peakRssMb ?? 0,
    prevState?.mem.rssMb ?? 0,
    prevShutdown?.peakRssMb ?? 0,
    prevShutdown?.mem.rssMb ?? 0,
  );
  const memoryPressure = peakRssMb >= OOM_RSS_MB;

  let kind: RestartKind;

  if (!prevState && !prevShutdown) {
    kind = 'FIRST_START';
  } else if (prevShutdown) {
    if (prevShutdown.reason === 'UNCAUGHT_EXCEPTION') kind = 'CRASH_EXCEPTION';
    else if (prevShutdown.reason === 'UNHANDLED_REJECTION') kind = 'CRASH_REJECTION';
    // SIGTERM / SIGINT / SIGHUP: PM2-initiated. High peak RSS ⇒ memory restart,
    // otherwise a genuinely clean cron/manual restart.
    else kind = memoryPressure ? 'OOM_SUSPECTED' : 'CLEAN_SHUTDOWN';
  } else {
    // prevState exists but no shutdown record → hard kill (SIGKILL / OS OOM).
    kind = memoryPressure ? 'OOM_SUSPECTED' : 'UNKNOWN_RESTART';
  }

  // ── 3. Clean up files so next startup starts fresh ──
  deleteSync(SHUTDOWN_FILE);

  // ── 4. Write fresh state immediately ──
  writeStateSync(_startedAt);

  // ── 5. Start periodic state updates ──
  if (!global.__restartLoggerInterval) {
    const interval = setInterval(() => writeStateSync(_startedAt), STATE_INTERVAL_MS);
    (interval as unknown as { unref(): void }).unref();
    global.__restartLoggerInterval = interval;
  }

  // ── 6. Register signal / exception handlers ──
  registerHandlers();

  // ── 7. Post restart event to DB (async, non-blocking) ──
  postRestartEvent(kind, prevState, prevShutdown).catch(() => {
    // already logged inside postRestartEvent
  });

  logger.info({ kind }, '[RestartLogger] Initialized');
}
