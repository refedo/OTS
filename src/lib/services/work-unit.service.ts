/**
 * WorkUnit Service
 * 
 * Predictive Operations Control System - Phase 1
 * 
 * This service provides CRUD operations for WorkUnits.
 * WorkUnits are an abstraction layer that wraps existing module records
 * (AssemblyPart, DocumentSubmission, RFIRequest, etc.) to enable
 * cross-project dependency tracking and predictive analytics.
 */

import { prisma } from '@/lib/prisma';
import { WorkUnitType, WorkUnitStatus, Prisma } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CreateWorkUnitInput {
  projectId: string;
  type: WorkUnitType;
  referenceModule: string;
  referenceId: string;
  ownerId: string;
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date | null;
  actualEnd?: Date | null;
  quantity?: number | null;
  weight?: number | null;
  status?: WorkUnitStatus;
}

export interface UpdateWorkUnitInput {
  ownerId?: string;
  plannedStart?: Date;
  plannedEnd?: Date;
  actualStart?: Date | null;
  actualEnd?: Date | null;
  quantity?: number | null;
  weight?: number | null;
  status?: WorkUnitStatus;
}

export interface WorkUnitFilters {
  projectId?: string;
  type?: WorkUnitType;
  status?: WorkUnitStatus;
  ownerId?: string;
  referenceModule?: string;
  plannedStartFrom?: Date;
  plannedStartTo?: Date;
  plannedEndFrom?: Date;
  plannedEndTo?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// SERVICE CLASS
// ============================================

export class WorkUnitService {
  /**
   * Create a new WorkUnit
   */
  static async create(input: CreateWorkUnitInput) {
    // Validate that project exists
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true },
    });

    if (!project) {
      throw new Error(`Project with ID ${input.projectId} not found`);
    }

    // Validate that owner exists
    const owner = await prisma.user.findUnique({
      where: { id: input.ownerId },
      select: { id: true },
    });

    if (!owner) {
      throw new Error(`User with ID ${input.ownerId} not found`);
    }

    // Check for duplicate reference
    const existing = await prisma.workUnit.findFirst({
      where: {
        referenceModule: input.referenceModule,
        referenceId: input.referenceId,
      },
    });

    if (existing) {
      throw new Error(
        `WorkUnit already exists for ${input.referenceModule}:${input.referenceId}`
      );
    }

    return prisma.workUnit.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        referenceModule: input.referenceModule,
        referenceId: input.referenceId,
        ownerId: input.ownerId,
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        actualStart: input.actualStart,
        actualEnd: input.actualEnd,
        quantity: input.quantity,
        weight: input.weight,
        status: input.status || WorkUnitStatus.NOT_STARTED,
      },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get a WorkUnit by ID
   */
  static async getById(id: string) {
    const workUnit = await prisma.workUnit.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!workUnit) {
      throw new Error(`WorkUnit with ID ${id} not found`);
    }

    return workUnit;
  }

  /**
   * Get WorkUnit by reference (module + id)
   */
  static async getByReference(referenceModule: string, referenceId: string) {
    return prisma.workUnit.findFirst({
      where: {
        referenceModule,
        referenceId,
      },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * List WorkUnits with filters and pagination
   */
  static async list(
    filters: WorkUnitFilters = {},
    pagination: PaginationOptions = {}
  ) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'plannedStart',
      sortOrder = 'asc',
    } = pagination;

    const where: Prisma.WorkUnitWhereInput = {};

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.referenceModule) {
      where.referenceModule = filters.referenceModule;
    }

    if (filters.plannedStartFrom || filters.plannedStartTo) {
      where.plannedStart = {};
      if (filters.plannedStartFrom) {
        where.plannedStart.gte = filters.plannedStartFrom;
      }
      if (filters.plannedStartTo) {
        where.plannedStart.lte = filters.plannedStartTo;
      }
    }

    if (filters.plannedEndFrom || filters.plannedEndTo) {
      where.plannedEnd = {};
      if (filters.plannedEndFrom) {
        where.plannedEnd.gte = filters.plannedEndFrom;
      }
      if (filters.plannedEndTo) {
        where.plannedEnd.lte = filters.plannedEndTo;
      }
    }

    const [workUnits, total] = await Promise.all([
      prisma.workUnit.findMany({
        where,
        include: {
          project: {
            select: { id: true, projectNumber: true, name: true },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workUnit.count({ where }),
    ]);

    return {
      data: workUnits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a WorkUnit
   */
  static async update(id: string, input: UpdateWorkUnitInput) {
    // Verify WorkUnit exists
    const existing = await prisma.workUnit.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`WorkUnit with ID ${id} not found`);
    }

    // If changing owner, validate new owner exists
    if (input.ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: input.ownerId },
        select: { id: true },
      });

      if (!owner) {
        throw new Error(`User with ID ${input.ownerId} not found`);
      }
    }

    return prisma.workUnit.update({
      where: { id },
      data: input,
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Delete a WorkUnit
   */
  static async delete(id: string) {
    const existing = await prisma.workUnit.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`WorkUnit with ID ${id} not found`);
    }

    await prisma.workUnit.delete({
      where: { id },
    });

    return { success: true, id };
  }

  /**
   * Bulk create WorkUnits
   */
  static async bulkCreate(inputs: CreateWorkUnitInput[]) {
    const results = [];
    const errors = [];

    for (const input of inputs) {
      try {
        const workUnit = await this.create(input);
        results.push(workUnit);
      } catch (error) {
        errors.push({
          input,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { created: results, errors };
  }

  /**
   * Update status of a WorkUnit
   */
  static async updateStatus(id: string, status: WorkUnitStatus) {
    const updateData: Prisma.WorkUnitUpdateInput = { status };

    // Auto-set actualStart when moving to IN_PROGRESS
    if (status === WorkUnitStatus.IN_PROGRESS) {
      const existing = await prisma.workUnit.findUnique({
        where: { id },
        select: { actualStart: true },
      });

      if (existing && !existing.actualStart) {
        updateData.actualStart = new Date();
      }
    }

    // Auto-set actualEnd when moving to COMPLETED
    if (status === WorkUnitStatus.COMPLETED) {
      updateData.actualEnd = new Date();
    }

    return prisma.workUnit.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get WorkUnits by project with summary stats
   */
  static async getProjectSummary(projectId: string) {
    const [workUnits, stats] = await Promise.all([
      prisma.workUnit.findMany({
        where: { projectId },
        include: {
          owner: {
            select: { id: true, name: true },
          },
        },
        orderBy: { plannedStart: 'asc' },
      }),
      prisma.workUnit.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { id: true },
      }),
    ]);

    const statusCounts = stats.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<WorkUnitStatus, number>
    );

    return {
      workUnits,
      summary: {
        total: workUnits.length,
        byStatus: statusCounts,
        notStarted: statusCounts[WorkUnitStatus.NOT_STARTED] || 0,
        inProgress: statusCounts[WorkUnitStatus.IN_PROGRESS] || 0,
        blocked: statusCounts[WorkUnitStatus.BLOCKED] || 0,
        completed: statusCounts[WorkUnitStatus.COMPLETED] || 0,
      },
    };
  }

  /**
   * Get WorkUnits that are at risk (late start or approaching deadline)
   */
  static async getAtRiskWorkUnits(daysThreshold: number = 7) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    // Find WorkUnits that:
    // 1. Are NOT_STARTED but plannedStart has passed
    // 2. Are IN_PROGRESS but plannedEnd is approaching
    const atRisk = await prisma.workUnit.findMany({
      where: {
        OR: [
          // Late start
          {
            status: WorkUnitStatus.NOT_STARTED,
            plannedStart: { lt: now },
          },
          // Approaching deadline
          {
            status: WorkUnitStatus.IN_PROGRESS,
            plannedEnd: { lte: thresholdDate },
          },
          // Blocked items
          {
            status: WorkUnitStatus.BLOCKED,
          },
        ],
      },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { plannedEnd: 'asc' },
    });

    return atRisk.map((wu) => ({
      ...wu,
      riskType: wu.status === WorkUnitStatus.BLOCKED
        ? 'BLOCKED'
        : wu.status === WorkUnitStatus.NOT_STARTED && wu.plannedStart < now
        ? 'LATE_START'
        : 'APPROACHING_DEADLINE',
      daysOverdue:
        wu.status === WorkUnitStatus.NOT_STARTED
          ? Math.floor((now.getTime() - wu.plannedStart.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      daysUntilDeadline:
        wu.status === WorkUnitStatus.IN_PROGRESS
          ? Math.floor((wu.plannedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
    }));
  }
}

export default WorkUnitService;
