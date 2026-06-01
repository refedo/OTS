/**
 * API Utilities
 * 
 * Provides helpers for API routes including:
 * - Request context wrapping for audit logging
 * - Session verification
 * - Automatic audit trail logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SessionPayload } from '@/lib/jwt';
import { runWithContextAsync, createContextFromSession } from '@/lib/services/governance';
import { auditService } from '@/lib/services/governance';
import { eventService } from '@/lib/services/event.service';
import { AuditAction } from '@prisma/client';
import { logger } from '@/lib/logger';
import { recordRouteMemory } from '@/lib/monitoring/leak-diagnostics';

export interface SessionData {
  userId: string;
  name: string;
  role: string;
  departmentId?: string | null;
}

export interface ApiHandlerOptions {
  requireAuth?: boolean;
}

type ApiHandler<T = any> = (
  request: NextRequest,
  session: SessionData | null,
  context?: { params: Record<string, string> }
) => Promise<NextResponse<T>>;

/**
 * Convert SessionPayload to SessionData
 */
function toSessionData(payload: SessionPayload | null): SessionData | null {
  if (!payload) return null;
  return {
    userId: payload.sub,
    name: payload.name,
    role: payload.role,
    departmentId: payload.departmentId,
  };
}

/**
 * Wrap an API handler with session verification and request context
 */
const SLOW_REQUEST_WARN_MS = 5_000;
const SLOW_REQUEST_ERROR_MS = 10_000;

export function withApiContext<T = any>(
  handler: ApiHandler<T>,
  options: ApiHandlerOptions = { requireAuth: true }
): (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse> {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const startMs = Date.now();
    const heapBeforeBytes = process.memoryUsage().heapUsed;
    const method = request.method;
    const url = request.nextUrl.pathname;

    try {
      const cookieStore = await cookies();
      const cookieName = process.env.COOKIE_NAME || 'ots_session';
      const token = cookieStore.get(cookieName)?.value;
      const payload = token ? verifySession(token) : null;
      const session = toSessionData(payload);

      if (options.requireAuth && !session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Run handler within request context for audit logging
      const requestContext = createContextFromSession(
        payload ? { userId: payload.sub, name: payload.name, role: payload.role } : null,
        'API'
      );

      // Next.js 15: context.params is a Promise — resolve before passing to handler
      let resolvedContext = context;
      if (context?.params && typeof (context.params as unknown as Promise<Record<string, string>>).then === 'function') {
        resolvedContext = { params: await (context.params as unknown as Promise<Record<string, string>>) };
      }

      const response = await runWithContextAsync(requestContext, async () => {
        return handler(request, session, resolvedContext);
      });

      const durationMs = Date.now() - startMs;
      const mem = process.memoryUsage();
      const heapDeltaMb = Math.round((mem.heapUsed - heapBeforeBytes) / 1024 / 1024);

      // Attribute heap growth to the endpoint so a request-driven leak names
      // itself in the heap-snapshot / restart event. Noisy by nature (GC and
      // concurrency), but a route that repeatedly shows large positive deltas
      // is the prime suspect.
      if (heapDeltaMb >= 5) {
        recordRouteMemory({
          method,
          url,
          heapDeltaMb,
          rssAfterMb: Math.round(mem.rss / 1024 / 1024),
          durationMs,
          at: new Date().toISOString(),
        });
      }
      if (heapDeltaMb >= 40) {
        logger.warn(
          { method, url, durationMs, heapDeltaMb, rssAfterMb: Math.round(mem.rss / 1024 / 1024) },
          '[API] Large heap growth in single request — possible leak source'
        );
      }

      if (durationMs >= SLOW_REQUEST_ERROR_MS) {
        logger.error(
          { method, url, durationMs, heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024) },
          '[API] Very slow request — likely 502 source'
        );
      } else if (durationMs >= SLOW_REQUEST_WARN_MS) {
        logger.warn({ method, url, durationMs }, '[API] Slow request');
      }

      return response;
    } catch (error) {
      const durationMs = Date.now() - startMs;
      logger.error({ error, method, url, durationMs }, '[API] Unhandled error in route handler');
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Log an audit event for entity changes
 */
export async function logAuditEvent(params: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  userId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await auditService.log({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changes: params.changes,
      reason: params.reason,
      userId: params.userId,
      metadata: params.metadata,
    });
  } catch (error) {
    logger.error({ error }, '[AuditLog] Failed to log audit event');
  }
}

/**
 * Log a system event for activity tracking
 */
export async function logSystemEvent(params: {
  eventType: 'created' | 'updated' | 'deleted' | 'uploaded' | 'synced' | 'approved' | 'rejected' | 'imported' | 'exported' | 'login' | 'logout';
  category: 'file' | 'record' | 'sync' | 'export' | 'import' | 'auth' | 'production' | 'qc' | 'project' | 'system';
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  userId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await eventService.createEvent({
      eventType: params.eventType,
      category: params.category,
      title: params.title,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
      projectId: params.projectId,
      userId: params.userId,
      metadata: params.metadata,
    });
  } catch (error) {
    logger.error({ error }, '[SystemEvent] Failed to log system event');
  }
}

/**
 * Combined logging - logs both audit trail and system event
 */
export async function logActivity(params: {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SYNC';
  entityType: string;
  entityId: string;
  entityName: string;
  userId: string;
  projectId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const eventTypeMap: Record<string, 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'synced'> = {
    CREATE: 'created',
    UPDATE: 'updated',
    DELETE: 'deleted',
    APPROVE: 'approved',
    REJECT: 'rejected',
    SYNC: 'synced',
  };

  const categoryMap: Record<string, 'record' | 'qc' | 'project' | 'production'> = {
    Project: 'project',
    Building: 'project',
    AssemblyPart: 'production',
    ProductionLog: 'production',
    RFIRequest: 'qc',
    NCRReport: 'qc',
    WPS: 'qc',
    ITP: 'qc',
  };

  // Log to audit trail
  await logAuditEvent({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action as AuditAction,
    changes: params.changes,
    reason: params.reason,
    userId: params.userId,
    metadata: params.metadata,
  });

  // Log to system events
  await logSystemEvent({
    eventType: eventTypeMap[params.action] || 'updated',
    category: categoryMap[params.entityType] || 'record',
    title: `${params.entityType} ${params.action.toLowerCase()}: ${params.entityName}`,
    description: params.reason,
    entityType: params.entityType,
    entityId: params.entityId,
    projectId: params.projectId,
    userId: params.userId,
    metadata: params.metadata,
  });
}
