/**
 * Event Logger Middleware
 *
 * Provides a higher-order function that wraps Next.js API route handlers
 * to automatically capture request context (IP, user agent, session ID,
 * request duration) and attach it to the SystemEventService.
 *
 * Usage:
 *   export const GET = withApiContext(withEventContext(async (req, session, ctx) => {
 *     // req.eventContext is available here
 *   }));
 *
 * Or use the exported helpers directly in route handlers:
 *   const ctx = extractRequestContext(req, session);
 */

import { NextRequest } from 'next/server';
import { SessionData } from '@/lib/api-utils';
import { systemEventService } from '@/services/system-events.service';
import { EventType, EventCategory, EventSeverity, FieldChange } from '@/types/system-events';

// ============================================================================
// REQUEST CONTEXT
// ============================================================================

export interface RequestEventContext {
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestStartTime: number;
}

/**
 * Extract request context (IP, user-agent, session) from an incoming request
 * and the resolved session. Call this at the top of any route handler that
 * wants to enrich its event logs.
 */
export function extractRequestContext(
  req: NextRequest,
  session: SessionData | null
): RequestEventContext {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined;

  const userAgent = req.headers.get('user-agent') ?? undefined;

  // Session ID is stored in the JWT cookie; we use a truncated hash for privacy
  const sessionId = req.cookies.get(process.env.COOKIE_NAME ?? 'ots_session')?.value
    ? `sess_${req.cookies
        .get(process.env.COOKIE_NAME ?? 'ots_session')!
        .value.slice(-12)}`
    : undefined;

  return {
    userId: session?.userId,
    userName: session?.name,
    userRole: session?.role,
    ipAddress,
    userAgent,
    sessionId,
    requestStartTime: Date.now(),
  };
}

/**
 * Elapsed time since the request started (in ms).
 */
export function requestDuration(ctx: RequestEventContext): number {
  return Date.now() - ctx.requestStartTime;
}

// ============================================================================
// ENRICHED EVENT LOGGING HELPERS
// ============================================================================

/**
 * Log an event enriched with request context.
 * Callers still provide the business-level fields; this helper merges in
 * the HTTP-level context automatically.
 */
export async function logEventWithContext(
  ctx: RequestEventContext,
  event: {
    eventType: EventType;
    eventCategory: EventCategory;
    severity?: EventSeverity;
    entityType?: string;
    entityId?: string | number;
    entityName?: string;
    projectId?: string;
    projectNumber?: string;
    buildingId?: string;
    summary: string;
    details?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    changedFields?: Record<string, FieldChange>;
    duration?: number;
    correlationId?: string;
    parentEventId?: string;
  }
): Promise<void> {
  await systemEventService.log({
    ...event,
    userId: ctx.userId,
    userName: ctx.userName,
    userRole: ctx.userRole,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    sessionId: ctx.sessionId,
  });
}

// ============================================================================
// AUTH EVENT HELPERS (used in login/logout routes)
// ============================================================================

export async function logAuthEvent(
  req: NextRequest,
  type: string,
  userId: string,
  details?: {
    userName?: string;
    reason?: string;
    oldRole?: string;
    newRole?: string;
    sessionDuration?: number;
  }
): Promise<void> {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined;
  const userAgent = req.headers.get('user-agent') ?? undefined;

  await systemEventService.logAuth(type, userId, {
    ...details,
    ipAddress,
    userAgent,
  });
}

// ============================================================================
// API ERROR CAPTURE HELPER
// ============================================================================

/**
 * Log a server-side API error (status >= 500) as a system event.
 * Call this in catch blocks or error boundaries within route handlers.
 */
export async function logApiError(
  req: NextRequest,
  session: SessionData | null,
  error: unknown,
  statusCode = 500
): Promise<void> {
  const ctx = extractRequestContext(req, session);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  await systemEventService.logSystem('SYS_API_ERROR', {
    route: req.nextUrl.pathname,
    statusCode,
    error: message,
    ...(stack ? { stack } : {}),
  });

  // Also surface in structured logs
  const { logger } = await import('@/lib/logger');
  logger.error(
    { error, route: req.nextUrl.pathname, userId: ctx.userId },
    '[API] 500 error captured by event logger'
  );
}
