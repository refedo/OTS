/**
 * System Event Service
 * Tracks all system activities like file uploads, record creation/updates, syncs, etc.
 */

import { prisma } from '@/lib/prisma';

export type EventType = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'uploaded' 
  | 'synced' 
  | 'exported' 
  | 'imported'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'started'
  | 'login'
  | 'logout';

export type EventCategory = 
  | 'file' 
  | 'record' 
  | 'sync' 
  | 'export' 
  | 'import'
  | 'auth' 
  | 'production'
  | 'qc'
  | 'project'
  | 'system';

export interface CreateEventParams {
  eventType: EventType;
  category: EventCategory;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  userId: string;
}

export interface EventFilter {
  eventType?: EventType;
  category?: EventCategory;
  entityType?: string;
  projectId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

class EventService {
  /**
   * Create a new system event
   */
  async createEvent(params: CreateEventParams): Promise<void> {
    try {
      await prisma.systemEvent.create({
        data: {
          eventType: params.eventType,
          category: params.category,
          title: params.title,
          description: params.description,
          metadata: params.metadata as any,
          entityType: params.entityType,
          entityId: params.entityId,
          projectId: params.projectId,
          userId: params.userId,
        },
      });
    } catch (error) {
      console.error('[EventService] Failed to create event:', error);
      // Don't throw - event logging should not break main functionality
    }
  }

  /**
   * Get recent events with optional filtering
   */
  async getEvents(filter: EventFilter = {}, limit = 50, offset = 0) {
    const where: any = {};

    if (filter.eventType) where.eventType = filter.eventType;
    if (filter.category) where.category = filter.category;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.userId) where.userId = filter.userId;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
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
   * Get events for a specific entity
   */
  async getEntityEvents(entityType: string, entityId: string, limit = 20) {
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
   * Get event statistics
   */
  async getEventStats(projectId?: string) {
    const where = projectId ? { projectId } : {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount, totalCount, byCategory, byType] = await Promise.all([
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
      }),
    ]);

    return {
      todayCount,
      totalCount,
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count })),
      byType: byType.map(t => ({ eventType: t.eventType, count: t._count })),
    };
  }

  // Convenience methods for common events
  async logRecordCreated(entityType: string, entityId: string, title: string, userId: string, projectId?: string) {
    await this.createEvent({
      eventType: 'created',
      category: 'record',
      title,
      entityType,
      entityId,
      projectId,
      userId,
    });
  }

  async logRecordUpdated(entityType: string, entityId: string, title: string, userId: string, projectId?: string) {
    await this.createEvent({
      eventType: 'updated',
      category: 'record',
      title,
      entityType,
      entityId,
      projectId,
      userId,
    });
  }

  async logRecordDeleted(entityType: string, entityId: string, title: string, userId: string, projectId?: string) {
    await this.createEvent({
      eventType: 'deleted',
      category: 'record',
      title,
      entityType,
      entityId,
      projectId,
      userId,
    });
  }

  async logFileUploaded(fileName: string, fileType: string, userId: string, projectId?: string, metadata?: Record<string, unknown>) {
    await this.createEvent({
      eventType: 'uploaded',
      category: 'file',
      title: `File uploaded: ${fileName}`,
      description: `File type: ${fileType}`,
      metadata,
      projectId,
      userId,
    });
  }

  async logSync(syncType: string, result: { created: number; updated: number; errors: number }, userId: string, projectId?: string) {
    await this.createEvent({
      eventType: 'synced',
      category: 'sync',
      title: `${syncType} sync completed`,
      description: `Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors}`,
      metadata: result,
      projectId,
      userId,
    });
  }

  async logProductionLog(partDesignation: string, processType: string, userId: string, projectId?: string) {
    await this.createEvent({
      eventType: 'created',
      category: 'production',
      title: `Production logged: ${partDesignation}`,
      description: `Process: ${processType}`,
      projectId,
      userId,
    });
  }

  async logQCAction(action: 'approved' | 'rejected', entityType: string, entityId: string, title: string, userId: string, projectId?: string) {
    await this.createEvent({
      eventType: action,
      category: 'qc',
      title,
      entityType,
      entityId,
      projectId,
      userId,
    });
  }
}

export const eventService = new EventService();
