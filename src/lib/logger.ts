/**
 * Structured Logger
 *
 * Zero-dependency logger with Pino-compatible API.
 * Outputs JSON in production, human-readable in development.
 * Drop-in replacement path: swap implementation for `pino` when available.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ projectId }, 'Project created')
 *   logger.error({ error, userId }, 'Failed to create project')
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  time: string;
  msg: string;
  [key: string]: unknown;
}

const LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isDev = process.env.NODE_ENV !== 'production';
const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? (isDev ? 'debug' : 'info');

function shouldLog(level: LogLevel): boolean {
  return LEVEL_VALUES[level] >= LEVEL_VALUES[minLevel];
}

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      type: value.constructor.name,
      message: value.message,
      stack: isDev ? value.stack : undefined,
    };
  }
  return value;
}

function serializeContext(ctx: LogContext): LogContext {
  const result: LogContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    result[k] = serializeError(v);
  }
  return result;
}

function write(level: LogLevel, ctx: LogContext, msg: string): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    time: new Date().toISOString(),
    msg,
    ...serializeContext(ctx),
  };

  if (isDev) {
    const COLORS: Record<LogLevel, string> = {
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    };
    const RESET = '\x1b[0m';
    const color = COLORS[level];
    const contextStr = Object.keys(ctx).length > 0
      ? ` ${JSON.stringify(serializeContext(ctx))}`
      : '';
    const line = `${color}[${level.toUpperCase()}]${RESET} ${entry.time} ${msg}${contextStr}`;
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  } else {
    const line = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}

function createLogger(bindings: LogContext = {}) {
  return {
    debug(ctx: LogContext, msg: string): void {
      write('debug', { ...bindings, ...ctx }, msg);
    },
    info(ctx: LogContext, msg: string): void {
      write('info', { ...bindings, ...ctx }, msg);
    },
    warn(ctx: LogContext, msg: string): void {
      write('warn', { ...bindings, ...ctx }, msg);
    },
    error(ctx: LogContext, msg: string): void {
      write('error', { ...bindings, ...ctx }, msg);
    },
    /** Create a child logger with persistent context (e.g. requestId, module) */
    child(childBindings: LogContext) {
      return createLogger({ ...bindings, ...childBindings });
    },
  };
}

export const logger = createLogger();
export type Logger = ReturnType<typeof createLogger>;
