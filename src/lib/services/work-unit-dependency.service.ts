/**
 * WorkUnitDependency Service
 * 
 * Predictive Operations Control System - Phase 2
 * 
 * This service provides dependency management for WorkUnits including:
 * - Creating dependencies between WorkUnits
 * - Circular dependency detection
 * - Dependency chain traversal
 * - Impact analysis for delays
 */

import { prisma } from '@/lib/prisma';
import { DependencyType } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CreateDependencyInput {
  fromWorkUnitId: string;
  toWorkUnitId: string;
  dependencyType?: DependencyType;
  lagDays?: number;
}

export interface DependencyChainNode {
  workUnitId: string;
  referenceModule: string;
  referenceId: string;
  type: string;
  status: string;
  plannedStart: Date;
  plannedEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  projectId: string;
  projectNumber: string;
  ownerName: string;
  depth: number;
  dependencyType?: DependencyType;
  lagDays?: number;
}

export interface DependencyChainResult {
  workUnitId: string;
  direction: 'upstream' | 'downstream';
  chain: DependencyChainNode[];
  totalNodes: number;
  maxDepth: number;
}

// ============================================
// SERVICE CLASS
// ============================================

export class WorkUnitDependencyService {
  /**
   * Create a dependency between two WorkUnits
   * Validates that:
   * 1. Both WorkUnits exist
   * 2. They are not the same WorkUnit
   * 3. Creating this dependency won't cause a circular dependency
   */
  static async create(input: CreateDependencyInput) {
    const { fromWorkUnitId, toWorkUnitId, dependencyType = DependencyType.FS, lagDays = 0 } = input;

    // Validate not same WorkUnit
    if (fromWorkUnitId === toWorkUnitId) {
      throw new Error('Cannot create dependency from a WorkUnit to itself');
    }

    // Validate both WorkUnits exist
    const [fromWorkUnit, toWorkUnit] = await Promise.all([
      prisma.workUnit.findUnique({
        where: { id: fromWorkUnitId },
        select: { id: true, referenceModule: true, referenceId: true },
      }),
      prisma.workUnit.findUnique({
        where: { id: toWorkUnitId },
        select: { id: true, referenceModule: true, referenceId: true },
      }),
    ]);

    if (!fromWorkUnit) {
      throw new Error(`WorkUnit with ID ${fromWorkUnitId} not found`);
    }

    if (!toWorkUnit) {
      throw new Error(`WorkUnit with ID ${toWorkUnitId} not found`);
    }

    // Check for existing dependency
    const existing = await prisma.workUnitDependency.findUnique({
      where: {
        fromWorkUnitId_toWorkUnitId: {
          fromWorkUnitId,
          toWorkUnitId,
        },
      },
    });

    if (existing) {
      throw new Error(
        `Dependency already exists from ${fromWorkUnit.referenceModule}:${fromWorkUnit.referenceId} to ${toWorkUnit.referenceModule}:${toWorkUnit.referenceId}`
      );
    }

    // Check for circular dependency
    const wouldCreateCycle = await this.wouldCreateCycle(fromWorkUnitId, toWorkUnitId);
    if (wouldCreateCycle) {
      throw new Error(
        'Cannot create dependency: would create a circular dependency chain'
      );
    }

    // Create the dependency
    return prisma.workUnitDependency.create({
      data: {
        fromWorkUnitId,
        toWorkUnitId,
        dependencyType,
        lagDays,
      },
      include: {
        fromWorkUnit: {
          select: {
            id: true,
            referenceModule: true,
            referenceId: true,
            type: true,
            status: true,
            plannedStart: true,
            plannedEnd: true,
          },
        },
        toWorkUnit: {
          select: {
            id: true,
            referenceModule: true,
            referenceId: true,
            type: true,
            status: true,
            plannedStart: true,
            plannedEnd: true,
          },
        },
      },
    });
  }

  /**
   * Check if creating a dependency from A to B would create a cycle
   * Uses BFS to traverse from B's successors to see if we can reach A
   */
  static async wouldCreateCycle(
    fromWorkUnitId: string,
    toWorkUnitId: string
  ): Promise<boolean> {
    // If we can reach fromWorkUnitId by following dependencies from toWorkUnitId,
    // then adding fromWorkUnitId -> toWorkUnitId would create a cycle
    const visited = new Set<string>();
    const queue: string[] = [toWorkUnitId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === fromWorkUnitId) {
        return true; // Found a path back to the source - would create cycle
      }

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      // Get all successors (WorkUnits that depend on current)
      const successors = await prisma.workUnitDependency.findMany({
        where: { fromWorkUnitId: currentId },
        select: { toWorkUnitId: true },
      });

      for (const successor of successors) {
        if (!visited.has(successor.toWorkUnitId)) {
          queue.push(successor.toWorkUnitId);
        }
      }
    }

