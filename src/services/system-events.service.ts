/**
 * System Event Service
 * 
 * Enterprise-grade event logging for OTS.
 * Captures all significant events across the platform for audit, debugging, compliance, and operational intelligence.
 */

import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  EventType,
  EventCategory,
  EventSeverity,
  SystemEventParams,
  FieldChange,
  EVENT_TYPE_TO_CATEGORY,
} from '@/types/system-events';

// ============================================================================
// SYSTEM EVENT SERVICE
// ============================================================================

class SystemEventService {
  /**
   * Core logging method - logs a system event
   * Uses fire-and-forget for INFO events, awaits for ERROR/CRITICAL
   */
  async log(params: SystemEventParams): Promise<void> {
    const {
      eventType,
      eventCategory,
      severity = 'INFO',
      userId,
      userName,
      userRole,
      ipAddress,
      userAgent,
      entityType,
      entityId,
      entityName,
      projectId,
      projectNumber,
      buildingId,
      summary,
      details,
      metadata,
      changedFields,
      duration,
      correlationId,
      parentEventId,
      sessionId,
    } = params;

    try {
      // For INFO events, fire-and-forget (don't await)
      // For WARNING/ERROR/CRITICAL, await to ensure logging
      const logPromise = prisma.systemEvent.create({
        data: {
          eventType,
          category: eventCategory,
          severity,
          title: summary,
          description: details ? JSON.stringify(details) : null,
          metadata: {
            ...(metadata || {}),
            userName,
            userRole,
            ipAddress,
            userAgent,
            entityName,
            projectNumber,
            buildingId,
            changedFields,
            duration,
            correlationId,
            parentEventId,
            sessionId,
          },
          entityType,
          entityId: entityId?.toString(),
          projectId: projectId || null,
          userId: userId || 'SYSTEM',
        },
      });

      if (severity === 'ERROR' || severity === 'CRITICAL') {
        await logPromise;
      } else {
        // Fire and forget for INFO/WARNING
        logPromise.catch((error) => {
          console.error('[SystemEventService] Failed to log event:', error);
        });
      }
    } catch (error) {
      console.error('[SystemEventService] Failed to log event:', error);
      // Don't throw - event logging should not break main functionality
    }
  }

  /**
   * Log multiple events in a batch (for bulk operations)
   */
  async logBatch(events: SystemEventParams[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const data = events.map((params) => ({
        eventType: params.eventType,
        category: params.eventCategory,
        severity: params.severity || 'INFO',
        title: params.summary,
        description: params.details ? JSON.stringify(params.details) : null,
        metadata: {
          ...(params.metadata || {}),
          userName: params.userName,
          userRole: params.userRole,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          entityName: params.entityName,
          projectNumber: params.projectNumber,
          buildingId: params.buildingId,
          changedFields: params.changedFields,
          duration: params.duration,
          correlationId: params.correlationId,
          parentEventId: params.parentEventId,
          sessionId: params.sessionId,
        },
        entityType: params.entityType,
        entityId: params.entityId?.toString(),
        projectId: params.projectId || null,
        userId: params.userId || 'SYSTEM',
      }));

      await prisma.systemEvent.createMany({ data });
    } catch (error) {
      console.error('[SystemEventService] Failed to log batch events:', error);
    }
  }

  /**
   * Generate a correlation ID for grouping related events
   */
  generateCorrelationId(): string {
    return `corr_${uuidv4().slice(0, 12)}`;
  }

