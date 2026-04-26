/**
 * Workflow Engine Service (21.0.0)
 * Generic reusable approval workflow for IMS, Procurement, HR, and any module
 * that needs multi-step, multi-approver flows.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApproverResolverConfig =
  | { type: 'ROLE'; role: string }
  | { type: 'PBAC_PERMISSION'; permission: string }
  | { type: 'DEPARTMENT_HEAD' }
  | { type: 'MANAGER_OF_INITIATOR' }
  | { type: 'FIXED_USER'; userId: string }
  | { type: 'AMOUNT_BAND'; field: string; bands: AmountBand[] };

interface AmountBand {
  min: number;
  max?: number;
  role?: string;
  userId?: string;
}

export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';

export interface StepCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

interface ResolvedApprover {
  userId: string;
  name: string;
  email: string;
}

// ─── Condition evaluator (no eval) ───────────────────────────────────────────

function evaluateCondition(condition: StepCondition, metadata: Record<string, unknown>): boolean {
  const fieldValue = metadata[condition.field];
  const { operator, value } = condition;

  switch (operator) {
    case 'eq':   return fieldValue === value;
    case 'ne':   return fieldValue !== value;
    case 'gt':   return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
    case 'gte':  return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
    case 'lt':   return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
    case 'lte':  return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
    case 'in':   return Array.isArray(value) && value.includes(fieldValue);
    case 'nin':  return Array.isArray(value) && !value.includes(fieldValue);
    case 'contains':
      return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value);
    default:     return false;
  }
}

function evaluateConditions(conditions: StepCondition[] | null | undefined, metadata: Record<string, unknown>): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every(c => evaluateCondition(c, metadata));
}

// ─── Approver Resolver ────────────────────────────────────────────────────────

async function resolveApprovers(
  config: ApproverResolverConfig,
  initiatorId: string,
  metadata: Record<string, unknown>,
): Promise<ResolvedApprover[]> {
  switch (config.type) {
    case 'ROLE': {
      const users = await prisma.user.findMany({
        where: {
          role: { name: config.role },
          status: 'active',
        },
        select: { id: true, name: true, email: true },
      });
      return users;
    }

    case 'PBAC_PERMISSION': {
      const allUsers = await prisma.user.findMany({
        where: { status: 'active' },
        select: { id: true, name: true, email: true, role: { select: { permissions: true } }, customPermissions: true },
      });
      return allUsers
        .filter(u => {
          const perms = (u.customPermissions ?? u.role.permissions) as string[] | null;
          return Array.isArray(perms) && perms.includes(config.permission);
        })
        .map(u => ({ userId: u.id, name: u.name, email: u.email }));
    }

    case 'DEPARTMENT_HEAD': {
      const initiator = await prisma.user.findUnique({
        where: { id: initiatorId },
        select: { departmentId: true },
      });
      if (!initiator?.departmentId) return [];
      const dept = await prisma.department.findUnique({
        where: { id: initiator.departmentId },
        select: { manager: { select: { id: true, name: true, email: true } } },
      });
      return dept?.manager ? [{ userId: dept.manager.id, name: dept.manager.name, email: dept.manager.email }] : [];
    }

    case 'MANAGER_OF_INITIATOR': {
      const initiator = await prisma.user.findUnique({
        where: { id: initiatorId },
        select: { reportsTo: { select: { id: true, name: true, email: true } } },
      });
      return initiator?.reportsTo
        ? [{ userId: initiator.reportsTo.id, name: initiator.reportsTo.name, email: initiator.reportsTo.email }]
        : [];
    }

    case 'FIXED_USER': {
      const user = await prisma.user.findUnique({
        where: { id: config.userId, status: 'active' },
        select: { id: true, name: true, email: true },
      });
      return user ? [{ userId: user.id, name: user.name, email: user.email }] : [];
    }

    case 'AMOUNT_BAND': {
      const fieldVal = metadata[config.field];
      if (typeof fieldVal !== 'number') return [];
      const band = config.bands.find(b => fieldVal >= b.min && (b.max === undefined || fieldVal <= b.max));
      if (!band) return [];
      if (band.userId) {
        const user = await prisma.user.findUnique({
          where: { id: band.userId, status: 'active' },
          select: { id: true, name: true, email: true },
        });
        return user ? [{ userId: user.id, name: user.name, email: user.email }] : [];
      }
      if (band.role) {
        const users = await prisma.user.findMany({
          where: { role: { name: band.role }, status: 'active' },
          select: { id: true, name: true, email: true },
        });
        return users;
      }
      return [];
    }

    default:
      return [];
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class WorkflowService {

  /**
   * Start a new workflow instance for an entity.
   * Finds the active definition by key, snapshots step instances, evaluates
   * step-1 conditions, resolves approvers, and activates the first eligible step.
   */
  async startWorkflow(
    key: string,
    entityType: string,
    entityId: string,
    initiatedById: string,
    siteId?: string,
    metadata?: Record<string, unknown>,
  ) {
    const definition = await prisma.workflowDefinition.findFirst({
      where: { key, isActive: true, deletedAt: null },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    if (!definition) throw new Error(`No active workflow definition found for key: ${key}`);
    if (!definition.steps.length) throw new Error(`Workflow definition "${key}" has no steps`);

    const meta = metadata ?? {};

    const instance = await prisma.workflowInstance.create({
      data: {
        definitionId: definition.id,
        definitionVersion: definition.version,
        entityType,
        entityId,
        status: 'IN_PROGRESS',
        initiatedById,
        metadata: meta,
        siteId: siteId ?? null,
      },
    });

    // Create all step instances in PENDING state
    const stepInstances = await Promise.all(
      definition.steps.map(step =>
        prisma.workflowStepInstance.create({
          data: {
            instanceId: instance.id,
            stepId: step.id,
            sequence: step.sequence,
            status: 'PENDING',
            requiredApprovals: step.minApprovals,
            receivedApprovals: 0,
          },
        })
      )
    );

    // Activate the first eligible step
    await this._activateNextStep(instance.id, initiatedById, meta, stepInstances, null);

    await systemEventService.log({
      eventType: 'WORKFLOW_STARTED',
      eventCategory: 'BUSINESS',
      severity: 'INFO',
      userId: initiatedById,
      entityType,
      entityId,
      summary: `Workflow "${definition.name}" started for ${entityType}:${entityId}`,
      details: { definitionKey: key, instanceId: instance.id },
    });

    return instance;
  }

  /**
   * Record an approval decision on the current active step.
   * Handles APPROVE (advance/complete), REJECT (behavior), DELEGATE, COMMENT.
   */
  async recordDecision(
    instanceId: string,
    userId: string,
    decision: 'APPROVE' | 'REJECT' | 'DELEGATE' | 'COMMENT',
    comment?: string,
    delegatedToUserId?: string,
  ) {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        stepInstances: { orderBy: { sequence: 'asc' } },
        definition: { include: { steps: { orderBy: { sequence: 'asc' } } } },
      },
    });
    if (!instance) throw new Error('Workflow instance not found');
    if (instance.status !== 'IN_PROGRESS') throw new Error(`Workflow is not in progress (status: ${instance.status})`);

    const activeStepInstance = instance.stepInstances.find(si => si.status === 'ACTIVE');
    if (!activeStepInstance) throw new Error('No active step found');

    // Verify user is an authorized approver (in resolvedApprovers or delegated)
    const resolvedApprovers = (activeStepInstance.resolvedApprovers ?? []) as ResolvedApprover[];
    const isAuthorized = resolvedApprovers.some(a => a.userId === userId);
    if (!isAuthorized) throw new Error('User is not an authorized approver for this step');

    // Prevent duplicate approve/reject decisions from same user
    const existingDecision = await prisma.workflowApproval.findFirst({
      where: {
        stepInstanceId: activeStepInstance.id,
        userId,
        decision: { in: ['APPROVE', 'REJECT'] },
      },
    });
    if (existingDecision) throw new Error('User has already submitted a decision for this step');

    // Record the approval
    await prisma.workflowApproval.create({
      data: {
        stepInstanceId: activeStepInstance.id,
        userId,
        decision,
        comment: comment ?? null,
        delegatedToUserId: delegatedToUserId ?? null,
      },
    });

    const meta = (instance.metadata ?? {}) as Record<string, unknown>;

    if (decision === 'APPROVE') {
      const newCount = activeStepInstance.receivedApprovals + 1;
      await prisma.workflowStepInstance.update({
        where: { id: activeStepInstance.id },
        data: { receivedApprovals: newCount },
      });

      if (newCount >= activeStepInstance.requiredApprovals) {
        // Mark step approved
        await prisma.workflowStepInstance.update({
          where: { id: activeStepInstance.id },
          data: { status: 'APPROVED', completedAt: new Date() },
        });
        await systemEventService.log({
          eventType: 'WORKFLOW_STEP_APPROVED',
          eventCategory: 'BUSINESS',
          severity: 'INFO',
          userId,
          entityType: instance.entityType,
          entityId: instance.entityId,
          summary: `Step "${activeStepInstance.sequence}" approved in workflow instance ${instanceId}`,
          details: { instanceId, stepInstanceId: activeStepInstance.id, approverCount: newCount },
        });
        await this._activateNextStep(
          instanceId,
          instance.initiatedById,
          meta,
          instance.stepInstances,
          activeStepInstance.id,
        );
      }
    } else if (decision === 'REJECT') {
      await prisma.workflowStepInstance.update({
        where: { id: activeStepInstance.id },
        data: { status: 'REJECTED', completedAt: new Date() },
      });

      const step = instance.definition.steps.find(s => s.id === activeStepInstance.stepId);
      const behavior = (step?.onRejectBehavior ?? 'RETURN_PREVIOUS') as string;

      await this._applyRejectBehavior(
        instance,
        activeStepInstance,
        behavior,
        userId,
        meta,
      );
    } else if (decision === 'DELEGATE') {
      if (!delegatedToUserId) throw new Error('delegatedToUserId required for DELEGATE decision');
      const delegatee = await prisma.user.findUnique({
        where: { id: delegatedToUserId },
        select: { id: true, name: true, email: true },
      });
      if (!delegatee) throw new Error('Delegatee user not found');

      // Add delegatee to resolvedApprovers if not already present
      const alreadyIn = resolvedApprovers.some(a => a.userId === delegatedToUserId);
      if (!alreadyIn) {
        const updated = [...resolvedApprovers, { userId: delegatee.id, name: delegatee.name, email: delegatee.email }];
        await prisma.workflowStepInstance.update({
          where: { id: activeStepInstance.id },
          data: { resolvedApprovers: updated },
        });
      }
      await systemEventService.log({
        eventType: 'WORKFLOW_DECISION_DELEGATED',
        eventCategory: 'BUSINESS',
        severity: 'INFO',
        userId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        summary: `Step decision delegated to user ${delegatedToUserId} in workflow ${instanceId}`,
        details: { instanceId, stepInstanceId: activeStepInstance.id, delegatedToUserId },
      });
    }
    // COMMENT: already recorded — no state change needed

    return prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { stepInstances: { include: { approvals: true }, orderBy: { sequence: 'asc' } } },
    });
  }

  /** Cancel a workflow instance. */
  async cancelWorkflow(instanceId: string, userId: string, reason?: string) {
    const instance = await prisma.workflowInstance.findUnique({ where: { id: instanceId } });
    if (!instance) throw new Error('Workflow instance not found');
    if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(instance.status)) {
      throw new Error(`Cannot cancel workflow in status: ${instance.status}`);
    }

    // Mark active step as skipped
    await prisma.workflowStepInstance.updateMany({
      where: { instanceId, status: 'ACTIVE' },
      data: { status: 'SKIPPED', skipReason: reason ?? 'Workflow cancelled', completedAt: new Date() },
    });

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'CANCELLED',
        cancelReason: reason ?? null,
        cancelledById: userId,
        cancelledAt: new Date(),
      },
    });

    await systemEventService.log({
      eventType: 'WORKFLOW_CANCELLED',
      eventCategory: 'BUSINESS',
      severity: 'WARNING',
      userId,
      entityType: instance.entityType,
      entityId: instance.entityId,
      summary: `Workflow instance ${instanceId} cancelled`,
      details: { instanceId, reason },
    });
  }

  /** Get the full workflow status for an entity (latest active instance). */
  async getWorkflowStatus(entityType: string, entityId: string) {
    return prisma.workflowInstance.findFirst({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        definition: { select: { key: true, name: true, entityType: true } },
        initiatedBy: { select: { id: true, name: true, email: true } },
        cancelledBy: { select: { id: true, name: true } },
        stepInstances: {
          orderBy: { sequence: 'asc' },
          include: {
            step: { select: { name: true, sequence: true, slaHours: true, onRejectBehavior: true } },
            approvals: {
              include: { user: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
  }

  /** Get all pending approval steps for a given user across all active workflows. */
  async getPendingApprovalsForUser(userId: string, siteId?: string) {
    const activeSteps = await prisma.workflowStepInstance.findMany({
      where: { status: 'ACTIVE' },
      include: {
        instance: {
          where: {
            status: 'IN_PROGRESS',
            ...(siteId ? { siteId } : {}),
          },
          include: {
            definition: { select: { key: true, name: true } },
            initiatedBy: { select: { id: true, name: true } },
          },
        },
        step: { select: { name: true, sequence: true, slaHours: true } },
        approvals: { where: { userId, decision: { in: ['APPROVE', 'REJECT'] } } },
      },
    });

    // Filter to steps where user is in resolvedApprovers and hasn't decided yet
    return activeSteps.filter(si => {
      if (!si.instance) return false;
      const approvers = (si.resolvedApprovers ?? []) as ResolvedApprover[];
      const isApprover = approvers.some(a => a.userId === userId);
      const hasDecided = si.approvals.length > 0;
      return isApprover && !hasDecided;
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /** Activate the next eligible step after currentStepInstanceId (null = find first). */
  private async _activateNextStep(
    instanceId: string,
    initiatorId: string,
    meta: Record<string, unknown>,
    stepInstances: { id: string; sequence: number; stepId: string; status: string }[],
    completedStepInstanceId: string | null,
  ) {
    const completedSeq = completedStepInstanceId
      ? stepInstances.find(si => si.id === completedStepInstanceId)?.sequence ?? -1
      : -1;

    const candidates = stepInstances
      .filter(si => si.sequence > completedSeq && si.status === 'PENDING')
      .sort((a, b) => a.sequence - b.sequence);

    for (const candidate of candidates) {
      const stepDef = await prisma.workflowStep.findUnique({ where: { id: candidate.stepId } });
      if (!stepDef) continue;

      const conditions = stepDef.conditions as StepCondition[] | null;
      const conditionsMet = evaluateConditions(conditions, meta);

      if (!conditionsMet) {
        // Skip this step
        await prisma.workflowStepInstance.update({
          where: { id: candidate.id },
          data: { status: 'SKIPPED', skipReason: 'Step conditions not met', completedAt: new Date() },
        });
        continue;
      }

      // Resolve approvers and activate
      const resolverConfig = stepDef.approverResolver as ApproverResolverConfig;
      const resolvedApprovers = await resolveApprovers(resolverConfig, initiatorId, meta);

      await prisma.workflowStepInstance.update({
        where: { id: candidate.id },
        data: {
          status: 'ACTIVE',
          resolvedApprovers,
          requiredApprovals: stepDef.minApprovals,
          activatedAt: new Date(),
        },
      });

      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStepId: candidate.id },
      });

      return; // activated a step — done
    }

    // No more eligible steps — workflow complete
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'APPROVED', currentStepId: null, completedAt: new Date() },
    });

    const instance = await prisma.workflowInstance.findUnique({ where: { id: instanceId } });
    await systemEventService.log({
      eventType: 'WORKFLOW_COMPLETED',
      eventCategory: 'BUSINESS',
      severity: 'INFO',
      entityType: instance?.entityType,
      entityId: instance?.entityId,
      summary: `Workflow instance ${instanceId} completed (all steps approved)`,
      details: { instanceId },
    });
  }

  /** Apply the onRejectBehavior of a rejected step. */
  private async _applyRejectBehavior(
    instance: {
      id: string;
      entityType: string;
      entityId: string;
      initiatedById: string;
      metadata: unknown;
      definition: { steps: { id: string; sequence: number }[] };
    },
    rejectedStepInstance: { id: string; sequence: number; stepId: string },
    behavior: string,
    rejectorId: string,
    meta: Record<string, unknown>,
  ) {
    const instanceId = instance.id;

    await systemEventService.log({
      eventType: 'WORKFLOW_STEP_REJECTED',
      eventCategory: 'BUSINESS',
      severity: 'WARNING',
      userId: rejectorId,
      entityType: instance.entityType,
      entityId: instance.entityId,
      summary: `Step ${rejectedStepInstance.sequence} rejected (behavior: ${behavior}) in workflow ${instanceId}`,
      details: { instanceId, stepInstanceId: rejectedStepInstance.id, behavior },
    });

    if (behavior === 'TERMINATE') {
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'REJECTED', currentStepId: null, completedAt: new Date() },
      });
      return;
    }

    if (behavior === 'RETURN_PREVIOUS') {
      // Find the most recent non-skipped approved step before the rejected one
      const allSteps = await prisma.workflowStepInstance.findMany({
        where: { instanceId },
        orderBy: { sequence: 'asc' },
      });
      const previousApproved = allSteps
        .filter(si => si.sequence < rejectedStepInstance.sequence && si.status === 'APPROVED')
        .sort((a, b) => b.sequence - a.sequence)[0];

      if (!previousApproved) {
        // No previous step — treat as RESTART
        await this._restartWorkflow(instance, meta);
        return;
      }

      // Reactivate previous step
      const stepDef = await prisma.workflowStep.findUnique({ where: { id: previousApproved.stepId } });
      if (!stepDef) return;
      const resolverConfig = stepDef.approverResolver as ApproverResolverConfig;
      const resolvedApprovers = await resolveApprovers(resolverConfig, instance.initiatedById, meta);

      await prisma.workflowStepInstance.update({
        where: { id: previousApproved.id },
        data: {
          status: 'ACTIVE',
          resolvedApprovers,
          receivedApprovals: 0,
          activatedAt: new Date(),
          completedAt: null,
        },
      });
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { currentStepId: previousApproved.id },
      });
      return;
    }

    if (behavior === 'RESTART') {
      await this._restartWorkflow(instance, meta);
    }
  }

  /** Reset all step instances and activate step 1 fresh. */
  private async _restartWorkflow(
    instance: {
      id: string;
      entityType: string;
      entityId: string;
      initiatedById: string;
      definition: { steps: { id: string; sequence: number }[] };
    },
    meta: Record<string, unknown>,
  ) {
    const instanceId = instance.id;

    // Reset all step instances to PENDING
    await prisma.workflowStepInstance.updateMany({
      where: { instanceId },
      data: { status: 'PENDING', receivedApprovals: 0, resolvedApprovers: undefined, activatedAt: null, completedAt: null, skipReason: null },
    });

    const stepInstances = await prisma.workflowStepInstance.findMany({
      where: { instanceId },
      orderBy: { sequence: 'asc' },
    });

    await systemEventService.log({
      eventType: 'WORKFLOW_RESTARTED',
      eventCategory: 'BUSINESS',
      severity: 'WARNING',
      entityType: instance.entityType,
      entityId: instance.entityId,
      summary: `Workflow instance ${instanceId} restarted from step 1`,
      details: { instanceId },
    });

    await this._activateNextStep(instanceId, instance.initiatedById, meta, stepInstances, null);
  }
}

export const workflowService = new WorkflowService();
