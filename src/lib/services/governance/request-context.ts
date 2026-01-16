/**
 * Request Context Service
 * 
 * Provides request-scoped context (userId, requestId, source) that can be
 * accessed anywhere in the application during a request lifecycle.
 * 
 * Uses AsyncLocalStorage for thread-safe context propagation.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// Context types
export type RequestSource = 'API' | 'UI' | 'SYNC' | 'AI' | 'SYSTEM' | 'CRON';

export interface RequestContext {
  requestId: string;
  userId: string | null;
  userName?: string;
  userRole?: string;
  source: RequestSource;
  startTime: number;
  metadata?: Record<string, unknown>;
}

// AsyncLocalStorage instance for request-scoped context
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Run a function within a request context
 */
export function runWithContext<T>(
  context: Partial<RequestContext> & { userId: string | null },
  fn: () => T
): T {
  const fullContext: RequestContext = {
    requestId: context.requestId || randomUUID(),
    userId: context.userId,
    userName: context.userName,
    userRole: context.userRole,
    source: context.source || 'API',
    startTime: context.startTime || Date.now(),
    metadata: context.metadata,
  };
  
  return asyncLocalStorage.run(fullContext, fn);
}

/**
 * Run an async function within a request context
 */
export async function runWithContextAsync<T>(
  context: Partial<RequestContext> & { userId: string | null },
  fn: () => Promise<T>
): Promise<T> {
  const fullContext: RequestContext = {
    requestId: context.requestId || randomUUID(),
    userId: context.userId,
    userName: context.userName,
    userRole: context.userRole,
    source: context.source || 'API',
    startTime: context.startTime || Date.now(),
    metadata: context.metadata,
  };
  
  return asyncLocalStorage.run(fullContext, fn);
}

/**
 * Get the current request context
 * Returns null if called outside of a request context
 */
export function getRequestContext(): RequestContext | null {
  return asyncLocalStorage.getStore() || null;
}

/**
 * Get the current user ID from context
 * Returns null if no context or no user
 */
export function getCurrentUserId(): string | null {
  const ctx = getRequestContext();
  return ctx?.userId || null;
}

/**
 * Get the current request ID from context
 * Generates a new one if not in a context (for standalone operations)
 */
export function getRequestId(): string {
  const ctx = getRequestContext();
  return ctx?.requestId || randomUUID();
}

/**
 * Get the current source from context
 */
export function getRequestSource(): RequestSource {
  const ctx = getRequestContext();
  return ctx?.source || 'SYSTEM';
}

/**
 * Create a context from session data (for API routes)
 */
export function createContextFromSession(session: {
  userId: string;
  name?: string;
  role?: string;
} | null, source: RequestSource = 'API'): Partial<RequestContext> & { userId: string | null } {
  return {
    userId: session?.userId || null,
    userName: session?.name,
    userRole: session?.role,
    source,
    requestId: randomUUID(),
    startTime: Date.now(),
  };
}

/**
 * Create a system context (for background jobs, cron, etc.)
 */
export function createSystemContext(
  source: RequestSource = 'SYSTEM',
  metadata?: Record<string, unknown>
): Partial<RequestContext> & { userId: string | null } {
  return {
    userId: null,
    source,
    requestId: randomUUID(),
    startTime: Date.now(),
    metadata,
  };
}
