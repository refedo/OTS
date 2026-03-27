/**
 * System Event Service
 *
 * Enterprise-grade event logging for OTS.
 * Captures all significant events across the platform for audit, debugging, compliance, and operational intelligence.
 */

import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import {
  EventType,
  EventCategory,
  EventSeverity,
  SystemEventParams,
  FieldChange,
} from '@/types/system-events';

// ============================================================================
// SYSTEM EVENT SERVICE
// ============================================================================

class SystemEventService {
  /**
   * One-time lazy init: renames `SystemEvent` → `system_events` if needed,
   * then adds all required columns that may be missing from older deployments.
   * Safe to call multiple times — runs only once per process.
   */
  private static _initPromise: Promise<void> | null = null;

  private async _ensureTable(): Promise<void> {
    if (SystemEventService._initPromise) return SystemEventService._initPromise;
    SystemEventService._initPromise = (async () => {
      try {
        // Rename from CamelCase if the table was created by the original migration
        await prisma.$executeRawUnsafe('RENAME TABLE IF EXISTS `SystemEvent` TO `system_events`');
        // Make userId nullable
        await prisma.$executeRawUnsafe('ALTER TABLE `system_events` MODIFY COLUMN `userId` CHAR(36) NULL');
        // Widen eventType
        await prisma.$executeRawUnsafe('ALTER TABLE `system_events` MODIFY COLUMN `eventType` VARCHAR(60) NOT NULL');
        // Add all columns that may be missing (all idempotent)
        const cols = [
          'ADD COLUMN IF NOT EXISTS `eventCategory` VARCHAR(30) NULL',
          'ADD COLUMN IF NOT EXISTS `severity` VARCHAR(20) NOT NULL DEFAULT \'INFO\'',
          'ADD COLUMN IF NOT EXISTS `summary` VARCHAR(500) NULL',
          'ADD COLUMN IF NOT EXISTS `details` JSON NULL',
          'ADD COLUMN IF NOT EXISTS `changedFields` JSON NULL',
          'ADD COLUMN IF NOT EXISTS `userName` VARCHAR(100) NULL',
          'ADD COLUMN IF NOT EXISTS `userRole` VARCHAR(50) NULL',
          'ADD COLUMN IF NOT EXISTS `ipAddress` VARCHAR(45) NULL',
          'ADD COLUMN IF NOT EXISTS `userAgent` VARCHAR(500) NULL',
          'ADD COLUMN IF NOT EXISTS `entityName` VARCHAR(200) NULL',
          'ADD COLUMN IF NOT EXISTS `entityId` VARCHAR(50) NULL',
          'ADD COLUMN IF NOT EXISTS `projectNumber` VARCHAR(20) NULL',
          'ADD COLUMN IF NOT EXISTS `buildingId` CHAR(36) NULL',
          'ADD COLUMN IF NOT EXISTS `correlationId` VARCHAR(50) NULL',
          'ADD COLUMN IF NOT EXISTS `parentEventId` CHAR(36) NULL',
          'ADD COLUMN IF NOT EXISTS `sessionId` VARCHAR(100) NULL',
          'ADD COLUMN IF NOT EXISTS `duration` INT NULL',
          'ADD COLUMN IF NOT EXISTS `requestId` VARCHAR(64) NULL',
        ];
        for (const col of cols) {
          await prisma.$executeRawUnsafe(`ALTER TABLE \`system_events\` ${col}`).catch(() => {});
        }
        logger.info('[SystemEventService] Table verified/repaired');
      } catch (err) {
        logger.warn({ err }, '[SystemEventService] Table repair skipped (may already be correct)');
      }
    })();
    return SystemEventService._initPromise;
  }

