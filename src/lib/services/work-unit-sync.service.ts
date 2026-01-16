/**
 * WorkUnit Sync Service
 * 
 * Automatically creates WorkUnits when real work is created in OTS.
 * This enables the Early Warning Engine to track all work across the system.
 * 
 * IMPORTANT: All sync operations are NON-BLOCKING.
 * If WorkUnit creation fails, the original operation still succeeds.
 * 
 * Mapping:
 * - Task → DESIGN / PROCUREMENT / DOCUMENTATION (based on department)
 * - WorkOrder → PRODUCTION
 * - RFIRequest → QC
 * - DocumentSubmission → DOCUMENTATION
 */

import { prisma } from '@/lib/prisma';
import { WorkUnitType, WorkUnitStatus } from '@prisma/client';
import { DependencyBlueprintService } from './dependency-blueprint.service';

// ============================================
// TYPES
// ============================================

export interface TaskSyncInput {
  id: string;
  projectId: string | null;
  createdById: string;
  assignedToId: string | null;
  taskInputDate: Date | null;
  dueDate: Date | null;
  status: string;
  departmentId: string | null;
  title?: string; // For load estimation
}

// ============================================
// LOAD ESTIMATION RULES
// ============================================

const LOAD_ESTIMATION = {
  // Design tasks: estimate drawings based on title keywords
  DESIGN: {
    defaultQuantity: 5, // Default 5 drawings per design task
    keywordMultipliers: {
      'shop drawing': 10,
      'detail': 8,
      'general arrangement': 3,
      'connection': 6,
      'anchor bolt': 4,
      'erection': 5,
    } as Record<string, number>,
  },
  // Procurement tasks
  PROCUREMENT: {
    defaultQuantity: 1, // 1 procurement action per task
  },
  // QC inspections
  QC: {
    defaultQuantity: 1, // 1 inspection per RFI
  },
  // Documentation
  DOCUMENTATION: {
    defaultQuantity: 1, // 1 document per submission
  },
};

/**
 * Estimate load quantity based on work unit type and context
 */
function estimateQuantity(type: string, context?: { title?: string }): number {
  switch (type) {
    case 'DESIGN':
      if (context?.title) {
        const titleLower = context.title.toLowerCase();
        for (const [keyword, multiplier] of Object.entries(LOAD_ESTIMATION.DESIGN.keywordMultipliers)) {
          if (titleLower.includes(keyword)) {
            return multiplier;
          }
        }
      }
      return LOAD_ESTIMATION.DESIGN.defaultQuantity;
    case 'PROCUREMENT':
      return LOAD_ESTIMATION.PROCUREMENT.defaultQuantity;
    case 'QC':
      return LOAD_ESTIMATION.QC.defaultQuantity;
    case 'DOCUMENTATION':
      return LOAD_ESTIMATION.DOCUMENTATION.defaultQuantity;
    default:
      return 1;
  }
}

export interface WorkOrderSyncInput {
  id: string;
  projectId: string;
  productionEngineerId: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  status: string;
  totalWeight: number | null;
}

export interface RFISyncInput {
  id: string;
  projectId: string;
  requestedById: string;
  assignedToId: string | null;
  requestDate: Date;
  status: string;
}

export interface DocumentSubmissionSyncInput {
  id: string;
  projectId: string;
  submitterId: string;
  handledBy: string | null;
  submissionDate: Date;
  reviewDueDate: Date | null;
  status: string;
}

// ============================================
// SERVICE CLASS
// ============================================

export class WorkUnitSyncService {
  /**
   * Determine WorkUnit type from Task based on department
   */
  private static async getWorkUnitTypeFromTask(departmentId: string | null): Promise<WorkUnitType> {
    if (!departmentId) {
      return WorkUnitType.DESIGN; // Default
    }

    try {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { name: true },
      });

      if (!department) {
        return WorkUnitType.DESIGN;
      }

      const deptName = department.name.toLowerCase();

      if (deptName.includes('procurement') || deptName.includes('purchasing')) {
        return WorkUnitType.PROCUREMENT;
      }
      if (deptName.includes('document') || deptName.includes('control')) {
        return WorkUnitType.DOCUMENTATION;
      }
      if (deptName.includes('qc') || deptName.includes('quality')) {
        return WorkUnitType.QC;
      }
      if (deptName.includes('production') || deptName.includes('fabrication')) {
        return WorkUnitType.PRODUCTION;
      }

