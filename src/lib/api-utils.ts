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
export function withApiContext<T = any>(
  handler: ApiHandler<T>,
  options: ApiHandlerOptions = { requireAuth: true }
): (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse> {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
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
      
      return await runWithContextAsync(requestContext, async () => {
        return handler(request, session, context);
      });
    } catch (error) {
      console.error('[API] Error:', error);
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
    console.error('[AuditLog] Failed to log:', error);
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
    console.error('[SystemEvent] Failed to log:', error);
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