  /**
   * Core logging method.
   * Fire-and-forget for INFO/WARNING; awaited for ERROR/CRITICAL.
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

    // Ensure table exists with correct name and schema (no-op after first call)
    await this._ensureTable().catch(() => {});

    const logPromise = prisma.systemEvent
      .create({
        data: {
          eventType,
          eventCategory: eventCategory ?? null,
          // Legacy category field: derive a coarse category from eventCategory for backward compat
          category: this._legacyCategory(eventCategory),
          severity,
          // Who
          userId: userId ?? null,
          userName: userName ?? null,
          userRole: userRole ?? null,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          // What
          entityType: entityType ?? null,
          entityId: entityId != null ? String(entityId) : null,
          entityName: entityName ?? null,
          // Context
          projectId: projectId ?? null,
          projectNumber: projectNumber ?? null,
          buildingId: buildingId ?? null,
          // Details
          title: summary.slice(0, 255),
          summary: summary ?? null,
          details: details ?? null,
          metadata: metadata ?? null,
          changedFields: changedFields ?? null,
          // Timing
          duration: duration ?? null,
          // Correlation
          correlationId: correlationId ?? null,
          parentEventId: parentEventId ?? null,
          sessionId: sessionId ?? null,
        },
      })
      .catch((error: unknown) => {
        logger.error({ error, eventType }, '[SystemEventService] Failed to log event');
      });

    if (severity === 'ERROR' || severity === 'CRITICAL') {
      await logPromise;
    }
    // INFO/WARNING: fire-and-forget
  }

  /**
   * Log multiple events in a single batch insert (for bulk operations).
   */
  async logBatch(events: SystemEventParams[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const data = events.map((p) => ({
        eventType: p.eventType,
        eventCategory: p.eventCategory ?? null,
        category: this._legacyCategory(p.eventCategory),
        severity: p.severity ?? 'INFO',
        userId: p.userId ?? null,
        userName: p.userName ?? null,
        userRole: p.userRole ?? null,
        ipAddress: p.ipAddress ?? null,
        userAgent: p.userAgent ?? null,
        entityType: p.entityType ?? null,
        entityId: p.entityId != null ? String(p.entityId) : null,
        entityName: p.entityName ?? null,
        projectId: p.projectId ?? null,
        projectNumber: p.projectNumber ?? null,
        buildingId: p.buildingId ?? null,
        title: p.summary.slice(0, 255),
        summary: p.summary ?? null,
        details: p.details ?? null,
        metadata: p.metadata ?? null,
        changedFields: p.changedFields ?? null,
        duration: p.duration ?? null,
        correlationId: p.correlationId ?? null,
        parentEventId: p.parentEventId ?? null,
        sessionId: p.sessionId ?? null,
      }));

      await prisma.systemEvent.createMany({ data });
    } catch (error) {
      logger.error({ error }, '[SystemEventService] Failed to log batch events');
    }
  }

  /**
   * Generate a correlation ID for grouping related events (e.g., all events in a sync).
   */
  generateCorrelationId(): string {
    return `corr_${uuidv4().slice(0, 12)}`;
  }

