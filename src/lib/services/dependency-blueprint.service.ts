/**
 * DependencyBlueprint Service
 * 
 * Automation Layer for Operations Control System
 * 
 * This service provides:
 * - Blueprint management (CRUD)
 * - Automatic dependency creation based on blueprints
 * - Blueprint matching based on project structure type
 * 
 * WORKFLOW:
 * 1. When a WorkUnit is created, this service is called
 * 2. It finds the appropriate blueprint (by structure type or default)
 * 3. It creates dependencies based on blueprint steps
 * 4. Dependencies link the new WorkUnit to existing WorkUnits in the same project
 */

import { prisma } from '@/lib/prisma';
import { WorkUnitType, DependencyType } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CreateBlueprintInput {
  name: string;
  description?: string;
  structureType?: string;
  isDefault?: boolean;
  steps: CreateBlueprintStepInput[];
}

export interface CreateBlueprintStepInput {
  fromType: WorkUnitType;
  toType: WorkUnitType;
  dependencyType?: DependencyType;
  lagDays?: number;
  fromReferenceModule?: string;
  toReferenceModule?: string;
  sequenceOrder?: number;
}

export interface BlueprintApplicationResult {
  blueprintId: string;
  blueprintName: string;
  dependenciesCreated: number;
  dependenciesSkipped: number;
  errors: string[];
}

// ============================================
// SERVICE CLASS
// ============================================

