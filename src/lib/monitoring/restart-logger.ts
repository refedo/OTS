/**
 * Restart Logger
 *
 * Persists the reason for every PM2 restart so we can investigate the root cause.
 *
 * How it works:
 *  1. Writes process state (memory, uptime) to logs/process-state.json every minute
 *     using synchronous I/O so it survives OOM kills.
 *  2. On SIGTERM / uncaughtException / unhandledRejection writes
 *     logs/last-shutdown.json synchronously before the process exits.
 *  3. On startup, reads both files and posts a PROCESS_RESTART event to the DB:
 *       - CLEAN_SHUTDOWN   → SIGTERM received (cron restart or manual pm2 restart)
 *       - CRASH_EXCEPTION  → uncaughtException
 *       - CRASH_REJECTION  → unhandledRejection
 *       - OOM_SUSPECTED    → no clean shutdown + last state showed rss ≥ 700 MB
 *       - UNKNOWN_RESTART  → process-state.json exists but no shutdown file
 *       - FIRST_START      → no prior state at all
 */

import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

// ─── paths ─────────────────────────────────────────────────────────────────

const LOGS_DIR = path.join(process.cwd(), 'logs');
const SHUTDOWN_FILE = path.join(LOGS_DIR, 'last-shutdown.json');
const STATE_FILE = path.join(LOGS_DIR, 'process-state.json');
const STATE_INTERVAL_MS = 60_000; // 1 minute

// ─── types ─────────────────────────────────────────────────────────────────

interface MemSnapshot {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
}

type ShutdownReason =
  | 'SIGTERM'
  | 'UNCAUGHT_EXCEPTION'
  | 'UNHANDLED_REJECTION'
  | 'EXIT_NONZERO';

interface ShutdownRecord {
  reason: ShutdownReason;
  exitCode?: number;
  error?: string;
  stack?: string;
  mem: MemSnapshot;
  uptimeSec: number;
  timestamp: string;
}

interface StateRecord {
  pid: number;
  startedAt: string;
  updatedAt: string;
  uptimeSec: number;
  mem: MemSnapshot;
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
  const state: StateRecord = {
    pid: process.pid,
    startedAt: startedAt.toISOString(),
    updatedAt: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    mem: currentMem(),
  };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // non-fatal — disk full or permissions issue
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
    const errorMsg = shutdown?.error ?? null;
    const stack = shutdown?.stack ?? null;

    const titleMap: Record<RestartKind, string> = {
      CLEAN_SHUTDOWN: 'Process restarted cleanly (SIGTERM)',
      CRASH_EXCEPTION: `Process crashed — uncaughtException${errorMsg ? `: ${errorMsg.slice(0, 100)}` : ''}`,
      CRASH_REJECTION: `Process crashed — unhandledRejection${errorMsg ? `: ${errorMsg.slice(0, 100)}` : ''}`,
      OOM_SUSPECTED: `Process killed — OOM suspected (RSS was ${prevMem?.rssMb ?? '?'} MB)`,
      UNKNOWN_RESTART: 'Process restarted — reason unknown (no shutdown record)',
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
        metadata: {
          kind,
          prevUptimeSec,
          prevMem,
          exitCode: shutdown?.exitCode ?? null,
          error: errorMsg,
          stack,
          prevStartedAt: prevState?.startedAt ?? null,
          prevUpdatedAt: prevState?.updatedAt ?? null,
        },
      },
    });

    logger.info(
      { kind, prevUptimeSec, prevRssMb: prevMem?.rssMb },
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

  process.once('SIGTERM', () => {
    writeShutdownSync({
      reason: 'SIGTERM',
      mem: currentMem(),
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    logger.info({ uptimeSec: Math.round(process.uptime()) }, '[RestartLogger] SIGTERM received — clean shutdown');
    // Let PM2 kill after kill_timeout; do NOT call process.exit() here
  });

  process.on('uncaughtException', (err: Error) => {
    writeShutdownSync({
      reason: 'UNCAUGHT_EXCEPTION',
      error: err.message,
      stack: err.stack,
      mem: currentMem(),
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
    writeShutdownSync({
      reason: 'UNHANDLED_REJECTION',
      error: message,
      stack,
      mem: currentMem(),
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
  let kind: RestartKind;

  if (!prevState && !prevShutdown) {
    kind = 'FIRST_START';
  } else if (prevShutdown) {
    if (prevShutdown.reason === 'SIGTERM') kind = 'CLEAN_SHUTDOWN';
    else if (prevShutdown.reason === 'UNCAUGHT_EXCEPTION') kind = 'CRASH_EXCEPTION';
    else kind = 'CRASH_REJECTION';
  } else {
    // prevState exists but no shutdown record → ungraceful kill
    const rssMb = prevState!.mem.rssMb;
    kind = rssMb >= 700 ? 'OOM_SUSPECTED' : 'UNKNOWN_RESTART';
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