    return false;
  }

  /**
   * Get a dependency by ID
   */
  static async getById(id: string) {
    const dependency = await prisma.workUnitDependency.findUnique({
      where: { id },
      include: {
        fromWorkUnit: {
          select: {
            id: true,
            referenceModule: true,
            referenceId: true,
            type: true,
            status: true,
            plannedStart: true,
            plannedEnd: true,
            project: { select: { projectNumber: true } },
            owner: { select: { name: true } },
          },
        },
        toWorkUnit: {
          select: {
            id: true,
            referenceModule: true,
            referenceId: true,
            type: true,
            status: true,
            plannedStart: true,
            plannedEnd: true,
            project: { select: { projectNumber: true } },
            owner: { select: { name: true } },
          },
        },
      },
    });

    if (!dependency) {
      throw new Error(`Dependency with ID ${id} not found`);
    }

    return dependency;
  }

  /**
   * Delete a dependency
   */
  static async delete(id: string) {
    const existing = await prisma.workUnitDependency.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Dependency with ID ${id} not found`);
    }

    await prisma.workUnitDependency.delete({
      where: { id },
    });

    return { success: true, id };
  }

  /**
   * Get all dependencies for a WorkUnit (both upstream and downstream)
   */
  static async getDependenciesForWorkUnit(workUnitId: string) {
    const [upstream, downstream] = await Promise.all([
      // Upstream: WorkUnits that this one depends on (predecessors)
      prisma.workUnitDependency.findMany({
        where: { toWorkUnitId: workUnitId },
        include: {
          fromWorkUnit: {
            select: {
              id: true,
              referenceModule: true,
              referenceId: true,
              type: true,
              status: true,
              plannedStart: true,
              plannedEnd: true,
              actualEnd: true,
              project: { select: { projectNumber: true } },
              owner: { select: { name: true } },
            },
          },
        },
      }),
      // Downstream: WorkUnits that depend on this one (successors)
      prisma.workUnitDependency.findMany({
        where: { fromWorkUnitId: workUnitId },
        include: {
          toWorkUnit: {
            select: {
              id: true,
              referenceModule: true,
              referenceId: true,
              type: true,
              status: true,
              plannedStart: true,
              plannedEnd: true,
              project: { select: { projectNumber: true } },
              owner: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      workUnitId,
      upstream: upstream.map((d) => ({
        dependencyId: d.id,
        dependencyType: d.dependencyType,
        lagDays: d.lagDays,
        workUnit: d.fromWorkUnit,
      })),
      downstream: downstream.map((d) => ({
        dependencyId: d.id,
        dependencyType: d.dependencyType,
        lagDays: d.lagDays,
        workUnit: d.toWorkUnit,
      })),
      upstreamCount: upstream.length,
      downstreamCount: downstream.length,
    };
  }

  /**
   * Get the full dependency chain for a WorkUnit
   * Can traverse upstream (predecessors) or downstream (successors)
   */
  static async getDependencyChain(
    workUnitId: string,
    direction: 'upstream' | 'downstream',
    maxDepth: number = 10
  ): Promise<DependencyChainResult> {
    const chain: DependencyChainNode[] = [];
    const visited = new Set<string>();

    await this.traverseChain(workUnitId, direction, 0, maxDepth, visited, chain);

    return {
      workUnitId,
      direction,
      chain,
      totalNodes: chain.length,
      maxDepth: chain.length > 0 ? Math.max(...chain.map((n) => n.depth)) : 0,
    };
  }

  /**
   * Recursive helper to traverse dependency chain
   */
  private static async traverseChain(
    currentId: string,
    direction: 'upstream' | 'downstream',
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>,
    chain: DependencyChainNode[]
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(currentId)) {
      return;
    }

    visited.add(currentId);

    // Get dependencies based on direction
    const dependencies = await prisma.workUnitDependency.findMany({
      where:
        direction === 'upstream'
          ? { toWorkUnitId: currentId }
          : { fromWorkUnitId: currentId },
      include: {
        fromWorkUnit:
          direction === 'upstream'
            ? {
                select: {
                  id: true,
                  referenceModule: true,
                  referenceId: true,
                  type: true,
                  status: true,
                  plannedStart: true,
                  plannedEnd: true,
                  actualStart: true,
                  actualEnd: true,
                  projectId: true,
                  project: { select: { projectNumber: true } },
                  owner: { select: { name: true } },
                },
              }
            : undefined,
        toWorkUnit:
          direction === 'downstream'
            ? {
                select: {
                  id: true,
                  referenceModule: true,
                  referenceId: true,
                  type: true,
                  status: true,
                  plannedStart: true,
                  plannedEnd: true,
                  actualStart: true,
                  actualEnd: true,
                  projectId: true,
                  project: { select: { projectNumber: true } },
                  owner: { select: { name: true } },
                },
              }
            : undefined,
      },
    });

    for (const dep of dependencies) {
      const workUnit = direction === 'upstream' ? dep.fromWorkUnit : dep.toWorkUnit;
      if (!workUnit || visited.has(workUnit.id)) continue;

      chain.push({
        workUnitId: workUnit.id,
        referenceModule: workUnit.referenceModule,
        referenceId: workUnit.referenceId,
        type: workUnit.type,
        status: workUnit.status,
        plannedStart: workUnit.plannedStart,
        plannedEnd: workUnit.plannedEnd,
        actualStart: workUnit.actualStart,
        actualEnd: workUnit.actualEnd,
        projectId: workUnit.projectId,
        projectNumber: workUnit.project.projectNumber,
        ownerName: workUnit.owner.name,
        depth: currentDepth + 1,
        dependencyType: dep.dependencyType,
        lagDays: dep.lagDays,
      });

      // Recurse
      await this.traverseChain(
        workUnit.id,
        direction,
        currentDepth + 1,
        maxDepth,
        visited,
        chain
      );
    }
  }

  /**
   * Get all WorkUnits that would be impacted if a given WorkUnit is delayed
   * Returns downstream chain with calculated impact
   */
  static async getDelayImpact(workUnitId: string, delayDays: number) {
    const workUnit = await prisma.workUnit.findUnique({
      where: { id: workUnitId },
      select: {
        id: true,
        referenceModule: true,
        referenceId: true,
        plannedEnd: true,
        status: true,
      },
    });

    if (!workUnit) {
      throw new Error(`WorkUnit with ID ${workUnitId} not found`);
    }

    const downstreamChain = await this.getDependencyChain(workUnitId, 'downstream');

    // Calculate cascading impact
    const impactedWorkUnits = downstreamChain.chain.map((node) => {
      // For FS dependencies, delay cascades fully
      // For SS/FF, impact may be different (simplified here)
      const cascadedDelay =
        node.dependencyType === 'FS'
          ? delayDays + (node.lagDays || 0)
          : delayDays;

      return {
        ...node,
        originalPlannedStart: node.plannedStart,
        originalPlannedEnd: node.plannedEnd,
        projectedPlannedStart: new Date(
          node.plannedStart.getTime() + cascadedDelay * 24 * 60 * 60 * 1000
        ),
        projectedPlannedEnd: new Date(
          node.plannedEnd.getTime() + cascadedDelay * 24 * 60 * 60 * 1000
        ),
        cascadedDelayDays: cascadedDelay,
      };
    });

    return {
      sourceWorkUnit: workUnit,
      delayDays,
      impactedCount: impactedWorkUnits.length,
      impactedWorkUnits,
    };
  }

  /**
   * List all dependencies with optional filters
   */
  static async list(filters: {
    projectId?: string;
    fromWorkUnitId?: string;
    toWorkUnitId?: string;
    dependencyType?: DependencyType;
  } = {}) {
    const where: Record<string, unknown> = {};

    if (filters.fromWorkUnitId) {
      where.fromWorkUnitId = filters.fromWorkUnitId;
    }

    if (filters.toWorkUnitId) {
      where.toWorkUnitId = filters.toWorkUnitId;
    }

    if (filters.dependencyType) {
      where.dependencyType = filters.dependencyType;
    }

    if (filters.projectId) {
      where.OR = [
        { fromWorkUnit: { projectId: filters.projectId } },
        { toWorkUnit: { projectId: filters.projectId } },
      ];
    }

    return prisma.workUnitDependency.findMany({
      where,
      include: {
        fromWorkUnit: {
          select: {
            id: true,
            referenceModule: true,
            referenceId: true,
            type: true,
            status: true,
            project: { select: { projectNumber: true } },
          },
        },
        toWorkUnit: {
          select: {
            id: true,
            referenceModule: true,
            referenceId: true,
            type: true,
            status: true,
            project: { select: { projectNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Bulk create dependencies
   */
  static async bulkCreate(inputs: CreateDependencyInput[]) {
    const results = [];
    const errors = [];

    for (const input of inputs) {
      try {
        const dependency = await this.create(input);
        results.push(dependency);
      } catch (error) {
        errors.push({
          input,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { created: results, errors };
  }
}

export default WorkUnitDependencyService;
