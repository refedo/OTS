/**
 * Version Service
 * 
 * Manages entity version snapshots for point-in-time recovery
 * and temporal data access.
 */

import prisma from '@/lib/db';
import { getCurrentUserId } from './request-context';

// Entities that should have version snapshots
export const VERSIONED_ENTITIES = [
  'Project',
  'Building',
  'QCInspection',
  'WPS',
  'ITP',
] as const;

export type VersionedEntity = typeof VERSIONED_ENTITIES[number];

// Retention policy per entity type
const RETENTION_POLICY: Record<string, number> = {
  Project: -1, // Keep all versions
  Building: 50,
  QCInspection: -1, // Keep all (compliance)
  WPS: -1, // Keep all (compliance)
  ITP: -1, // Keep all (compliance)
  default: 30,
};

export interface CreateVersionParams {
  entityType: string;
  entityId: string;
  snapshot: Record<string, unknown>;
  changeReason?: string;
  userId?: string;
}

class VersionService {
  /**
   * Create a new version snapshot
   */
  async createVersion(params: CreateVersionParams): Promise<{ versionNumber: number }> {
    const { entityType, entityId, snapshot, changeReason, userId } = params;
    
    const createdById = userId || getCurrentUserId();
    if (!createdById) {
      throw new Error('User ID required to create version');
    }

    // Get the next version number
    const lastVersion = await prisma.entityVersion.findFirst({
      where: { entityType, entityId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Create the version
    await prisma.entityVersion.create({
      data: {
        entityType,
        entityId,
        versionNumber,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        changeReason,
        createdById,
      },
    });

    // Apply retention policy
    await this.applyRetention(entityType, entityId);

    return { versionNumber };
  }

  /**
   * Get entity state at a specific point in time
   */
  async getVersionAt(
    entityType: string,
    entityId: string,
    date: Date
  ): Promise<{ version: number; snapshot: unknown; createdAt: Date } | null> {
    const version = await prisma.entityVersion.findFirst({
      where: {
        entityType,
        entityId,
        createdAt: { lte: date },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        versionNumber: true,
        snapshot: true,
        createdAt: true,
      },
    });

    if (!version) return null;

    return {
      version: version.versionNumber,
      snapshot: version.snapshot,
      createdAt: version.createdAt,
    };
  }

  /**
   * Get specific version by number
   */
  async getVersion(
    entityType: string,
    entityId: string,
    versionNumber: number
  ): Promise<{ snapshot: unknown; createdAt: Date; createdBy: { id: string; name: string }; changeReason: string | null } | null> {
    const version = await prisma.entityVersion.findUnique({
      where: {
        entityType_entityId_versionNumber: {
          entityType,
          entityId,
          versionNumber,
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!version) return null;

    return {
      snapshot: version.snapshot,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
      changeReason: version.changeReason,
    };
  }

  /**
   * Get version history for an entity
   */
  async getHistory(
    entityType: string,
    entityId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    versions: Array<{
      versionNumber: number;
      createdAt: Date;
      createdBy: { id: string; name: string };
      changeReason: string | null;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0 } = options || {};

    const [versions, total] = await Promise.all([
      prisma.entityVersion.findMany({
        where: { entityType, entityId },
        orderBy: { versionNumber: 'desc' },
        take: limit,
        skip: offset,
        select: {
          versionNumber: true,
          createdAt: true,
          changeReason: true,
          createdBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.entityVersion.count({ where: { entityType, entityId } }),
    ]);

    return { versions, total };
  }

  /**
   * Get the latest version number for an entity
   */
  async getLatestVersionNumber(entityType: string, entityId: string): Promise<number> {
    const latest = await prisma.entityVersion.findFirst({
      where: { entityType, entityId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    return latest?.versionNumber || 0;
  }

  /**
   * Compare two versions and return differences
   */
  async compareVersions(
    entityType: string,
    entityId: string,
    versionA: number,
    versionB: number
  ): Promise<{
    added: string[];
    removed: string[];
    changed: Record<string, { old: unknown; new: unknown }>;
  } | null> {
    const [a, b] = await Promise.all([
      this.getVersion(entityType, entityId, versionA),
      this.getVersion(entityType, entityId, versionB),
    ]);

    if (!a || !b) return null;

    const snapshotA = a.snapshot as Record<string, unknown>;
    const snapshotB = b.snapshot as Record<string, unknown>;

    const allKeys = new Set([...Object.keys(snapshotA), ...Object.keys(snapshotB)]);
    const added: string[] = [];
    const removed: string[] = [];
    const changed: Record<string, { old: unknown; new: unknown }> = {};

    for (const key of allKeys) {
      const inA = key in snapshotA;
      const inB = key in snapshotB;

      if (!inA && inB) {
        added.push(key);
      } else if (inA && !inB) {
        removed.push(key);
      } else if (JSON.stringify(snapshotA[key]) !== JSON.stringify(snapshotB[key])) {
        changed[key] = { old: snapshotA[key], new: snapshotB[key] };
      }
    }

    return { added, removed, changed };
  }

  /**
   * Apply retention policy - delete old versions beyond the limit
   */
  private async applyRetention(entityType: string, entityId: string): Promise<void> {
    const keepCount = RETENTION_POLICY[entityType] ?? RETENTION_POLICY.default;
    
    // -1 means keep all
    if (keepCount < 0) return;

    const versions = await prisma.entityVersion.findMany({
      where: { entityType, entityId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true },
    });

    if (versions.length <= keepCount) return;

    // Delete versions beyond the retention limit
    const toDelete = versions.slice(keepCount).map(v => v.id);
    
    await prisma.entityVersion.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  /**
   * Check if an entity type should be versioned
   */
  isVersioned(entityType: string): boolean {
    return VERSIONED_ENTITIES.includes(entityType as VersionedEntity);
  }
}

// Export singleton instance
export const versionService = new VersionService();
