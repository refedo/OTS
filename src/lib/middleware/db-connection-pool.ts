/**
 * Database Connection Pool Middleware
 *
 * Single PrismaClient instance shared across the entire Next.js process.
 * Uses global to survive hot-reloads in development (avoids connection leaks).
 *
 * Connection limit is configured via DATABASE_URL:
 *   ?connection_limit=10&pool_timeout=20
 *
 * Keep the pool small — MySQL's max_connections is shared across all apps
 * (OTS + Dolibarr). A limit of 10 leaves headroom for the Dolibarr DB pool
 * (3 connections) and interactive MySQL sessions.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

// ── Global guard (survives Next.js hot-reloads in dev) ────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __dbPoolActivityInterval: NodeJS.Timeout | undefined;
}

// ── Singleton factory ─────────────────────────────────────────────────────────

const SLOW_QUERY_WARN_MS = 1_000;
const SLOW_QUERY_ERROR_MS = 3_000;

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
    ],
  });

  client.$on('query', (e: Prisma.QueryEvent) => {
    if (e.duration >= SLOW_QUERY_ERROR_MS) {
      logger.error(
        { durationMs: e.duration, query: e.query.slice(0, 400), params: e.params.slice(0, 200) },
        '[DB] Very slow query'
      );
    } else if (e.duration >= SLOW_QUERY_WARN_MS) {
      logger.warn(
        { durationMs: e.duration, query: e.query.slice(0, 400) },
        '[DB] Slow query'
      );
    }
  });

  return client;
}

/**
 * Returns the shared PrismaClient instance.
 * In production a module-level singleton is used.
 * In development the global is used so hot-reloads don't create new pools.
 */
function getOrCreateClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    // Module-level variable is stable in production (no hot-reload)
    if (!_productionInstance) {
      _productionInstance = createClient();
      setupGracefulShutdown(_productionInstance);
    }
    return _productionInstance;
  }

  // Development: use global so the same instance survives hot-reloads
  if (!global.__prismaClient) {
    global.__prismaClient = createClient();
  }
  return global.__prismaClient;
}

let _productionInstance: PrismaClient | undefined;

// ── Export ────────────────────────────────────────────────────────────────────

export const db = getOrCreateClient();

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function setupGracefulShutdown(client: PrismaClient): void {
  const shutdown = async () => {
    await client.$disconnect();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  process.once('beforeExit', shutdown);
}

// ── Pool stats (kept for backward-compat imports) ─────────────────────────────

export const dbPool = {
  getClient: () => db,
  disconnect: async () => { await db.$disconnect(); },
  getStats: () => ({
    connectionCount: 0,
    lastActivity: new Date(),
    idleTime: 0,
    isConnected: true,
  }),
  healthCheck: async () => {
    try {
      await db.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  },
};

export default db;
