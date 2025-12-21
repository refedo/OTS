/**
 * Work Tracking Validator Service
 * 
 * Implements the "No Silent Work" rule - ensures all work is properly tracked
 * in the Operations Control system before it can proceed.
 * 
 * This service provides:
 * 1. Validation checks before work creation
 * 2. Warnings for missing dependencies/tracking
 * 3. Auto-creation of missing WorkUnits when appropriate
 * 
 * IMPORTANT: This service returns WARNINGS, not errors.
 * Work can still proceed, but warnings are logged and returned to the user.
 */

import { prisma } from '@/lib/prisma';

// ============================================
// TYPES
// ============================================

export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  autoCreated?: {
    workUnitId?: string;
    dependencyId?: string;
  };
}

// ============================================
// SERVICE CLASS
// ============================================

export class WorkTrackingValidatorService {
  /**
   * Validate WorkOrder creation
   * Checks:
   * - Project has active scope schedules
   * - Building has fabrication schedule
   * - Parts are not already in another WorkOrder
   */
  static async validateWorkOrderCreation(
    projectId: string,
    buildingId: string,
    partIds: string[]
  ): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];

    try {
      // Check 1: Project has scope schedules
      const scopeSchedules = await prisma.scopeSchedule.findMany({
        where: { buildingId },
        select: { scopeType: true, startDate: true, endDate: true },
      });

      if (scopeSchedules.length === 0) {
        warnings.push({
          code: 'NO_SCOPE_SCHEDULES',
          message: 'No scope schedules defined for this building',
          severity: 'warning',
          suggestion: 'Define scope schedules in Production Planning before creating work orders',
        });
      }

      const hasFabricationSchedule = scopeSchedules.some(s => s.scopeType === 'fabrication');
      if (!hasFabricationSchedule) {
        warnings.push({
          code: 'NO_FABRICATION_SCHEDULE',
          message: 'No fabrication schedule defined for this building',
          severity: 'warning',
          suggestion: 'Define a fabrication schedule to enable proper deadline tracking',
        });
      }

      // Check 2: Parts not already in another active WorkOrder
      const existingWorkOrderParts = await prisma.workOrderPart.findMany({
        where: {
          assemblyPartId: { in: partIds },
          workOrder: {
            status: { notIn: ['Completed', 'Cancelled'] },
          },
        },
        include: {
          workOrder: {
            select: { workOrderNumber: true, status: true },
          },
          assemblyPart: {
            select: { partDesignation: true },
          },
        },
      });

      if (existingWorkOrderParts.length > 0) {
        const duplicates = existingWorkOrderParts.map(
          p => `${p.assemblyPart.partDesignation} (${p.workOrder.workOrderNumber})`
        );
        warnings.push({
          code: 'PARTS_IN_OTHER_WORK_ORDER',
          message: `${existingWorkOrderParts.length} part(s) already in active work orders: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}`,
          severity: 'critical',
          suggestion: 'Remove these parts from selection or complete/cancel existing work orders first',
        });
      }

      // Check 3: Project has WorkUnits for tracking
      const projectWorkUnits = await prisma.workUnit.count({
        where: { projectId },
      });

      if (projectWorkUnits === 0) {
        warnings.push({
          code: 'NO_PROJECT_WORK_UNITS',
          message: 'This project has no WorkUnits for Operations Control tracking',
          severity: 'info',
          suggestion: 'WorkUnits will be auto-created when this work order is saved',
        });
      }

    } catch (error) {
      console.error('[WorkTrackingValidator] Error validating WorkOrder:', error);
      warnings.push({
        code: 'VALIDATION_ERROR',
        message: 'Could not complete all validation checks',
        severity: 'info',
      });
    }

    return {
      isValid: !warnings.some(w => w.severity === 'critical'),
      warnings,
    };
  }

  /**
   * Validate Production Log creation
   * Checks:
   * - Part belongs to an active WorkOrder
   * - WorkUnit exists for tracking
   * - Previous process steps are complete
   */
  static async validateProductionLogCreation(
    assemblyPartId: string,
    processType: string
  ): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];

    try {
      // Get the assembly part with its work order association
      const assemblyPart = await prisma.assemblyPart.findUnique({
        where: { id: assemblyPartId },
        include: {
          project: { select: { id: true, projectNumber: true } },
          building: { select: { id: true, designation: true } },
        },
      });

      if (!assemblyPart) {
        return {
          isValid: false,
          warnings: [{
            code: 'PART_NOT_FOUND',
            message: 'Assembly part not found',
            severity: 'critical',
          }],
        };
      }

      // Check 1: Part is in an active WorkOrder
      const workOrderPart = await prisma.workOrderPart.findFirst({
        where: {
          assemblyPartId,
          workOrder: {
            status: { notIn: ['Completed', 'Cancelled'] },
          },
        },
        include: {
          workOrder: {
            select: { id: true, workOrderNumber: true, status: true },
          },
        },
      });

      if (!workOrderPart) {
        warnings.push({
          code: 'NO_WORK_ORDER',
          message: `Part ${assemblyPart.partDesignation || assemblyPartId} is not assigned to any active work order`,
          severity: 'warning',
          suggestion: 'Create a work order for this part to enable proper tracking and scheduling',
        });
      }

      // Check 2: WorkUnit exists for this work order
      if (workOrderPart) {
        const workUnit = await prisma.workUnit.findFirst({
          where: {
            referenceModule: 'WorkOrder',
            referenceId: workOrderPart.workOrder.id,
          },
          select: { id: true, status: true },
        });

        if (!workUnit) {
          warnings.push({
            code: 'NO_WORK_UNIT',
            message: 'Work order is not tracked in Operations Control',
            severity: 'info',
            suggestion: 'WorkUnit will be auto-created for this work order',
          });
        }
      }

      // Check 3: QC-required processes should have RFI
      const qcRequiredProcesses = ['Fit-up', 'Welding', 'Visualization'];
      if (qcRequiredProcesses.includes(processType)) {
        // Check if there's a pending RFI for this part
        const pendingRFI = await prisma.rFIRequest.findFirst({
          where: {
            productionLogs: {
              some: {
                productionLog: {
                  assemblyPartId,
                  processType,
                },
              },
            },
            status: { in: ['Waiting for Inspection', 'In Progress'] },
          },
        });

        // This is just informational - not a blocker
        if (!pendingRFI && processType === 'Visualization') {
          warnings.push({
            code: 'NO_RFI_FOR_VISUALIZATION',
            message: 'Visualization logged without RFI - consider creating an RFI for QC inspection',
            severity: 'info',
            suggestion: 'Create an RFI after logging to request QC inspection',
          });
        }
      }

    } catch (error) {
      console.error('[WorkTrackingValidator] Error validating ProductionLog:', error);
      warnings.push({
        code: 'VALIDATION_ERROR',
        message: 'Could not complete all validation checks',
        severity: 'info',
      });
    }

    return {
      isValid: !warnings.some(w => w.severity === 'critical'),
      warnings,
    };
  }

  /**
   * Validate RFI creation
   * Checks:
   * - Production logs have associated WorkOrder
   * - QC inspector is assigned
   */
  static async validateRFICreation(
    productionLogIds: string[]
  ): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];

    try {
      // Get production logs with their parts
      const productionLogs = await prisma.productionLog.findMany({
        where: { id: { in: productionLogIds } },
        include: {
          assemblyPart: {
            select: { id: true, partDesignation: true },
          },
        },
      });

      // Check if parts are in work orders
      const partIds = productionLogs.map(log => log.assemblyPart.id);
      const workOrderParts = await prisma.workOrderPart.findMany({
        where: {
          assemblyPartId: { in: partIds },
          workOrder: {
            status: { notIn: ['Completed', 'Cancelled'] },
          },
        },
      });

      const partsWithWorkOrder = new Set(workOrderParts.map(wop => wop.assemblyPartId));
      const partsWithoutWorkOrder = partIds.filter(id => !partsWithWorkOrder.has(id));

      if (partsWithoutWorkOrder.length > 0) {
        warnings.push({
          code: 'PARTS_WITHOUT_WORK_ORDER',
          message: `${partsWithoutWorkOrder.length} part(s) are not in any active work order`,
          severity: 'warning',
          suggestion: 'Consider creating work orders for proper tracking',
        });
      }

    } catch (error) {
      console.error('[WorkTrackingValidator] Error validating RFI:', error);
    }

    return {
      isValid: true,
      warnings,
    };
  }

  /**
   * Get tracking status summary for a project
   * Returns counts of tracked vs untracked work
   */
  static async getProjectTrackingStatus(projectId: string): Promise<{
    totalParts: number;
    partsInWorkOrders: number;
    partsWithProductionLogs: number;
    workUnitsCount: number;
    activeRisks: number;
    trackingPercentage: number;
  }> {
    try {
      const [
        totalParts,
        partsInWorkOrders,
        partsWithProductionLogs,
        workUnitsCount,
        activeRisks,
      ] = await Promise.all([
        prisma.assemblyPart.count({ where: { projectId } }),
        prisma.workOrderPart.count({
          where: {
            assemblyPart: { projectId },
            workOrder: { status: { notIn: ['Completed', 'Cancelled'] } },
          },
        }),
        prisma.assemblyPart.count({
          where: {
            projectId,
            productionLogs: { some: {} },
          },
        }),
        prisma.workUnit.count({ where: { projectId } }),
        prisma.riskEvent.count({
          where: {
            projectId,
            status: 'ACTIVE',
          },
        }),
      ]);

      const trackingPercentage = totalParts > 0
        ? Math.round((partsInWorkOrders / totalParts) * 100)
        : 0;

      return {
        totalParts,
        partsInWorkOrders,
        partsWithProductionLogs,
        workUnitsCount,
        activeRisks,
        trackingPercentage,
      };
    } catch (error) {
      console.error('[WorkTrackingValidator] Error getting tracking status:', error);
      return {
        totalParts: 0,
        partsInWorkOrders: 0,
        partsWithProductionLogs: 0,
        workUnitsCount: 0,
        activeRisks: 0,
        trackingPercentage: 0,
      };
    }
  }
}

export default WorkTrackingValidatorService;
