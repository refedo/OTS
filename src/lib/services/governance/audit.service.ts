/**
 * Audit Service
 * 
 * Provides centralized audit logging for all entity changes.
 * Tracks who changed what, when, and why with field-level detail.
 */

import prisma from '@/lib/db';
import { AuditAction } from '@prisma/client';
import { getRequestContext, getRequestId, getCurrentUserId, getRequestSource } from './request-context';

// Entities that should be audited
export const AUDITED_ENTITIES = [
  'Project',
  'Building',
  'AssemblyPart',
  'ProductionLog',
  'QCInspection',
  'WPS',
  'ITP',
  'Document',
  'RFIRequest',
  'NCRReport',
] as const;

export type AuditedEntity = typeof AUDITED_ENTITIES[number];

// Field changes structure
export interface FieldChange {
  old: unknown;
  new: unknown;
}

export interface AuditLogParams {
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, FieldChange>;
  reason?: string;
  metadata?: Record<string, unknown>;
  userId?: string; // Override context userId if needed
}

export interface BatchAuditParams {
  entityType: string;
  action: AuditAction;
  entityIds: string[];
  summary: string;
  metadata?: Record<string, unknown>;
}

class AuditService {
  /**
   * Log a single audit entry
   */
  async log(params: AuditLogParams): Promise<void> {
    const { entityType, entityId, action, changes, reason, metadata, userId } = params;
    
    const performedById = userId || getCurrentUserId();
    if (!performedById) {
      console.warn('[AuditService] No user ID available for audit log, skipping');
      return;
    }

    const requestId = getRequestId();
    const source = getRequestSource();

    try {
      await prisma.auditLog.create({
        data: {
          entityType,
          entityId,
          action,
          changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
          performedById,
          requestId,
          sourceModule: source,
          reason,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });
    } catch (error) {
      console.error('[AuditService] Failed to create audit log:', error);
      // Don't throw - audit failures shouldn't break the main operation
    }
  }

  /**
   * Log a batch of audit entries (for bulk operations)
   */
  async logBatch(params: BatchAuditParams): Promise<void> {
    const { entityType, action, entityIds, summary, metadata } = params;
    
    const performedById = getCurrentUserId();
    if (!performedById) {
      console.warn('[AuditService] No user ID available for batch audit log, skipping');
      return;
    }

    const requestId = getRequestId();
    const source = getRequestSource();

    try {
      // Create a single summary audit entry for batch operations
      await prisma.auditLog.create({
        data: {
          entityType,
          entityId: 'BATCH',
          action,
          changes: null,
          performedById,
          requestId,
          sourceModule: source,
          reason: summary,
          metadata: {
            ...metadata,
            batchSize: entityIds.length,
            entityIds: entityIds.slice(0, 100), // Limit stored IDs
          },
        },
      });
    } catch (error) {
      console.error('[AuditService] Failed to create batch audit log:', error);
    }
  }

  /**
   * Log entity creation
   */
  async logCreate(entityType: string, entityId: string, data: Record<string, unknown>, reason?: string): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: 'CREATE',
      changes: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, { old: null, new: value }])
      ),
      reason,
    });
  }

  /**
   * Log entity update with field-level changes
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    reason?: string
  ): Promise<void> {
    const changes: Record<string, FieldChange> = {};
    
    // Find changed fields
    for (const key of Object.keys(newData)) {
      const oldValue = oldData[key];
      const newValue = newData[key];
      
      // Deep comparison for objects
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }

    // Only log if there are actual changes
    if (Object.keys(changes).length > 0) {
      await this.log({
        entityType,
        entityId,
        action: 'UPDATE',
        changes,
        reason,
      });
    }
  }

  /**
   * Log entity deletion
   */
  async logDelete(entityType: string, entityId: string, reason?: string): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: 'DELETE',
      reason,
    });
  }

  /**
   * Log entity restoration (from soft delete)
   */
  async logRestore(entityType: string, entityId: string, reason?: string): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: 'RESTORE',
      reason,
    });
  }

  /**
   * Log approval action
   */
  async logApprove(entityType: string, entityId: string, reason?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: 'APPROVE',
      reason,
      metadata,
    });
  }

  /**
   * Log rejection action
   */
  async logReject(entityType: string, entityId: string, reason: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: 'REJECT',
      reason,
      metadata,
    });
  }

  /**
   * Log sync action
   */
  async logSync(entityType: string, entityId: string, source: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      entityType,
      entityId,
      action: 'SYNC',
      reason: `Synced from ${source}`,
      metadata,
    });
  }

  /**
   * Get audit trail for an entity
   */
  async getTrail(entityType: string, entityId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: Array<{
      id: string;
      action: AuditAction;
      changes: unknown;
      performedBy: { id: string; name: string };
      performedAt: Date;
      reason: string | null;
      sourceModule: string | null;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0 } = options || {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { performedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          performedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.auditLog.count({ where: { entityType, entityId } }),
    ]);

    return { logs, total };
  }

  /**
   * Get recent audit logs (for dashboard/monitoring)
   */
  async getRecent(options?: {
    entityType?: string;
    action?: AuditAction;
    userId?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    performedBy: { id: string; name: string };
    performedAt: Date;
    reason: string | null;
  }>> {
    const { entityType, action, userId, limit = 50 } = options || {};

    return prisma.auditLog.findMany({
      where: {
        ...(entityType && { entityType }),
        ...(action && { action }),
        ...(userId && { performedById: userId }),
      },
      orderBy: { performedAt: 'desc' },
      take: limit,
      include: {
        performedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }
}

// Export singleton instance
export const auditService = new AuditService();
