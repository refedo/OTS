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

import { PrismaClient } from '@prisma/client';

// ── Global guard (survives Next.js hot-reloads in dev) ────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __dbPoolActivityInterval: NodeJS.Timeout | undefined;
}

// ── Singleton factory ─────────────────────────────────────────────────────────

function createClient(): PrismaClient {
  return new PrismaClient({
    log: ['error'],
    // connection_limit should be set in DATABASE_URL query string.
    // The datasources block is intentionally omitted here so Prisma reads
    // directly from DATABASE_URL (which can include ?connection_limit=10).
  });
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
