/**
 * ResourceCapacity Service
 * 
 * Predictive Operations Control System - Phase 3
 * 
 * This service provides capacity management including:
 * - CRUD operations for ResourceCapacity
 * - Load calculation from WorkUnits
 * - Capacity vs Load comparison per time window
 * - Overload detection and reporting
 */

import { prisma } from '@/lib/prisma';
import { ResourceType, CapacityUnit, WorkUnitType, WorkUnitStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CreateResourceCapacityInput {
  resourceType: ResourceType;
  resourceId?: string;
  resourceName: string;
  capacityPerDay: number;
  unit: CapacityUnit;
  workingDaysPerWeek?: number;
  notes?: string;
}

export interface UpdateResourceCapacityInput {
  resourceName?: string;
  capacityPerDay?: number;
  unit?: CapacityUnit;
  workingDaysPerWeek?: number;
  isActive?: boolean;
  notes?: string;
}

export interface WeeklyLoadEntry {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  year: number;
  plannedLoad: number;
  capacity: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  overloadAmount: number;
  workUnitCount: number;
}

export interface ResourceLoadAnalysis {
  resourceCapacity: {
    id: string;
    resourceType: ResourceType;
    resourceName: string;
    capacityPerDay: number;
    unit: CapacityUnit;
    workingDaysPerWeek: number;
  };
  analysisWindow: {
    startDate: Date;
    endDate: Date;
    totalWeeks: number;
  };
  weeklyBreakdown: WeeklyLoadEntry[];
  summary: {
    totalPlannedLoad: number;
    totalCapacity: number;
    averageUtilization: number;
    overloadedWeeks: number;
    peakUtilization: number;
    peakWeek: number | null;
  };
}

export interface OverloadResult {
  resourceId: string;
  resourceType: ResourceType;
  resourceName: string;
  unit: CapacityUnit;
  overloadedWeeks: {
    weekStart: Date;
    weekEnd: Date;
    weekNumber: number;
    year: number;
    plannedLoad: number;
    capacity: number;
    overloadAmount: number;
    utilizationPercent: number;
    affectedWorkUnits: {
      id: string;
      referenceModule: string;
      referenceId: string;
      projectNumber: string;
      plannedStart: Date;
      plannedEnd: Date;
    }[];
  }[];
}

// ============================================
// MAPPING: WorkUnitType -> ResourceType
// ============================================

const WORK_UNIT_TO_RESOURCE_MAP: Record<WorkUnitType, ResourceType> = {
  DESIGN: ResourceType.DESIGNER,
  PROCUREMENT: ResourceType.PROCUREMENT,
  PRODUCTION: ResourceType.WELDER, // Default production to welder, can be refined
  QC: ResourceType.QC,
  DOCUMENTATION: ResourceType.DESIGNER, // Documentation often done by design team
};

// ============================================
// SERVICE CLASS
// ============================================

export class ResourceCapacityService {
  /**
   * Create a new ResourceCapacity
   */
  static async create(input: CreateResourceCapacityInput) {
    return prisma.resourceCapacity.create({
      data: {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        resourceName: input.resourceName,
        capacityPerDay: input.capacityPerDay,
        unit: input.unit,
        workingDaysPerWeek: input.workingDaysPerWeek ?? 5,
        notes: input.notes,
      },
    });
  }

  /**
   * Get ResourceCapacity by ID
   */
  static async getById(id: string) {
    const capacity = await prisma.resourceCapacity.findUnique({
      where: { id },
    });

    if (!capacity) {
      throw new Error(`ResourceCapacity with ID ${id} not found`);
    }

    return capacity;
  }

  /**
   * Update ResourceCapacity
   */
  static async update(id: string, input: UpdateResourceCapacityInput) {
    const existing = await prisma.resourceCapacity.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`ResourceCapacity with ID ${id} not found`);
    }

    return prisma.resourceCapacity.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Delete ResourceCapacity
   */
  static async delete(id: string) {
    const existing = await prisma.resourceCapacity.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`ResourceCapacity with ID ${id} not found`);
    }

    await prisma.resourceCapacity.delete({
      where: { id },
    });

    return { success: true, id };
  }

  /**
   * List all ResourceCapacities with optional filters
   */
  static async list(filters: {
    resourceType?: ResourceType;
    isActive?: boolean;
  } = {}) {
    const where: Record<string, unknown> = {};

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.resourceCapacity.findMany({
      where,
      orderBy: [{ resourceType: 'asc' }, { resourceName: 'asc' }],
    });
  }

  /**
   * Get the start of the week (Monday) for a given date
   */
  private static getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get the end of the week (Sunday) for a given date
   */
  private static getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  /**
   * Get ISO week number
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Calculate working days between two dates
   */
  private static getWorkingDays(startDate: Date, endDate: Date, workingDaysPerWeek: number = 5): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Count days based on working days per week
      // Assuming Mon-Fri for 5 days, Mon-Sat for 6 days
      if (workingDaysPerWeek === 7 || 
          (workingDaysPerWeek === 6 && dayOfWeek !== 0) ||
          (workingDaysPerWeek === 5 && dayOfWeek !== 0 && dayOfWeek !== 6)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Calculate planned load from WorkUnits for a specific resource type
   * within a time window
   */
  static async calculatePlannedLoad(
    resourceType: ResourceType,
    startDate: Date,
    endDate: Date,
    unit: CapacityUnit
  ): Promise<{ totalLoad: number; workUnits: unknown[] }> {
    // Map resource type back to work unit types
    const workUnitTypes: WorkUnitType[] = [];
    for (const [wuType, resType] of Object.entries(WORK_UNIT_TO_RESOURCE_MAP)) {
      if (resType === resourceType) {
        workUnitTypes.push(wuType as WorkUnitType);
      }
    }

    // Get WorkUnits that overlap with the time window
    const workUnits = await prisma.workUnit.findMany({
      where: {
        type: { in: workUnitTypes },
        status: { in: [WorkUnitStatus.NOT_STARTED, WorkUnitStatus.IN_PROGRESS] },
        OR: [
          // WorkUnit starts within window
          { plannedStart: { gte: startDate, lte: endDate } },
          // WorkUnit ends within window
          { plannedEnd: { gte: startDate, lte: endDate } },
          // WorkUnit spans the entire window
          { AND: [{ plannedStart: { lte: startDate } }, { plannedEnd: { gte: endDate } }] },
        ],
      },
      include: {
        project: { select: { projectNumber: true } },
      },
    });

    // Calculate load based on unit type
    let totalLoad = 0;

    for (const wu of workUnits) {
      // Calculate overlap with the time window
      const overlapStart = new Date(Math.max(wu.plannedStart.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(wu.plannedEnd.getTime(), endDate.getTime()));
      const overlapDays = this.getWorkingDays(overlapStart, overlapEnd);
      const totalDays = this.getWorkingDays(wu.plannedStart, wu.plannedEnd);

      if (totalDays === 0) continue;

      const overlapRatio = overlapDays / totalDays;

      switch (unit) {
        case CapacityUnit.TONS:
          // Use weight field
          if (wu.weight) {
            totalLoad += wu.weight * overlapRatio;
          }
          break;
        case CapacityUnit.DRAWINGS:
          // Use quantity field (assuming it represents drawings for design work)
          if (wu.quantity) {
            totalLoad += wu.quantity * overlapRatio;
          }
          break;
        case CapacityUnit.HOURS:
        default:
          // Estimate hours based on duration (8 hours per working day)
          totalLoad += overlapDays * 8;
          break;
      }
    }

    return {
      totalLoad,
      workUnits: workUnits.map((wu) => ({
        id: wu.id,
        referenceModule: wu.referenceModule,
        referenceId: wu.referenceId,
        projectNumber: wu.project.projectNumber,
        type: wu.type,
        plannedStart: wu.plannedStart,
        plannedEnd: wu.plannedEnd,
        quantity: wu.quantity,
        weight: wu.weight,
      })),
    };
  }

  /**
   * Analyze capacity vs load for a resource over a time window (weekly breakdown)
   */
  static async analyzeCapacityVsLoad(
    resourceCapacityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ResourceLoadAnalysis> {
    const capacity = await this.getById(resourceCapacityId);

    const weeklyBreakdown: WeeklyLoadEntry[] = [];
    let currentWeekStart = this.getWeekStart(startDate);
    let totalPlannedLoad = 0;
    let totalCapacity = 0;
    let overloadedWeeks = 0;
    let peakUtilization = 0;
    let peakWeek: number | null = null;

    while (currentWeekStart <= endDate) {
      const weekEnd = this.getWeekEnd(currentWeekStart);
      const effectiveWeekEnd = weekEnd > endDate ? endDate : weekEnd;

      // Calculate working days in this week
      const workingDaysInWeek = this.getWorkingDays(
        currentWeekStart < startDate ? startDate : currentWeekStart,
        effectiveWeekEnd,
        capacity.workingDaysPerWeek
      );

      // Weekly capacity
      const weeklyCapacity = capacity.capacityPerDay * workingDaysInWeek;

      // Calculate load for this week
      const { totalLoad } = await this.calculatePlannedLoad(
        capacity.resourceType,
        currentWeekStart < startDate ? startDate : currentWeekStart,
        effectiveWeekEnd,
        capacity.unit
      );

      const utilizationPercent = weeklyCapacity > 0 ? (totalLoad / weeklyCapacity) * 100 : 0;
      const isOverloaded = totalLoad > weeklyCapacity;
      const overloadAmount = isOverloaded ? totalLoad - weeklyCapacity : 0;

      const weekNumber = this.getWeekNumber(currentWeekStart);
      const year = currentWeekStart.getFullYear();

      weeklyBreakdown.push({
        weekStart: new Date(currentWeekStart),
        weekEnd: new Date(effectiveWeekEnd),
        weekNumber,
        year,
        plannedLoad: Math.round(totalLoad * 100) / 100,
        capacity: Math.round(weeklyCapacity * 100) / 100,
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        isOverloaded,
        overloadAmount: Math.round(overloadAmount * 100) / 100,
        workUnitCount: 0, // Will be populated if needed
      });

      totalPlannedLoad += totalLoad;
      totalCapacity += weeklyCapacity;

      if (isOverloaded) {
        overloadedWeeks++;
      }

      if (utilizationPercent > peakUtilization) {
        peakUtilization = utilizationPercent;
        peakWeek = weekNumber;
      }

      // Move to next week
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return {
      resourceCapacity: {
        id: capacity.id,
        resourceType: capacity.resourceType,
        resourceName: capacity.resourceName,
        capacityPerDay: capacity.capacityPerDay,
        unit: capacity.unit,
        workingDaysPerWeek: capacity.workingDaysPerWeek,
      },
      analysisWindow: {
        startDate,
        endDate,
        totalWeeks: weeklyBreakdown.length,
      },
      weeklyBreakdown,
      summary: {
        totalPlannedLoad: Math.round(totalPlannedLoad * 100) / 100,
        totalCapacity: Math.round(totalCapacity * 100) / 100,
        averageUtilization:
          totalCapacity > 0
            ? Math.round((totalPlannedLoad / totalCapacity) * 10000) / 100
            : 0,
        overloadedWeeks,
        peakUtilization: Math.round(peakUtilization * 100) / 100,
        peakWeek,
      },
    };
  }

  /**
   * Get all overloaded resources for a time window
   */
  static async getOverloadedResources(
    startDate: Date,
    endDate: Date,
    threshold: number = 100 // Utilization percentage threshold
  ): Promise<OverloadResult[]> {
    const activeResources = await this.list({ isActive: true });
    const results: OverloadResult[] = [];

    for (const resource of activeResources) {
      const analysis = await this.analyzeCapacityVsLoad(resource.id, startDate, endDate);

      const overloadedWeeks = analysis.weeklyBreakdown.filter(
        (week) => week.utilizationPercent >= threshold
      );

      if (overloadedWeeks.length > 0) {
        // Get affected work units for each overloaded week
        const overloadedWeeksWithWorkUnits = await Promise.all(
          overloadedWeeks.map(async (week) => {
            const { workUnits } = await this.calculatePlannedLoad(
              resource.resourceType,
              week.weekStart,
              week.weekEnd,
              resource.unit
            );

            return {
              weekStart: week.weekStart,
              weekEnd: week.weekEnd,
              weekNumber: week.weekNumber,
              year: week.year,
              plannedLoad: week.plannedLoad,
              capacity: week.capacity,
              overloadAmount: week.overloadAmount,
              utilizationPercent: week.utilizationPercent,
              affectedWorkUnits: workUnits as {
                id: string;
                referenceModule: string;
                referenceId: string;
                projectNumber: string;
                plannedStart: Date;
                plannedEnd: Date;
              }[],
            };
          })
        );

        results.push({
          resourceId: resource.id,
          resourceType: resource.resourceType,
          resourceName: resource.resourceName,
          unit: resource.unit,
          overloadedWeeks: overloadedWeeksWithWorkUnits,
        });
      }
    }

    return results;
  }

  /**
   * Get capacity summary across all resource types
   */
  static async getCapacitySummary(startDate: Date, endDate: Date) {
    const activeResources = await this.list({ isActive: true });

    const summaryByType: Record<
      string,
      {
        resourceType: ResourceType;
        totalCapacity: number;
        totalLoad: number;
        utilizationPercent: number;
        resourceCount: number;
        overloadedCount: number;
      }
    > = {};

    for (const resource of activeResources) {
      const analysis = await this.analyzeCapacityVsLoad(resource.id, startDate, endDate);

      if (!summaryByType[resource.resourceType]) {
        summaryByType[resource.resourceType] = {
          resourceType: resource.resourceType,
          totalCapacity: 0,
          totalLoad: 0,
          utilizationPercent: 0,
          resourceCount: 0,
          overloadedCount: 0,
        };
      }

      summaryByType[resource.resourceType].totalCapacity += analysis.summary.totalCapacity;
      summaryByType[resource.resourceType].totalLoad += analysis.summary.totalPlannedLoad;
      summaryByType[resource.resourceType].resourceCount++;

      if (analysis.summary.overloadedWeeks > 0) {
        summaryByType[resource.resourceType].overloadedCount++;
      }
    }

    // Calculate utilization percentages
    for (const type of Object.keys(summaryByType)) {
      const entry = summaryByType[type];
      entry.utilizationPercent =
        entry.totalCapacity > 0
          ? Math.round((entry.totalLoad / entry.totalCapacity) * 10000) / 100
          : 0;
    }

    return {
      analysisWindow: { startDate, endDate },
      byResourceType: Object.values(summaryByType),
      totalResources: activeResources.length,
    };
  }
}

export default ResourceCapacityService;
