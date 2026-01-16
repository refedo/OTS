/**
 * Soft Delete Service
 * 
 * Manages soft deletion and restoration of entities.
 * Replaces hard deletes with recoverable soft deletes.
 */

import prisma from '@/lib/db';
import { getCurrentUserId } from './request-context';
import { auditService } from './audit.service';

// Entities that support soft delete
export const SOFT_DELETE_ENTITIES = [
  'Project',
  'Building',
  'AssemblyPart',
] as const;

export type SoftDeleteEntity = typeof SOFT_DELETE_ENTITIES[number];

export interface SoftDeleteParams {
  entityType: SoftDeleteEntity;
  entityId: string;
  reason: string;
  userId?: string;
}

export interface RestoreParams {
  entityType: SoftDeleteEntity;
  entityId: string;
  userId?: string;
}

class SoftDeleteService {
  /**
   * Soft delete an entity
   */
  async delete(params: SoftDeleteParams): Promise<{ success: boolean; error?: string }> {
    const { entityType, entityId, reason, userId } = params;
    
    const deletedById = userId || getCurrentUserId();
    if (!deletedById) {
      return { success: false, error: 'User ID required for deletion' };
    }

    try {
      const now = new Date();

      switch (entityType) {
        case 'Project':
          await prisma.project.update({
            where: { id: entityId },
            data: {
              deletedAt: now,
              deletedById,
              deleteReason: reason,
            },
          });
          break;

        case 'Building':
          await prisma.building.update({
            where: { id: entityId },
            data: {
              deletedAt: now,
              deletedById,
              deleteReason: reason,
            },
          });
          break;

        case 'AssemblyPart':
          await prisma.assemblyPart.update({
            where: { id: entityId },
            data: {
              deletedAt: now,
              deletedById,
              deleteReason: reason,
            },
          });
          break;

        default:
          return { success: false, error: `Entity type ${entityType} does not support soft delete` };
      }

      // Log the deletion
      await auditService.logDelete(entityType, entityId, reason);

      return { success: true };
    } catch (error) {
      console.error(`[SoftDeleteService] Failed to delete ${entityType}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Restore a soft-deleted entity
   */
  async restore(params: RestoreParams): Promise<{ success: boolean; error?: string }> {
    const { entityType, entityId, userId } = params;
    
    const restoredById = userId || getCurrentUserId();
    if (!restoredById) {
      return { success: false, error: 'User ID required for restoration' };
    }

    try {
      switch (entityType) {
        case 'Project':
          await prisma.project.update({
            where: { id: entityId },
            data: {
              deletedAt: null,
              deletedById: null,
              deleteReason: null,
            },
          });
          break;

        case 'Building':
          await prisma.building.update({
            where: { id: entityId },
            data: {
              deletedAt: null,
              deletedById: null,
              deleteReason: null,
            },
          });
          break;

        case 'AssemblyPart':
          await prisma.assemblyPart.update({
            where: { id: entityId },
            data: {
              deletedAt: null,
              deletedById: null,
              deleteReason: null,
            },
          });
          break;

        default:
          return { success: false, error: `Entity type ${entityType} does not support soft delete` };
      }

      // Log the restoration
      await auditService.logRestore(entityType, entityId);

      return { success: true };
    } catch (error) {
      console.error(`[SoftDeleteService] Failed to restore ${entityType}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Bulk soft delete
   */
  async deleteBulk(
    entityType: SoftDeleteEntity,
    entityIds: string[],
    reason: string,
    userId?: string
  ): Promise<{ success: boolean; deleted: number; errors: string[] }> {
    const deletedById = userId || getCurrentUserId();
    if (!deletedById) {
      return { success: false, deleted: 0, errors: ['User ID required for deletion'] };
    }

    const now = new Date();
    const errors: string[] = [];
    let deleted = 0;

    try {
      switch (entityType) {
        case 'Project':
          const projectResult = await prisma.project.updateMany({
            where: { id: { in: entityIds }, deletedAt: null },
            data: {
              deletedAt: now,
              deletedById,
              deleteReason: reason,
            },
          });
          deleted = projectResult.count;
          break;

        case 'Building':
          const buildingResult = await prisma.building.updateMany({
            where: { id: { in: entityIds }, deletedAt: null },
            data: {
              deletedAt: now,
              deletedById,
              deleteReason: reason,
            },
          });
          deleted = buildingResult.count;
          break;

        case 'AssemblyPart':
          const partResult = await prisma.assemblyPart.updateMany({
            where: { id: { in: entityIds }, deletedAt: null },
            data: {
              deletedAt: now,
              deletedById,
              deleteReason: reason,
            },
          });
          deleted = partResult.count;
          break;
      }

      // Log batch deletion
      await auditService.logBatch({
        entityType,
        action: 'DELETE',
        entityIds,
        summary: `Bulk soft delete: ${reason}`,
      });

      return { success: true, deleted, errors };
    } catch (error) {
      console.error(`[SoftDeleteService] Failed bulk delete:`, error);
      return { 
        success: false, 
        deleted, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }

  /**
   * Get deleted entities (for recovery UI)
   */
  async getDeleted(
    entityType: SoftDeleteEntity,
    options?: {
      deletedAfter?: Date;
      deletedBefore?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    items: Array<{
      id: string;
      name: string;
      deletedAt: Date;
      deletedBy: { id: string; name: string } | null;
      deleteReason: string | null;
    }>;
    total: number;
  }> {
    const { deletedAfter, deletedBefore, limit = 50, offset = 0 } = options || {};

    const where = {
      deletedAt: {
        not: null,
        ...(deletedAfter && { gte: deletedAfter }),
        ...(deletedBefore && { lte: deletedBefore }),
      },
    };

    switch (entityType) {
      case 'Project':
        const [projects, projectTotal] = await Promise.all([
          prisma.project.findMany({
            where: where as any,
            take: limit,
            skip: offset,
            orderBy: { deletedAt: 'desc' },
            select: {
              id: true,
              name: true,
              deletedAt: true,
              deleteReason: true,
              deletedBy: { select: { id: true, name: true } },
            },
          }),
          prisma.project.count({ where: where as any }),
        ]);
        return {
          items: projects.map(p => ({
            id: p.id,
            name: p.name,
            deletedAt: p.deletedAt!,
            deletedBy: p.deletedBy,
            deleteReason: p.deleteReason,
          })),
          total: projectTotal,
        };

      case 'Building':
        const [buildings, buildingTotal] = await Promise.all([
          prisma.building.findMany({
            where: where as any,
            take: limit,
            skip: offset,
            orderBy: { deletedAt: 'desc' },
            select: {
              id: true,
              name: true,
              deletedAt: true,
              deleteReason: true,
              deletedBy: { select: { id: true, name: true } },
            },
          }),
          prisma.building.count({ where: where as any }),
        ]);
        return {
          items: buildings.map(b => ({
            id: b.id,
            name: b.name,
            deletedAt: b.deletedAt!,
            deletedBy: b.deletedBy,
            deleteReason: b.deleteReason,
          })),
          total: buildingTotal,
        };

      case 'AssemblyPart':
        const [parts, partTotal] = await Promise.all([
          prisma.assemblyPart.findMany({
            where: where as any,
            take: limit,
            skip: offset,
            orderBy: { deletedAt: 'desc' },
            select: {
              id: true,
              name: true,
              deletedAt: true,
              deleteReason: true,
              deletedBy: { select: { id: true, name: true } },
            },
          }),
          prisma.assemblyPart.count({ where: where as any }),
        ]);
        return {
          items: parts.map(p => ({
            id: p.id,
            name: p.name,
            deletedAt: p.deletedAt!,
            deletedBy: p.deletedBy,
            deleteReason: p.deleteReason,
          })),
          total: partTotal,
        };

      default:
        return { items: [], total: 0 };
    }
  }

  /**
   * Check if an entity is soft deleted
   */
  async isDeleted(entityType: SoftDeleteEntity, entityId: string): Promise<boolean> {
    switch (entityType) {
      case 'Project':
        const project = await prisma.project.findUnique({
          where: { id: entityId },
          select: { deletedAt: true },
        });
        return project?.deletedAt !== null;

      case 'Building':
        const building = await prisma.building.findUnique({
          where: { id: entityId },
          select: { deletedAt: true },
        });
        return building?.deletedAt !== null;

      case 'AssemblyPart':
        const part = await prisma.assemblyPart.findUnique({
          where: { id: entityId },
          select: { deletedAt: true },
        });
        return part?.deletedAt !== null;

      default:
        return false;
    }
  }

  /**
   * Check if entity type supports soft delete
   */
  supportsSoftDelete(entityType: string): boolean {
    return SOFT_DELETE_ENTITIES.includes(entityType as SoftDeleteEntity);
  }
}

// Export singleton instance
export const softDeleteService = new SoftDeleteService();