      return WorkUnitType.DESIGN; // Default for engineering/design tasks
    } catch {
      return WorkUnitType.DESIGN;
    }
  }

  /**
   * Map source status to WorkUnit status
   */
  private static mapStatus(sourceStatus: string): WorkUnitStatus {
    const status = sourceStatus.toLowerCase();

    if (status.includes('completed') || status.includes('approved') || status.includes('closed')) {
      return WorkUnitStatus.COMPLETED;
    }
    if (status.includes('progress') || status.includes('active') || status.includes('ongoing') || status.includes('in progress')) {
      return WorkUnitStatus.IN_PROGRESS;
    }
    if (status.includes('blocked') || status.includes('hold') || status.includes('rejected')) {
      return WorkUnitStatus.BLOCKED;
    }
    // Pending, Not Started, Draft, etc. all map to NOT_STARTED
    return WorkUnitStatus.NOT_STARTED;
  }

  /**
   * Check if WorkUnit already exists for this reference
   */
  private static async workUnitExists(referenceModule: string, referenceId: string): Promise<boolean> {
    const existing = await prisma.workUnit.findFirst({
      where: {
        referenceModule,
        referenceId,
      },
      select: { id: true },
    });
    return !!existing;
  }

  /**
   * Sync WorkUnit from Task creation
   * NON-BLOCKING: Errors are logged but don't fail the task creation
   */
  static async syncFromTask(task: TaskSyncInput): Promise<void> {
    try {
      // Skip if no project (WorkUnits require a project)
      if (!task.projectId) {
        console.log(`[WorkUnitSync] Skipping Task ${task.id} - no project assigned`);
        return;
      }

      // Check for duplicates
      if (await this.workUnitExists('Task', task.id)) {
        console.log(`[WorkUnitSync] WorkUnit already exists for Task ${task.id}`);
        return;
      }

      const workUnitType = await this.getWorkUnitTypeFromTask(task.departmentId);
      const ownerId = task.assignedToId || task.createdById;

      // Calculate planned dates
      const now = new Date();
      const plannedStart = task.taskInputDate || now;
      const plannedEnd = task.dueDate || new Date(plannedStart.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

      // Estimate quantity based on work unit type
      const quantity = estimateQuantity(workUnitType, { title: task.title });

      await prisma.workUnit.create({
        data: {
          projectId: task.projectId,
          type: workUnitType,
          referenceModule: 'Task',
          referenceId: task.id,
          ownerId,
          plannedStart,
          plannedEnd,
          status: this.mapStatus(task.status),
          quantity, // Load estimation
        },
      });

      console.log(`[WorkUnitSync] ✓ Created WorkUnit for Task ${task.id} (${workUnitType})`);
    } catch (error) {
      console.error(`[WorkUnitSync] ✗ Failed to sync Task ${task.id}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Sync WorkUnit from WorkOrder creation
   * NON-BLOCKING: Errors are logged but don't fail the work order creation
   */
  static async syncFromWorkOrder(workOrder: WorkOrderSyncInput): Promise<void> {
    console.log(`[WorkUnitSync] Starting sync for WorkOrder ${workOrder.id}`);
    try {
      // Check for duplicates
      if (await this.workUnitExists('WorkOrder', workOrder.id)) {
        console.log(`[WorkUnitSync] WorkUnit already exists for WorkOrder ${workOrder.id}`);
        return;
      }

      console.log(`[WorkUnitSync] Creating WorkUnit for WorkOrder ${workOrder.id} with data:`, {
        projectId: workOrder.projectId,
        ownerId: workOrder.productionEngineerId,
        plannedStart: workOrder.plannedStartDate,
        plannedEnd: workOrder.plannedEndDate,
      });

      const newWorkUnit = await prisma.workUnit.create({
        data: {
          projectId: workOrder.projectId,
          type: WorkUnitType.PRODUCTION,
          referenceModule: 'WorkOrder',
          referenceId: workOrder.id,
          ownerId: workOrder.productionEngineerId,
          plannedStart: workOrder.plannedStartDate,
          plannedEnd: workOrder.plannedEndDate,
          status: this.mapStatus(workOrder.status),
          weight: workOrder.totalWeight,
          quantity: 1, // 1 work order = 1 production unit
        },
      });

      console.log(`[WorkUnitSync] ✓ Created WorkUnit for WorkOrder ${workOrder.id} (PRODUCTION)`);

      // Auto-create dependencies (non-blocking)
      this.createAutomaticDependencies(newWorkUnit.id, workOrder.projectId, 'PRODUCTION')
        .catch(err => console.error('[WorkUnitSync] Auto-dependency failed:', err));
    } catch (error) {
      console.error(`[WorkUnitSync] ✗ Failed to sync WorkOrder ${workOrder.id}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Sync WorkUnit from RFI creation
   * NON-BLOCKING: Errors are logged but don't fail the RFI creation
   */
  static async syncFromRFI(rfi: RFISyncInput): Promise<void> {
    try {
      // Check for duplicates
      if (await this.workUnitExists('RFIRequest', rfi.id)) {
        console.log(`[WorkUnitSync] WorkUnit already exists for RFI ${rfi.id}`);
        return;
      }

      const ownerId = rfi.assignedToId || rfi.requestedById;

      // RFIs typically have a 2-day inspection window
      const plannedStart = rfi.requestDate;
      const plannedEnd = new Date(plannedStart.getTime() + 2 * 24 * 60 * 60 * 1000);

      // Estimate quantity for QC
      const quantity = estimateQuantity('QC');

      const newWorkUnit = await prisma.workUnit.create({
        data: {
          projectId: rfi.projectId,
          type: WorkUnitType.QC,
          referenceModule: 'RFIRequest',
          referenceId: rfi.id,
          ownerId,
          plannedStart,
          plannedEnd,
          status: this.mapStatus(rfi.status),
          quantity, // Load estimation
        },
      });

      console.log(`[WorkUnitSync] ✓ Created WorkUnit for RFI ${rfi.id} (QC)`);

      // Auto-create dependencies (non-blocking)
      this.createAutomaticDependencies(newWorkUnit.id, rfi.projectId, 'QC')
        .catch(err => console.error('[WorkUnitSync] Auto-dependency failed:', err));
    } catch (error) {
      console.error(`[WorkUnitSync] ✗ Failed to sync RFI ${rfi.id}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Sync WorkUnit from DocumentSubmission creation
   * NON-BLOCKING: Errors are logged but don't fail the document submission
   */
  static async syncFromDocumentSubmission(doc: DocumentSubmissionSyncInput): Promise<void> {
    try {
      // Check for duplicates
      if (await this.workUnitExists('DocumentSubmission', doc.id)) {
        console.log(`[WorkUnitSync] WorkUnit already exists for DocumentSubmission ${doc.id}`);
        return;
      }

      const ownerId = doc.handledBy || doc.submitterId;

      // Use review due date if available, otherwise 7 days from submission
      const plannedStart = doc.submissionDate;
      const plannedEnd = doc.reviewDueDate || new Date(plannedStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Estimate quantity for Documentation
      const quantity = estimateQuantity('DOCUMENTATION');

      const newWorkUnit = await prisma.workUnit.create({
        data: {
          projectId: doc.projectId,
          type: WorkUnitType.DOCUMENTATION,
          referenceModule: 'DocumentSubmission',
          referenceId: doc.id,
          ownerId,
          plannedStart,
          plannedEnd,
          status: this.mapStatus(doc.status),
          quantity, // Load estimation
        },
      });

      console.log(`[WorkUnitSync] ✓ Created WorkUnit for DocumentSubmission ${doc.id} (DOCUMENTATION)`);

      // Auto-create dependencies (non-blocking)
      this.createAutomaticDependencies(newWorkUnit.id, doc.projectId, 'DOCUMENTATION')
        .catch(err => console.error('[WorkUnitSync] Auto-dependency failed:', err));
    } catch (error) {
      console.error(`[WorkUnitSync] ✗ Failed to sync DocumentSubmission ${doc.id}:`, error instanceof Error ? error.message : error);
    }
  }

  // ============================================
  // STATUS UPDATE METHODS
  // ============================================

  /**
   * Update WorkUnit status when source record status changes
   * NON-BLOCKING: Errors are logged but don't fail the source update
   */
  static async updateStatus(
    referenceModule: string,
    referenceId: string,
    newStatus: string
  ): Promise<void> {
    try {
      const workUnit = await prisma.workUnit.findFirst({
        where: {
          referenceModule,
          referenceId,
        },
        select: { id: true, status: true, actualStart: true, actualEnd: true },
      });

      if (!workUnit) {
        console.log(`[WorkUnitSync] No WorkUnit found for ${referenceModule}:${referenceId}`);
        return;
      }

      const mappedStatus = this.mapStatus(newStatus);

      // Skip if status hasn't changed
      if (workUnit.status === mappedStatus) {
        return;
      }

      // Prepare update data
      const updateData: {
        status: WorkUnitStatus;
        actualStart?: Date;
        actualEnd?: Date;
      } = {
        status: mappedStatus,
      };

      // Set actualStart when transitioning to IN_PROGRESS
      if (mappedStatus === WorkUnitStatus.IN_PROGRESS && !workUnit.actualStart) {
        updateData.actualStart = new Date();
      }

      // Set actualEnd when transitioning to COMPLETED
      if (mappedStatus === WorkUnitStatus.COMPLETED && !workUnit.actualEnd) {
        updateData.actualEnd = new Date();
      }

      await prisma.workUnit.update({
        where: { id: workUnit.id },
        data: updateData,
      });

      console.log(`[WorkUnitSync] ✓ Updated WorkUnit ${workUnit.id} status: ${workUnit.status} → ${mappedStatus}`);
    } catch (error) {
      console.error(`[WorkUnitSync] ✗ Failed to update status for ${referenceModule}:${referenceId}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Sync Task status update
   */
  static async syncTaskStatusUpdate(taskId: string, newStatus: string): Promise<void> {
    await this.updateStatus('Task', taskId, newStatus);
  }

  /**
   * Sync WorkOrder status update
   */
  static async syncWorkOrderStatusUpdate(workOrderId: string, newStatus: string): Promise<void> {
    await this.updateStatus('WorkOrder', workOrderId, newStatus);
  }

  /**
   * Sync RFI status update
   */
  static async syncRFIStatusUpdate(rfiId: string, newStatus: string): Promise<void> {
    await this.updateStatus('RFIRequest', rfiId, newStatus);
  }

  /**
   * Sync DocumentSubmission status update
   */
  static async syncDocumentSubmissionStatusUpdate(docId: string, newStatus: string): Promise<void> {
    await this.updateStatus('DocumentSubmission', docId, newStatus);
  }

  // ============================================
  // AUTOMATIC DEPENDENCY CREATION (BLUEPRINT-BASED)
  // ============================================

  /**
   * Create automatic dependencies using DependencyBlueprint system
   * This is called after WorkUnit creation to link related work items
   * 
   * The blueprint system defines dependency rules per structure type:
   * - DESIGN → PRODUCTION (FS)
   * - DESIGN → PROCUREMENT (FS)
   * - PRODUCTION → QC (FS)
   * - QC → DOCUMENTATION (FS)
   */
  static async createAutomaticDependencies(
    newWorkUnitId: string,
    projectId: string,
    workUnitType: string
  ): Promise<void> {
    try {
      console.log(`[WorkUnitSync] Applying blueprint dependencies for ${workUnitType} WorkUnit ${newWorkUnitId}`);

      // Use the DependencyBlueprint service to apply template-based dependencies
      const result = await DependencyBlueprintService.applyBlueprintToWorkUnit(
        newWorkUnitId,
        projectId
      );

      if (result) {
        console.log(
          `[WorkUnitSync] Blueprint "${result.blueprintName}" applied: ${result.dependenciesCreated} dependencies created, ${result.dependenciesSkipped} skipped`
        );
        if (result.errors.length > 0) {
          console.warn('[WorkUnitSync] Blueprint errors:', result.errors);
        }
      } else {
        // Fallback to legacy logic if no blueprint found
        console.log('[WorkUnitSync] No blueprint found, using legacy dependency logic');
        await this.createLegacyDependencies(newWorkUnitId, projectId, workUnitType);
      }
    } catch (error) {
      console.error(`[WorkUnitSync] ✗ Failed to create auto-dependencies:`, error instanceof Error ? error.message : error);
      // Fallback to legacy logic on error
      await this.createLegacyDependencies(newWorkUnitId, projectId, workUnitType);
    }
  }

  /**
   * Legacy dependency creation (fallback when no blueprint exists)
   */
  private static async createLegacyDependencies(
    newWorkUnitId: string,
    projectId: string,
    workUnitType: string
  ): Promise<void> {
    try {
      // Find potential upstream dependencies based on type
      let upstreamTypes: string[] = [];
      
      switch (workUnitType) {
        case 'PRODUCTION':
          upstreamTypes = ['DESIGN', 'PROCUREMENT'];
          break;
        case 'QC':
          upstreamTypes = ['PRODUCTION'];
          break;
        case 'DOCUMENTATION':
          upstreamTypes = ['QC'];
          break;
        default:
          return;
      }

      const upstreamWorkUnits = await prisma.workUnit.findMany({
        where: {
          projectId,
          type: { in: upstreamTypes as WorkUnitType[] },
          status: { not: 'COMPLETED' },
          id: { not: newWorkUnitId },
        },
        select: { id: true, type: true },
        take: 5,
      });

      for (const upstream of upstreamWorkUnits) {
        const existingDep = await prisma.workUnitDependency.findFirst({
          where: {
            fromWorkUnitId: upstream.id,
            toWorkUnitId: newWorkUnitId,
          },
        });

        if (!existingDep) {
          await prisma.workUnitDependency.create({
            data: {
              fromWorkUnitId: upstream.id,
              toWorkUnitId: newWorkUnitId,
              dependencyType: 'FS',
              lagDays: 0,
            },
          });
          console.log(`[WorkUnitSync] ✓ Legacy dependency: ${upstream.type} → ${workUnitType}`);
        }
      }
    } catch (error) {
      console.error('[WorkUnitSync] Legacy dependency creation failed:', error);
    }
  }

  /**
   * Link WorkOrder to its source Task (if created from a task)
   */
  static async linkWorkOrderToTask(
    workOrderWorkUnitId: string,
    projectId: string,
    taskId?: string
  ): Promise<void> {
    try {
      if (taskId) {
        // Find the WorkUnit for the specific task
        const taskWorkUnit = await prisma.workUnit.findFirst({
          where: {
            referenceModule: 'Task',
            referenceId: taskId,
          },
          select: { id: true },
        });

        if (taskWorkUnit) {
          // Check if dependency already exists
          const existingDep = await prisma.workUnitDependency.findFirst({
            where: {
              fromWorkUnitId: taskWorkUnit.id,
              toWorkUnitId: workOrderWorkUnitId,
            },
          });

          if (!existingDep) {
            await prisma.workUnitDependency.create({
              data: {
                fromWorkUnitId: taskWorkUnit.id,
                toWorkUnitId: workOrderWorkUnitId,
                dependencyType: 'FS',
                lagDays: 0,
              },
            });
            console.log(`[WorkUnitSync] ✓ Linked WorkOrder to source Task`);
          }
        }
      }

      // Also create automatic dependencies based on workflow
      await this.createAutomaticDependencies(workOrderWorkUnitId, projectId, 'PRODUCTION');
    } catch (error) {
      console.error(`[WorkUnitSync] ✗ Failed to link WorkOrder to Task:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Link RFI to its source WorkOrder/ProductionLog
   */
  static async linkRFIToProduction(
    rfiWorkUnitId: string,
    projectId: string,
    workOrderId?: string
  ): Promise<void> {
    try {
      if (workOrderId) {
        // Find the WorkUnit for the specific work order
        const woWorkUnit = await prisma.workUnit.findFirst({
          where: {
            referenceModule: 'WorkOrder',
            referenceId: workOrderId,
          },
          select: { id: true },
        });

        if (woWorkUnit) {
          // Check if dependency already exists
          const existingDep = await prisma.workUnitDependency.findFirst({
            where: {
              fromWorkUnitId: woWorkUnit.id,
              toWorkUnitId: rfiWorkUnitId,
            },
          });

          if (!existingDep) {
            await prisma.workUnitDependency.create({
              data: {
                fromWorkUnitId: woWorkUnit.id,
                toWorkUnitId: rfiWorkUnitId,
                dependencyType: 'FS',
                lagDays: 0,
              },
            });
            console.log(`[WorkUnitSync] ✓ Linked RFI to source WorkOrder`);
          }
        }
      }

      // Also create automatic dependencies based on workflow
      await this.createAutomaticDependencies(rfiWorkUnitId, projectId, 'QC');
    } catch (error) {
      console.error(`[WorkUnitSync] ✗ Failed to link RFI to Production:`, error instanceof Error ? error.message : error);
    }
  }
}

export default WorkUnitSyncService;