  /**
   * Compare old and new data objects and return field-level changes.
   * Returns null when nothing changed.
   */
  detectChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    trackedFields?: string[]
  ): Record<string, FieldChange> | null {
    const changes: Record<string, FieldChange> = {};
    const fields = trackedFields ?? Object.keys(newData);

    for (const field of fields) {
      const oldVal = oldData[field];
      const newVal = newData[field];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[field] = { old: oldVal, new: newVal };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

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
    const severityMap: Record<string, EventSeverity> = {
      AUTH_LOGIN_FAILED: 'WARNING',
      AUTH_ACCOUNT_LOCKED: 'WARNING',
      AUTH_SESSION_REVOKED: 'WARNING',
    };

    const summaryMap: Record<string, string> = {
      AUTH_LOGIN_SUCCESS: `User ${details?.userName ?? userId} logged in`,
      AUTH_LOGIN_FAILED: `Failed login attempt for ${details?.userName ?? 'unknown user'}`,
      AUTH_LOGOUT: `User ${details?.userName ?? userId} logged out`,
      AUTH_SESSION_EXPIRED: `Session expired for ${details?.userName ?? userId}`,
      AUTH_SESSION_REVOKED: `Session revoked for ${details?.userName ?? userId}`,
      AUTH_PASSWORD_CHANGED: `Password changed for ${details?.userName ?? userId}`,
      AUTH_PASSWORD_RESET: `Password reset for ${details?.userName ?? userId}`,
      AUTH_ACCOUNT_LOCKED: `Account locked for ${details?.userName ?? userId}`,
      AUTH_ACCOUNT_UNLOCKED: `Account unlocked for ${details?.userName ?? userId}`,
      AUTH_ROLE_CHANGED: `Role changed for ${details?.userName ?? userId}: ${details?.oldRole} → ${details?.newRole}`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'AUTH',
      severity: severityMap[type] ?? 'INFO',
      userId,
      userName: details?.userName,
      ipAddress: details?.ipAddress,
      userAgent: details?.userAgent,
      summary: summaryMap[type] ?? `Auth event: ${type}`,
      details: details as Record<string, unknown>,
    });
  }

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
      PROJECT_CREATED: `Project ${details?.projectNumber ?? projectId} created`,
      PROJECT_UPDATED: `Project ${details?.projectNumber ?? projectId} updated`,
      PROJECT_STATUS_CHANGED: `Project ${details?.projectNumber} status: ${details?.oldStatus} → ${details?.newStatus}`,
      PROJECT_PHASE_CHANGED: `Project ${details?.projectNumber} phase changed`,
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
      summary: summaryMap[type] ?? `Project event: ${type}`,
      changedFields: details?.changedFields,
      details: details as Record<string, unknown>,
    });
  }

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
      summary: summaryMap[type] ?? `Task event: ${type}`,
      changedFields: details?.changedFields,
      details: details as Record<string, unknown>,
    });
  }

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
      PRODUCTION_IMPORT_STARTED: 'Production import started',
      PRODUCTION_IMPORT_COMPLETED: `Production import completed: ${details?.importStats?.created} created, ${details?.importStats?.updated} updated`,
      PRODUCTION_IMPORT_FAILED: 'Production import failed',
      ASSEMBLY_PART_CREATED: `Assembly part ${details?.entityName} created`,
      ASSEMBLY_PART_BULK_IMPORT: `Bulk assembly import: ${details?.count} parts`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'PRODUCTION',
      severity: type.includes('FAILED') ? 'ERROR' : 'INFO',
      userId,
      userName: details?.userName,
      entityType: details?.entityType ?? 'ProductionLog',
      entityId,
      entityName: details?.entityName,
      projectId: details?.projectId,
      projectNumber: details?.projectNumber,
      summary: summaryMap[type] ?? `Production event: ${type}`,
      details: details as Record<string, unknown>,
    });
  }

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
      entityType: details?.entityType ?? 'QCInspection',
      entityId,
      entityName: details?.entityName,
      projectId: details?.projectId,
      projectNumber: details?.projectNumber,
      summary: summaryMap[type] ?? `QC event: ${type}`,
      details: details as Record<string, unknown>,
    });
  }

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
      summary: summaryMap[type] ?? `Financial event: ${type}`,
      duration: details?.duration,
      details: details as Record<string, unknown>,
    });
  }

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
      SYS_SHUTDOWN: 'System shutting down',
      SYS_VERSION_UPDATED: `System updated to v${details?.version}`,
      SYS_CRON_EXECUTED: `Cron job executed: ${details?.cronJob}`,
      SYS_CRON_FAILED: `Cron job failed: ${details?.cronJob} — ${details?.error}`,
      SYS_ERROR_UNHANDLED: `Unhandled error: ${details?.error}`,
      SYS_API_ERROR: `API error on ${details?.route}: ${details?.statusCode}`,
      SYS_MEMORY_WARNING: `Memory usage warning: ${details?.memoryUsage}%`,
      SYS_MEMORY_CRITICAL: `Memory usage critical: ${details?.memoryUsage}%`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'SYSTEM',
      severity: severityMap[type] ?? 'INFO',
      // userId null — system-generated event
      summary: summaryMap[type] ?? `System event: ${type}`,
      duration: details?.duration,
      details: details as Record<string, unknown>,
    });
  }

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
    const category: EventCategory = type.startsWith('DOLIBARR_') ? 'DOLIBARR' : 'PTS';

    const severityMap: Record<string, EventSeverity> = {
      DOLIBARR_API_ERROR: 'ERROR',
      DOLIBARR_DISCONNECTED: 'WARNING',
      PTS_SYNC_FAILED: 'ERROR',
    };

    const summaryMap: Record<string, string> = {
      DOLIBARR_CONNECTED: 'Connected to Dolibarr API',
      DOLIBARR_DISCONNECTED: 'Dolibarr API connection lost',
      DOLIBARR_PRODUCT_SYNCED: `Dolibarr products synced: ${details?.counts?.created} created, ${details?.counts?.updated} updated`,
      DOLIBARR_API_ERROR: `Dolibarr API error: ${details?.error}`,
      PTS_SYNC_STARTED: 'PTS sync started',
      PTS_SYNC_COMPLETED: `PTS sync completed: ${details?.counts?.created} parts, ${details?.counts?.updated} logs`,
      PTS_SYNC_FAILED: `PTS sync failed: ${details?.error}`,
      PTS_ROLLBACK_EXECUTED: `PTS data rolled back for projects: ${details?.projectNumbers?.join(', ')}`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: category,
      severity: severityMap[type] ?? 'INFO',
      userId: details?.userId,
      userName: details?.userName,
      summary: summaryMap[type] ?? `Integration event: ${type}`,
      duration: details?.duration,
      details: details as Record<string, unknown>,
    });
  }

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
      summary: summaryMap[type] ?? `User event: ${type}`,
      changedFields: details?.changedFields,
      details: details as Record<string, unknown>,
    });
  }

  async logBusiness(
    type: string,
    entityId: string,
    details?: {
      entityType?: string;
      entityName?: string;
      userId?: string;
      userName?: string;
      year?: number;
      status?: string;
      oldStatus?: string;
      newStatus?: string;
    }
  ): Promise<void> {
    const summaryMap: Record<string, string> = {
      BIZ_OBJECTIVE_CREATED: `Objective "${details?.entityName}" created`,
      BIZ_OBJECTIVE_UPDATED: `Objective "${details?.entityName}" updated`,
      BIZ_OBJECTIVE_DELETED: `Objective "${details?.entityName}" deleted`,
      BIZ_OBJECTIVE_COMPLETED: `Objective "${details?.entityName}" completed`,
      BIZ_INITIATIVE_CREATED: `Initiative "${details?.entityName}" created`,
      BIZ_INITIATIVE_UPDATED: `Initiative "${details?.entityName}" updated`,
      BIZ_INITIATIVE_STATUS: `Initiative "${details?.entityName}" status: ${details?.oldStatus} → ${details?.newStatus}`,
      BIZ_INITIATIVE_COMPLETED: `Initiative "${details?.entityName}" completed`,
      BIZ_KPI_CREATED: `KPI "${details?.entityName}" created`,
      BIZ_KPI_UPDATED: `KPI "${details?.entityName}" updated`,
      BIZ_SWOT_UPDATED: `SWOT analysis updated`,
    };

    await this.log({
      eventType: type as EventType,
      eventCategory: 'BUSINESS',
      userId: details?.userId,
      userName: details?.userName,
      entityType: details?.entityType ?? 'BusinessEntity',
      entityId,
      entityName: details?.entityName,
      summary: summaryMap[type] ?? `Business event: ${type}`,
      details: details as Record<string, unknown>,
    });
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  async getEvents(
    filter: {
      eventType?: string;
      eventCategory?: string;
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
    if (filter.eventCategory) where.eventCategory = filter.eventCategory;
    if (filter.category) where.category = filter.category;
    if (filter.severity) where.severity = filter.severity;
    if (filter.userId) where.userId = filter.userId;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.projectId) where.projectId = filter.projectId;

    if (filter.startDate ?? filter.endDate) {
      const range: Record<string, Date> = {};
      if (filter.startDate) range.gte = filter.startDate;
      if (filter.endDate) range.lte = filter.endDate;
      where.createdAt = range;
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search } },
        { summary: { contains: filter.search } },
        { entityName: { contains: filter.search } },
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

  async getStats(projectId?: string) {
    const where = projectId ? { projectId } : {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount, totalCount, byCategory, byType, bySeverity, recentErrors] =
      await Promise.all([
        prisma.systemEvent.count({ where: { ...where, createdAt: { gte: today } } }),
        prisma.systemEvent.count({ where }),
        prisma.systemEvent.groupBy({ by: ['eventCategory'], where, _count: true }),
        prisma.systemEvent.groupBy({
          by: ['eventType'],
          where,
          _count: true,
          orderBy: { _count: { eventType: 'desc' } },
          take: 10,
        }),
        prisma.systemEvent.groupBy({ by: ['severity'], where, _count: true }),
        prisma.systemEvent.findMany({
          where: { ...where, severity: { in: ['ERROR', 'CRITICAL'] } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { id: true, name: true } } },
        }),
      ]);

    const errorCount = bySeverity.find((s) => s.severity === 'ERROR')?._count ?? 0;
    const criticalCount = bySeverity.find((s) => s.severity === 'CRITICAL')?._count ?? 0;

    return {
      todayCount,
      totalCount,
      byCategory: byCategory.map((c) => ({ category: c.eventCategory, count: c._count })),
      byType: byType.map((t) => ({ eventType: t.eventType, count: t._count })),
      bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count })),
      errorRate: totalCount > 0 ? ((errorCount + criticalCount) / totalCount) * 100 : 0,
      recentErrors,
    };
  }

  async getEntityEvents(entityType: string, entityId: string, limit = 50) {
    return prisma.systemEvent.findMany({
      where: { entityType, entityId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getCorrelatedEvents(correlationId: string) {
    return prisma.systemEvent.findMany({
      where: { correlationId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDailyStats(days = 7): Promise<{ date: string; count: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM system_events
      WHERE created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const result: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const found = rows.find(r => {
        const rowDate = r.date instanceof Date ? r.date.toISOString() : String(r.date);
        return rowDate.startsWith(dateStr);
      });
      result.push({ date: dateStr, count: found ? Number(found.count) : 0 });
    }
    return result;
  }

  async getTopEventTypes(limit = 8, days = 7): Promise<{ eventType: string; count: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rows = await prisma.systemEvent.groupBy({
      by: ['eventType'],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { eventType: 'desc' } },
      take: limit,
    });
    return rows.map(r => ({ eventType: r.eventType, count: r._count }));
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Map new enterprise eventCategory to the legacy `category` field value
   * so existing queries using the old field continue to work.
   */
  private _legacyCategory(eventCategory?: EventCategory): string {
    const map: Record<string, string> = {
      AUTH: 'auth',
      PROJECT: 'project',
      TASK: 'record',
      PRODUCTION: 'production',
      QC: 'qc',
      ENGINEERING: 'record',
      FINANCIAL: 'sync',
      DOLIBARR: 'sync',
      PTS: 'sync',
      BUSINESS: 'record',
      NOTIFICATION: 'system',
      USER: 'record',
      SYSTEM: 'system',
      RISK: 'system',
      KNOWLEDGE: 'record',
      EXPORT: 'export',
    };
    return (eventCategory ? (map[eventCategory] ?? 'system') : 'system');
  }
}

// Export singleton instance
export const systemEventService = new SystemEventService();

// Export class for testing
export { SystemEventService };