  /**
   * Detect changes between old and new data
   */
  detectChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    trackedFields?: string[]
  ): Record<string, FieldChange> | null {
    const changes: Record<string, FieldChange> = {};
    const fieldsToCheck = trackedFields || Object.keys(newData);

    for (const field of fieldsToCheck) {
      const oldValue = oldData[field];
      const newValue = newData[field];

      // Deep comparison
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = { old: oldValue, new: newValue };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Log authentication events
   */
  async logAuth(
    type: string,
    userId: string,
    details?: {
      userName?: string;
      ipAddress?: string;
      userAgent?: string;
      reason?: string;
      oldRole?: string;
      newRole?: string;
      sessionDuration?: number;
    }
  ): Promise<void> {
    const summaryMap: Record<string, string> = {
      AUTH_LOGIN_SUCCESS: `User ${details?.userName || userId} logged in`,
      AUTH_LOGIN_FAILED: `Failed login attempt for ${details?.userName || 'unknown user'}`,
      AUTH_LOGOUT: `User ${details?.userName || userId} logged out`,
      AUTH_SESSION_EXPIRED: `Session expired for ${details?.userName || userId}`,
      AUTH_PASSWORD_CHANGED: `Password changed for ${details?.userName || userId}`,
      AUTH_PASSWORD_RESET: `Password reset for ${details?.userName || userId}`,
      AUTH_ACCOUNT_LOCKED: `Account locked for ${details?.userName || userId}`,
      AUTH_ACCOUNT_UNLOCKED: `Account unlocked for ${details?.userName || userId}`,
      AUTH_ROLE_CHANGED: `Role changed for ${details?.userName || userId}: ${details?.oldRole} → ${details?.newRole}`,
    };

    const severityMap: Record<string, EventSeverity> = {
      AUTH_LOGIN_FAILED: 'WARNING',
      AUTH_ACCOUNT_LOCKED: 'WARNING',
      AUTH_SESSION_EXPIRED: 'INFO',
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'AUTH',
      severity: severityMap[type] || 'INFO',
      userId,
      userName: details?.userName,
      ipAddress: details?.ipAddress,
      userAgent: details?.userAgent,
      summary: summaryMap[type] || `Auth event: ${type}`,
      details: details as Record<string, unknown>,
    });
  }

  /**
   * Log project events
   */
  async logProject(
    type: string,
    projectId: string,
    userId: string,
    details?: {
      projectNumber?: string;
      projectName?: string;
      userName?: string;
      changedFields?: Record<string, FieldChange>;
      oldStatus?: string;
      newStatus?: string;
      reason?: string;
    }
  ): Promise<void> {
    const summaryMap: Record<string, string> = {
      PROJECT_CREATED: `Project ${details?.projectNumber || projectId} created`,
      PROJECT_UPDATED: `Project ${details?.projectNumber || projectId} updated`,
      PROJECT_STATUS_CHANGED: `Project ${details?.projectNumber} status: ${details?.oldStatus} → ${details?.newStatus}`,
      PROJECT_ACTIVATED: `Project ${details?.projectNumber} activated`,
      PROJECT_COMPLETED: `Project ${details?.projectNumber} completed`,
      PROJECT_ON_HOLD: `Project ${details?.projectNumber} put on hold`,
      PROJECT_CANCELLED: `Project ${details?.projectNumber} cancelled`,
      PROJECT_DELETED: `Project ${details?.projectNumber} deleted`,
      PROJECT_RESTORED: `Project ${details?.projectNumber} restored`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'PROJECT',
      userId,
      userName: details?.userName,
      entityType: 'Project',
      entityId: projectId,
      entityName: details?.projectName,
      projectId,
      projectNumber: details?.projectNumber,
      summary: summaryMap[type] || `Project event: ${type}`,
      changedFields: details?.changedFields,
      details: details as Record<string, unknown>,
    });
  }

  /**
   * Log task events
   */
  async logTask(
    type: string,
    taskId: string,
    userId: string,
    details?: {
      taskTitle?: string;
      projectId?: string;
      projectNumber?: string;
      userName?: string;
      assigneeName?: string;
      changedFields?: Record<string, FieldChange>;
      oldStatus?: string;
      newStatus?: string;
      oldPriority?: string;
      newPriority?: string;
    }
  ): Promise<void> {
    const summaryMap: Record<string, string> = {
      TASK_CREATED: `Task "${details?.taskTitle}" created`,
      TASK_UPDATED: `Task "${details?.taskTitle}" updated`,
      TASK_STATUS_CHANGED: `Task "${details?.taskTitle}" status: ${details?.oldStatus} → ${details?.newStatus}`,
      TASK_ASSIGNED: `Task "${details?.taskTitle}" assigned to ${details?.assigneeName}`,
      TASK_COMPLETED: `Task "${details?.taskTitle}" completed`,
      TASK_APPROVED: `Task "${details?.taskTitle}" approved`,
      TASK_REJECTED: `Task "${details?.taskTitle}" rejected`,
      TASK_DELETED: `Task "${details?.taskTitle}" deleted`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'TASK',
      userId,
      userName: details?.userName,
      entityType: 'Task',
      entityId: taskId,
      entityName: details?.taskTitle,
      projectId: details?.projectId,
      projectNumber: details?.projectNumber,
      summary: summaryMap[type] || `Task event: ${type}`,
      changedFields: details?.changedFields,
      details: details as Record<string, unknown>,
    });
  }

  /**
   * Log production events
   */
  async logProduction(
    type: string,
    entityId: string,
    userId: string,
    details?: {
      entityType?: string;
      entityName?: string;
      projectId?: string;
      projectNumber?: string;
      userName?: string;
      count?: number;
      processType?: string;
      importStats?: { created: number; updated: number; errors: number; skipped: number };
    }
  ): Promise<void> {
    const summaryMap: Record<string, string> = {
      PRODUCTION_LOG_CREATED: `Production log created for ${details?.entityName}`,
      PRODUCTION_MASS_LOG: `Mass production logging: ${details?.count} entries`,
      PRODUCTION_IMPORT_STARTED: `Production import started`,
      PRODUCTION_IMPORT_COMPLETED: `Production import completed: ${details?.importStats?.created} created, ${details?.importStats?.updated} updated`,
      PRODUCTION_IMPORT_FAILED: `Production import failed`,
      ASSEMBLY_PART_CREATED: `Assembly part ${details?.entityName} created`,
      ASSEMBLY_PART_BULK_IMPORT: `Bulk assembly import: ${details?.count} parts`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'PRODUCTION',
      severity: type.includes('FAILED') ? 'ERROR' : 'INFO',
      userId,
      userName: details?.userName,
      entityType: details?.entityType || 'ProductionLog',
      entityId,
      entityName: details?.entityName,
      projectId: details?.projectId,
      projectNumber: details?.projectNumber,
      summary: summaryMap[type] || `Production event: ${type}`,
      details: details as Record<string, unknown>,
    });
  }

  /**
   * Log QC events
   */
  async logQC(
    type: string,
    entityId: string,
    userId: string,
    details?: {
      entityType?: string;
      entityName?: string;
      projectId?: string;
      projectNumber?: string;
      userName?: string;
      severity?: string;
      status?: string;
      reason?: string;
    }
  ): Promise<void> {
    const summaryMap: Record<string, string> = {
      QC_RFI_CREATED: `RFI ${details?.entityName} created`,
      QC_RFI_APPROVED: `RFI ${details?.entityName} approved`,
      QC_RFI_REJECTED: `RFI ${details?.entityName} rejected`,
      QC_NCR_CREATED: `NCR ${details?.entityName} raised`,
      QC_NCR_CLOSED: `NCR ${details?.entityName} closed`,
      QC_NCR_ESCALATED: `NCR ${details?.entityName} escalated`,
      QC_MIR_CREATED: `MIR ${details?.entityName} created`,
      QC_MIR_COMPLETED: `MIR ${details?.entityName} completed`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'QC',
      userId,
      userName: details?.userName,
      entityType: details?.entityType || 'QCInspection',
      entityId,
      entityName: details?.entityName,
      projectId: details?.projectId,
      projectNumber: details?.projectNumber,
      summary: summaryMap[type] || `QC event: ${type}`,
      details: details as Record<string, unknown>,
    });
  }

  /**
   * Log financial events
   */
  async logFinancial(
    type: string,
    userId: string,
    details?: {
      userName?: string;
      syncType?: string;
      duration?: number;
      counts?: { created: number; updated: number; deleted: number };
      reportType?: string;
      error?: string;
    }
  ): Promise<void> {
    const summaryMap: Record<string, string> = {
      FIN_SYNC_STARTED: `Financial sync started: ${details?.syncType}`,
      FIN_SYNC_COMPLETED: `Financial sync completed: ${details?.counts?.created} created, ${details?.counts?.updated} updated`,
      FIN_SYNC_FAILED: `Financial sync failed: ${details?.error}`,
      FIN_REPORT_GENERATED: `Financial report generated: ${details?.reportType}`,
      FIN_REPORT_EXPORTED: `Financial report exported: ${details?.reportType}`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'FINANCIAL',
      severity: type.includes('FAILED') ? 'ERROR' : 'INFO',
      userId,
      userName: details?.userName,
      summary: summaryMap[type] || `Financial event: ${type}`,
      duration: details?.duration,
      details: details as Record<string, unknown>,
    });
  }

  /**
   * Log system events
   */
  async logSystem(
    type: string,
    details?: {
      version?: string;
      environment?: string;
      nodeVersion?: string;
      cronJob?: string;
      duration?: number;
      error?: string;
      memoryUsage?: number;
      route?: string;
      statusCode?: number;
    }
  ): Promise<void> {
    const severityMap: Record<string, EventSeverity> = {
      SYS_ERROR_UNHANDLED: 'ERROR',
      SYS_API_ERROR: 'ERROR',
      SYS_CRON_FAILED: 'ERROR',
      SYS_BACKUP_FAILED: 'ERROR',
      SYS_MEMORY_WARNING: 'WARNING',
      SYS_MEMORY_CRITICAL: 'CRITICAL',
      SYS_DISK_SPACE_WARNING: 'WARNING',
      SYS_SSL_EXPIRY_WARNING: 'WARNING',
    };

    const summaryMap: Record<string, string> = {
      SYS_STARTUP: `System started: v${details?.version} (${details?.environment})`,
      SYS_SHUTDOWN: `System shutting down`,
      SYS_VERSION_UPDATED: `System updated to v${details?.version}`,
      SYS_CRON_EXECUTED: `Cron job executed: ${details?.cronJob}`,
      SYS_CRON_FAILED: `Cron job failed: ${details?.cronJob} - ${details?.error}`,
      SYS_ERROR_UNHANDLED: `Unhandled error: ${details?.error}`,
      SYS_API_ERROR: `API error on ${details?.route}: ${details?.statusCode}`,
      SYS_MEMORY_WARNING: `Memory usage warning: ${details?.memoryUsage}%`,
      SYS_MEMORY_CRITICAL: `Memory usage critical: ${details?.memoryUsage}%`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'SYSTEM',
      severity: severityMap[type] || 'INFO',
      userId: 'SYSTEM',
      summary: summaryMap[type] || `System event: ${type}`,
      duration: details?.duration,
      details: details as Record<string, unknown>,
    });
  }

  /**
   * Log integration events (Dolibarr, PTS)
   */
  async logIntegration(
    type: string,
    details?: {
      userId?: string;
      userName?: string;
      source?: string;
      duration?: number;
      counts?: { created: number; updated: number; errors: number; skipped: number };
      error?: string;
      projectNumbers?: string[];
    }
  ): Promise<void> {
    const category = type.startsWith('DOLIBARR_') ? 'DOLIBARR' : 'PTS';
    
    const severityMap: Record<string, EventSeverity> = {
      DOLIBARR_API_ERROR: 'ERROR',
      DOLIBARR_DISCONNECTED: 'WARNING',
      PTS_SYNC_FAILED: 'ERROR',
    };

    const summaryMap: Record<string, string> = {
      DOLIBARR_CONNECTED: `Connected to Dolibarr API`,
      DOLIBARR_DISCONNECTED: `Dolibarr API connection lost`,
      DOLIBARR_PRODUCT_SYNCED: `Dolibarr products synced: ${details?.counts?.created} created, ${details?.counts?.updated} updated`,
      DOLIBARR_API_ERROR: `Dolibarr API error: ${details?.error}`,
      PTS_SYNC_STARTED: `PTS sync started`,
      PTS_SYNC_COMPLETED: `PTS sync completed: ${details?.counts?.created} parts, ${details?.counts?.updated} logs`,
      PTS_SYNC_FAILED: `PTS sync failed: ${details?.error}`,
      PTS_ROLLBACK_EXECUTED: `PTS data rolled back for projects: ${details?.projectNumbers?.join(', ')}`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: category as EventCategory,
      severity: severityMap[type] || 'INFO',
      userId: details?.userId || 'SYSTEM',
      userName: details?.userName,
      summary: summaryMap[type] || `Integration event: ${type}`,
      duration: details?.duration,
      details: details as Record<string, unknown>,
    });
  }

  /**
   * Log user/RBAC events
   */
  async logUser(
    type: string,
    targetUserId: string,
    performedByUserId: string,
    details?: {
      targetUserName?: string;
      performedByName?: string;
      roleName?: string;
      oldRole?: string;
      newRole?: string;
      changedFields?: Record<string, FieldChange>;
    }
  ): Promise<void> {
    const summaryMap: Record<string, string> = {
      USER_CREATED: `User ${details?.targetUserName} created`,
      USER_UPDATED: `User ${details?.targetUserName} updated`,
      USER_DEACTIVATED: `User ${details?.targetUserName} deactivated`,
      USER_REACTIVATED: `User ${details?.targetUserName} reactivated`,
      USER_DELETED: `User ${details?.targetUserName} deleted`,
      USER_ADMIN_GRANTED: `Admin privileges granted to ${details?.targetUserName}`,
      USER_ADMIN_REVOKED: `Admin privileges revoked from ${details?.targetUserName}`,
      ROLE_ASSIGNED: `Role ${details?.roleName} assigned to ${details?.targetUserName}`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'USER',
      userId: performedByUserId,
      userName: details?.performedByName,
      entityType: 'User',
      entityId: targetUserId,
      entityName: details?.targetUserName,
      summary: summaryMap[type] || `User event: ${type}`,
      changedFields: details?.changedFields,
      details: details as Record<string, unknown>,
    });
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get events with filtering and pagination
   */
  async getEvents(
    filter: {
      eventType?: string;
      category?: string;
      severity?: string;
      userId?: string;
      entityType?: string;
      entityId?: string;
      projectId?: string;
      correlationId?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    } = {},
    limit = 50,
    offset = 0
  ) {
    const where: Record<string, unknown> = {};

    if (filter.eventType) where.eventType = filter.eventType;
    if (filter.category) where.category = filter.category;
    if (filter.severity) where.severity = filter.severity;
    if (filter.userId) where.userId = filter.userId;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.projectId) where.projectId = filter.projectId;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) (where.createdAt as Record<string, Date>).gte = filter.startDate;
      if (filter.endDate) (where.createdAt as Record<string, Date>).lte = filter.endDate;
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search } },
        { entityType: { contains: filter.search } },
        { eventType: { contains: filter.search } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.systemEvent.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          project: { select: { id: true, projectNumber: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.systemEvent.count({ where }),
    ]);

    return { events, total };
  }

  /**
   * Get event statistics
   */
  async getStats(projectId?: string) {
    const where = projectId ? { projectId } : {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount, totalCount, byCategory, byType, bySeverity, recentErrors] = await Promise.all([
      prisma.systemEvent.count({
        where: { ...where, createdAt: { gte: today } },
      }),
      prisma.systemEvent.count({ where }),
      prisma.systemEvent.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      prisma.systemEvent.groupBy({
        by: ['eventType'],
        where,
        _count: true,
        orderBy: { _count: { eventType: 'desc' } },
        take: 10,
      }),
      prisma.systemEvent.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      prisma.systemEvent.findMany({
        where: { ...where, severity: { in: ['ERROR', 'CRITICAL'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    const errorCount = bySeverity.find((s) => s.severity === 'ERROR')?._count || 0;
    const criticalCount = bySeverity.find((s) => s.severity === 'CRITICAL')?._count || 0;

    return {
      todayCount,
      totalCount,
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count })),
      byType: byType.map((t) => ({ eventType: t.eventType, count: t._count })),
      bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count })),
      errorRate: totalCount > 0 ? ((errorCount + criticalCount) / totalCount) * 100 : 0,
      recentErrors,
    };
  }

  /**
   * Get events for a specific entity (for entity timeline)
   */
  async getEntityEvents(entityType: string, entityId: string, limit = 50) {
    return prisma.systemEvent.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get events by correlation ID (for grouped operations)
   */
  async getCorrelatedEvents(correlationId: string) {
    return prisma.systemEvent.findMany({
      where: {
        metadata: {
          path: ['correlationId'],
          equals: correlationId,
        },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

// Export singleton instance
export const systemEventService = new SystemEventService();

// Export class for testing
export { SystemEventService };