export class DependencyBlueprintService {
  /**
   * Create a new blueprint with steps
   */
  static async create(input: CreateBlueprintInput) {
    // If setting as default, unset other defaults
    if (input.isDefault) {
      await prisma.dependencyBlueprint.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.dependencyBlueprint.create({
      data: {
        name: input.name,
        description: input.description,
        structureType: input.structureType,
        isDefault: input.isDefault ?? false,
        steps: {
          create: input.steps.map((step, index) => ({
            fromType: step.fromType,
            toType: step.toType,
            dependencyType: step.dependencyType ?? DependencyType.FS,
            lagDays: step.lagDays ?? 0,
            fromReferenceModule: step.fromReferenceModule,
            toReferenceModule: step.toReferenceModule,
            sequenceOrder: step.sequenceOrder ?? index,
          })),
        },
      },
      include: { steps: true },
    });
  }

  /**
   * Get blueprint by ID
   */
  static async getById(id: string) {
    const blueprint = await prisma.dependencyBlueprint.findUnique({
      where: { id },
      include: { steps: { orderBy: { sequenceOrder: 'asc' } } },
    });

    if (!blueprint) {
      throw new Error(`Blueprint with ID ${id} not found`);
    }

    return blueprint;
  }

  /**
   * List all blueprints
   */
  static async list(filters: { isActive?: boolean } = {}) {
    const where: Record<string, unknown> = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.dependencyBlueprint.findMany({
      where,
      include: { steps: { orderBy: { sequenceOrder: 'asc' } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Find the best matching blueprint for a project
   * Priority: structureType match > default > null
   */
  static async findBlueprintForProject(projectId: string) {
    // Get project structure type
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { structureType: true },
    });

    if (!project) {
      return null;
    }

    // Try to find blueprint matching structure type
    if (project.structureType) {
      const matchingBlueprint = await prisma.dependencyBlueprint.findFirst({
        where: {
          isActive: true,
          structureType: project.structureType,
        },
        include: { steps: { orderBy: { sequenceOrder: 'asc' } } },
      });

      if (matchingBlueprint) {
        return matchingBlueprint;
      }
    }

    // Fall back to default blueprint
    const defaultBlueprint = await prisma.dependencyBlueprint.findFirst({
      where: {
        isActive: true,
        isDefault: true,
      },
      include: { steps: { orderBy: { sequenceOrder: 'asc' } } },
    });

    return defaultBlueprint;
  }

  /**
   * Apply blueprint to a newly created WorkUnit
   * This creates dependencies based on blueprint steps
   */
  static async applyBlueprintToWorkUnit(
    workUnitId: string,
    projectId: string
  ): Promise<BlueprintApplicationResult | null> {
    const result: BlueprintApplicationResult = {
      blueprintId: '',
      blueprintName: '',
      dependenciesCreated: 0,
      dependenciesSkipped: 0,
      errors: [],
    };

    try {
      // Get the work unit
      const workUnit = await prisma.workUnit.findUnique({
        where: { id: workUnitId },
        select: { id: true, type: true, referenceModule: true, projectId: true },
      });

      if (!workUnit) {
        result.errors.push(`WorkUnit ${workUnitId} not found`);
        return result;
      }

      // Find appropriate blueprint
      const blueprint = await this.findBlueprintForProject(projectId);

      if (!blueprint) {
        console.log(`[DependencyBlueprint] No blueprint found for project ${projectId}`);
        return null;
      }

      result.blueprintId = blueprint.id;
      result.blueprintName = blueprint.name;

      console.log(`[DependencyBlueprint] Applying blueprint "${blueprint.name}" to WorkUnit ${workUnitId}`);

      // Find steps where this WorkUnit type is the "to" (successor)
      // This means we need to find predecessors
      const predecessorSteps = blueprint.steps.filter(
        (step) =>
          step.toType === workUnit.type &&
          (!step.toReferenceModule || step.toReferenceModule === workUnit.referenceModule)
      );

      // Find steps where this WorkUnit type is the "from" (predecessor)
      // This means we need to find successors
      const successorSteps = blueprint.steps.filter(
        (step) =>
          step.fromType === workUnit.type &&
          (!step.fromReferenceModule || step.fromReferenceModule === workUnit.referenceModule)
      );

      // Create dependencies for predecessors (upstream)
      for (const step of predecessorSteps) {
        try {
          // Find existing WorkUnits that match the "from" type in the same project
          const predecessors = await prisma.workUnit.findMany({
            where: {
              projectId,
              type: step.fromType,
              id: { not: workUnitId },
              ...(step.fromReferenceModule && { referenceModule: step.fromReferenceModule }),
            },
            select: { id: true },
            take: 10, // Limit to prevent too many dependencies
          });

          for (const predecessor of predecessors) {
            // Check if dependency already exists
            const existing = await prisma.workUnitDependency.findUnique({
              where: {
                fromWorkUnitId_toWorkUnitId: {
                  fromWorkUnitId: predecessor.id,
                  toWorkUnitId: workUnitId,
                },
              },
            });

            if (existing) {
              result.dependenciesSkipped++;
              continue;
            }

            // Create dependency
            await prisma.workUnitDependency.create({
              data: {
                fromWorkUnitId: predecessor.id,
                toWorkUnitId: workUnitId,
                dependencyType: step.dependencyType,
                lagDays: step.lagDays,
              },
            });

            result.dependenciesCreated++;
            console.log(
              `[DependencyBlueprint] ✓ Created dependency: ${step.fromType} → ${step.toType}`
            );
          }
        } catch (error) {
          result.errors.push(
            `Failed to create predecessor dependency: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Create dependencies for successors (downstream)
      for (const step of successorSteps) {
        try {
          // Find existing WorkUnits that match the "to" type in the same project
          const successors = await prisma.workUnit.findMany({
            where: {
              projectId,
              type: step.toType,
              id: { not: workUnitId },
              ...(step.toReferenceModule && { referenceModule: step.toReferenceModule }),
            },
            select: { id: true },
            take: 10, // Limit to prevent too many dependencies
          });

          for (const successor of successors) {
            // Check if dependency already exists
            const existing = await prisma.workUnitDependency.findUnique({
              where: {
                fromWorkUnitId_toWorkUnitId: {
                  fromWorkUnitId: workUnitId,
                  toWorkUnitId: successor.id,
                },
              },
            });

            if (existing) {
              result.dependenciesSkipped++;
              continue;
            }

            // Create dependency
            await prisma.workUnitDependency.create({
              data: {
                fromWorkUnitId: workUnitId,
                toWorkUnitId: successor.id,
                dependencyType: step.dependencyType,
                lagDays: step.lagDays,
              },
            });

            result.dependenciesCreated++;
            console.log(
              `[DependencyBlueprint] ✓ Created dependency: ${step.fromType} → ${step.toType}`
            );
          }
        } catch (error) {
          result.errors.push(
            `Failed to create successor dependency: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      console.log(
        `[DependencyBlueprint] Blueprint application complete: ${result.dependenciesCreated} created, ${result.dependenciesSkipped} skipped`
      );

      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error('[DependencyBlueprint] Error applying blueprint:', error);
      return result;
    }
  }

  /**
   * Delete a blueprint
   */
  static async delete(id: string) {
    const existing = await prisma.dependencyBlueprint.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Blueprint with ID ${id} not found`);
    }

    await prisma.dependencyBlueprint.delete({
      where: { id },
    });

    return { success: true, id };
  }

  /**
   * Update blueprint active status
   */
  static async setActive(id: string, isActive: boolean) {
    return prisma.dependencyBlueprint.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Set a blueprint as default
   */
  static async setDefault(id: string) {
    // Unset other defaults
    await prisma.dependencyBlueprint.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    return prisma.dependencyBlueprint.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}

export default DependencyBlueprintService;
