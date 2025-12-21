/**
 * Early Warning Engine Service
 * 
 * Predictive Operations Control System - Phase 4
 * 
 * This service implements a rule-based early warning system that:
 * - Evaluates deterministic rules against WorkUnits and Resources
 * - Generates RiskEvent records automatically
 * - Ensures idempotency through fingerprinting
 * - Provides risk detection without AI guessing
 * 
 * RULES IMPLEMENTED:
 * 1. Late Start Risk - WorkUnit not started when 40%+ of planned duration elapsed
 * 2. Dependency Cascade Risk - Upstream WorkUnit delayed, downstream at risk
 * 3. Capacity Overload Risk - Resource utilization exceeds threshold
 * 4. Critical Path Delay Risk - WorkUnits on longest chain are delayed
 */

import { prisma } from '@/lib/prisma';
import { 
  RiskSeverity, 
  RiskType, 
  WorkUnitStatus,
} from '@prisma/client';
import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export interface RiskEventInput {
  severity: RiskSeverity;
  type: RiskType;
  affectedProjectIds: string[];
  affectedWorkUnitIds: string[];
  reason: string;
  recommendedAction: string;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  ruleName: string;
  risksDetected: number;
  risksCreated: number;
  risksAlreadyExist: number;
  errors: string[];
}

export interface EngineRunResult {
  runAt: Date;
  totalRisksDetected: number;
  totalRisksCreated: number;
  ruleResults: RuleEvaluationResult[];
  duration: number;
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Late Start Risk: Trigger when this percentage of planned duration has elapsed
  LATE_START_THRESHOLD_PERCENT: 40,
  
  // Capacity Overload: Trigger when utilization exceeds this percentage
  CAPACITY_OVERLOAD_THRESHOLD: 100,
  
  // Dependency Cascade: Days before planned start to check upstream delays
  DEPENDENCY_LOOKAHEAD_DAYS: 7,
  
  // Critical Path: Minimum chain depth to consider "critical"
  CRITICAL_PATH_MIN_DEPTH: 3,
};

// ============================================
// SERVICE CLASS
// ============================================

export class EarlyWarningEngineService {
  /**
   * Generate a unique fingerprint for a risk event
   * Used to prevent duplicate alerts for the same condition
   */
  private static generateFingerprint(
    type: RiskType,
    workUnitIds: string[],
    additionalContext: string = ''
  ): string {
    const sortedIds = [...workUnitIds].sort().join(',');
    const data = `${type}:${sortedIds}:${additionalContext}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 64);
  }

  /**
   * Create a RiskEvent if it doesn't already exist (idempotent)
   */
  private static async createRiskEvent(
    input: RiskEventInput,
    fingerprint: string
  ): Promise<{ created: boolean; id: string }> {
    // Check if risk with this fingerprint already exists and is unresolved
    const existing = await prisma.riskEvent.findUnique({
      where: { fingerprint },
      select: { id: true, resolvedAt: true },
    });

    if (existing && !existing.resolvedAt) {
      return { created: false, id: existing.id };
    }

    // If resolved, we can create a new one (condition recurred)
    // If not exists, create new
    const riskEvent = await prisma.riskEvent.create({
      data: {
        severity: input.severity,
        type: input.type,
        affectedProjectIds: input.affectedProjectIds,
        affectedWorkUnitIds: input.affectedWorkUnitIds,
        reason: input.reason,
        recommendedAction: input.recommendedAction,
        fingerprint,
        metadata: input.metadata || {},
      },
    });

    return { created: true, id: riskEvent.id };
  }

  /**
   * RULE 1: Late Start Risk
   * 
   * Condition: WorkUnit is NOT_STARTED and more than 40% of planned duration has elapsed
   * Severity: Based on elapsed percentage
   *   - 40-60%: MEDIUM
   *   - 60-80%: HIGH
   *   - 80%+: CRITICAL
   */
  static async evaluateLateStartRisk(): Promise<RuleEvaluationResult> {
    const result: RuleEvaluationResult = {
      ruleName: 'Late Start Risk',
      risksDetected: 0,
      risksCreated: 0,
      risksAlreadyExist: 0,
      errors: [],
    };

    try {
      const now = new Date();

      // Get all NOT_STARTED WorkUnits where planned start is in the past
      const workUnits = await prisma.workUnit.findMany({
        where: {
          status: WorkUnitStatus.NOT_STARTED,
          plannedStart: { lte: now },
        },
        include: {
          project: { select: { id: true, projectNumber: true } },
          owner: { select: { name: true } },
        },
      });

      for (const wu of workUnits) {
        const plannedDuration = wu.plannedEnd.getTime() - wu.plannedStart.getTime();
        const elapsed = now.getTime() - wu.plannedStart.getTime();
        const elapsedPercent = (elapsed / plannedDuration) * 100;

        if (elapsedPercent >= CONFIG.LATE_START_THRESHOLD_PERCENT) {
          result.risksDetected++;

          // Determine severity
          let severity: RiskSeverity;
          if (elapsedPercent >= 80) {
            severity = RiskSeverity.CRITICAL;
          } else if (elapsedPercent >= 60) {
            severity = RiskSeverity.HIGH;
          } else {
            severity = RiskSeverity.MEDIUM;
          }

          const fingerprint = this.generateFingerprint(
            RiskType.DELAY,
            [wu.id],
            'late_start'
          );

          const { created } = await this.createRiskEvent(
            {
              severity,
              type: RiskType.DELAY,
              affectedProjectIds: [wu.projectId],
              affectedWorkUnitIds: [wu.id],
              reason: `WorkUnit "${wu.referenceModule}:${wu.referenceId}" in project ${wu.project.projectNumber} has not started. ${Math.round(elapsedPercent)}% of planned duration has elapsed. Owner: ${wu.owner.name}`,
              recommendedAction: `Immediately start work on ${wu.referenceModule}:${wu.referenceId} or reassign to available resource. Review dependencies and blockers.`,
              metadata: {
                elapsedPercent: Math.round(elapsedPercent),
                plannedStart: wu.plannedStart,
                plannedEnd: wu.plannedEnd,
                ownerName: wu.owner.name,
              },
            },
            fingerprint
          );

          if (created) {
            result.risksCreated++;
          } else {
            result.risksAlreadyExist++;
          }
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * RULE 2: Dependency Cascade Risk
   * 
   * Condition: Upstream WorkUnit is delayed/blocked, and downstream WorkUnit
   *            is planned to start within DEPENDENCY_LOOKAHEAD_DAYS
   * Severity: Based on downstream start proximity
   *   - Starting in 1-2 days: CRITICAL
   *   - Starting in 3-4 days: HIGH
   *   - Starting in 5-7 days: MEDIUM
   */
  static async evaluateDependencyCascadeRisk(): Promise<RuleEvaluationResult> {
    const result: RuleEvaluationResult = {
      ruleName: 'Dependency Cascade Risk',
      risksDetected: 0,
      risksCreated: 0,
      risksAlreadyExist: 0,
      errors: [],
    };

    try {
      const now = new Date();
      const lookaheadDate = new Date(
        now.getTime() + CONFIG.DEPENDENCY_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000
      );

      // Get all dependencies where:
      // - Upstream (from) is delayed or blocked
      // - Downstream (to) is planned to start soon
      const dependencies = await prisma.workUnitDependency.findMany({
        where: {
          fromWorkUnit: {
            OR: [
              { status: WorkUnitStatus.BLOCKED },
              {
                status: WorkUnitStatus.IN_PROGRESS,
                plannedEnd: { lt: now }, // Should have finished by now
              },
              {
                status: WorkUnitStatus.NOT_STARTED,
                plannedStart: { lt: now }, // Should have started by now
              },
            ],
          },
          toWorkUnit: {
            status: WorkUnitStatus.NOT_STARTED,
            plannedStart: { lte: lookaheadDate },
          },
        },
        include: {
          fromWorkUnit: {
            include: {
              project: { select: { id: true, projectNumber: true } },
            },
          },
          toWorkUnit: {
            include: {
              project: { select: { id: true, projectNumber: true } },
              owner: { select: { name: true } },
            },
          },
        },
      });

      for (const dep of dependencies) {
        result.risksDetected++;

        const daysUntilStart = Math.ceil(
          (dep.toWorkUnit.plannedStart.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Determine severity
        let severity: RiskSeverity;
        if (daysUntilStart <= 2) {
          severity = RiskSeverity.CRITICAL;
        } else if (daysUntilStart <= 4) {
          severity = RiskSeverity.HIGH;
        } else {
          severity = RiskSeverity.MEDIUM;
        }

        const upstreamStatus = dep.fromWorkUnit.status === WorkUnitStatus.BLOCKED
          ? 'blocked'
          : 'delayed';

        const fingerprint = this.generateFingerprint(
          RiskType.DEPENDENCY,
          [dep.fromWorkUnitId, dep.toWorkUnitId],
          'cascade'
        );

        const projectIds = [...new Set([dep.fromWorkUnit.projectId, dep.toWorkUnit.projectId])];

        const { created } = await this.createRiskEvent(
          {
            severity,
            type: RiskType.DEPENDENCY,
            affectedProjectIds: projectIds,
            affectedWorkUnitIds: [dep.fromWorkUnitId, dep.toWorkUnitId],
            reason: `Upstream WorkUnit "${dep.fromWorkUnit.referenceModule}:${dep.fromWorkUnit.referenceId}" is ${upstreamStatus}. Downstream "${dep.toWorkUnit.referenceModule}:${dep.toWorkUnit.referenceId}" is scheduled to start in ${daysUntilStart} days but cannot proceed.`,
            recommendedAction: `Resolve ${upstreamStatus} status on ${dep.fromWorkUnit.referenceModule}:${dep.fromWorkUnit.referenceId} immediately. Consider rescheduling ${dep.toWorkUnit.referenceModule}:${dep.toWorkUnit.referenceId} or finding alternative approach. Notify ${dep.toWorkUnit.owner.name}.`,
            metadata: {
              upstreamWorkUnitId: dep.fromWorkUnitId,
              downstreamWorkUnitId: dep.toWorkUnitId,
              upstreamStatus,
              daysUntilDownstreamStart: daysUntilStart,
              dependencyType: dep.dependencyType,
            },
          },
          fingerprint
        );

        if (created) {
          result.risksCreated++;
        } else {
          result.risksAlreadyExist++;
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * RULE 3: Capacity Overload Risk
   * 
   * Condition: Resource utilization exceeds CAPACITY_OVERLOAD_THRESHOLD
   * Severity: Based on overload amount
   *   - 100-120%: MEDIUM
   *   - 120-150%: HIGH
   *   - 150%+: CRITICAL
   */
  static async evaluateCapacityOverloadRisk(): Promise<RuleEvaluationResult> {
    const result: RuleEvaluationResult = {
      ruleName: 'Capacity Overload Risk',
      risksDetected: 0,
      risksCreated: 0,
      risksAlreadyExist: 0,
      errors: [],
    };

    try {
      const now = new Date();
      const fourWeeksLater = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

      // Get all active resource capacities
      const resources = await prisma.resourceCapacity.findMany({
        where: { isActive: true },
      });

      for (const resource of resources) {
        // Calculate weekly load for next 4 weeks
        let currentWeekStart = this.getWeekStart(now);

        while (currentWeekStart < fourWeeksLater) {
          const weekEnd = this.getWeekEnd(currentWeekStart);

          // Get WorkUnits that overlap with this week
          const workUnits = await this.getWorkUnitsForResourceWeek(
            resource.resourceType,
            currentWeekStart,
            weekEnd
          );

          if (workUnits.length === 0) {
            currentWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            continue;
          }

          // Calculate load
          const workingDays = this.getWorkingDays(currentWeekStart, weekEnd, resource.workingDaysPerWeek);
          const weeklyCapacity = resource.capacityPerDay * workingDays;
          
          let weeklyLoad = 0;
          for (const wu of workUnits) {
            const overlapDays = this.getOverlapDays(wu.plannedStart, wu.plannedEnd, currentWeekStart, weekEnd);
            weeklyLoad += overlapDays * 8; // 8 hours per day default
          }

          const utilizationPercent = weeklyCapacity > 0 ? (weeklyLoad / weeklyCapacity) * 100 : 0;

          if (utilizationPercent >= CONFIG.CAPACITY_OVERLOAD_THRESHOLD) {
            result.risksDetected++;

            // Determine severity
            let severity: RiskSeverity;
            if (utilizationPercent >= 150) {
              severity = RiskSeverity.CRITICAL;
            } else if (utilizationPercent >= 120) {
              severity = RiskSeverity.HIGH;
            } else {
              severity = RiskSeverity.MEDIUM;
            }

            const weekNumber = this.getWeekNumber(currentWeekStart);
            const year = currentWeekStart.getFullYear();

            const fingerprint = this.generateFingerprint(
              RiskType.OVERLOAD,
              workUnits.map((wu) => wu.id),
              `${resource.id}:${year}:${weekNumber}`
            );

            const projectIds = [...new Set(workUnits.map((wu) => wu.projectId))];
            const workUnitIds = workUnits.map((wu) => wu.id);

            const { created } = await this.createRiskEvent(
              {
                severity,
                type: RiskType.OVERLOAD,
                affectedProjectIds: projectIds,
                affectedWorkUnitIds: workUnitIds,
                reason: `Resource "${resource.resourceName}" (${resource.resourceType}) is overloaded in week ${weekNumber} of ${year}. Utilization: ${Math.round(utilizationPercent)}% (${Math.round(weeklyLoad)} ${resource.unit} planned vs ${Math.round(weeklyCapacity)} ${resource.unit} capacity).`,
                recommendedAction: `Redistribute workload for ${resource.resourceName}. Consider: (1) Rescheduling ${workUnits.length} WorkUnits, (2) Adding temporary resources, (3) Prioritizing critical items and deferring others.`,
                metadata: {
                  resourceId: resource.id,
                  resourceType: resource.resourceType,
                  weekNumber,
                  year,
                  utilizationPercent: Math.round(utilizationPercent),
                  plannedLoad: Math.round(weeklyLoad),
                  capacity: Math.round(weeklyCapacity),
                  affectedWorkUnitCount: workUnits.length,
                },
              },
              fingerprint
            );

            if (created) {
              result.risksCreated++;
            } else {
              result.risksAlreadyExist++;
            }
          }

          currentWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * RULE 4: Critical Path Delay Risk
   * 
   * Condition: WorkUnit on a long dependency chain (depth >= CRITICAL_PATH_MIN_DEPTH)
   *            is delayed or blocked
   * Severity: Based on chain depth and delay
   *   - Depth 5+, blocked: CRITICAL
   *   - Depth 5+, delayed: HIGH
   *   - Depth 3-4: MEDIUM
   */
  static async evaluateCriticalPathDelayRisk(): Promise<RuleEvaluationResult> {
    const result: RuleEvaluationResult = {
      ruleName: 'Critical Path Delay Risk',
      risksDetected: 0,
      risksCreated: 0,
      risksAlreadyExist: 0,
      errors: [],
    };

    try {
      const now = new Date();

      // Get all delayed or blocked WorkUnits
      const delayedWorkUnits = await prisma.workUnit.findMany({
        where: {
          OR: [
            { status: WorkUnitStatus.BLOCKED },
            {
              status: WorkUnitStatus.IN_PROGRESS,
              plannedEnd: { lt: now },
            },
            {
              status: WorkUnitStatus.NOT_STARTED,
              plannedStart: { lt: now },
            },
          ],
        },
        include: {
          project: { select: { id: true, projectNumber: true } },
        },
      });

      for (const wu of delayedWorkUnits) {
        // Calculate downstream chain depth
        const chainDepth = await this.getDownstreamChainDepth(wu.id);

        if (chainDepth >= CONFIG.CRITICAL_PATH_MIN_DEPTH) {
          result.risksDetected++;

          // Determine severity
          let severity: RiskSeverity;
          if (chainDepth >= 5 && wu.status === WorkUnitStatus.BLOCKED) {
            severity = RiskSeverity.CRITICAL;
          } else if (chainDepth >= 5) {
            severity = RiskSeverity.HIGH;
          } else {
            severity = RiskSeverity.MEDIUM;
          }

          const fingerprint = this.generateFingerprint(
            RiskType.BOTTLENECK,
            [wu.id],
            `critical_path:${chainDepth}`
          );

          const statusText = wu.status === WorkUnitStatus.BLOCKED ? 'blocked' : 'delayed';

          const { created } = await this.createRiskEvent(
            {
              severity,
              type: RiskType.BOTTLENECK,
              affectedProjectIds: [wu.projectId],
              affectedWorkUnitIds: [wu.id],
              reason: `WorkUnit "${wu.referenceModule}:${wu.referenceId}" in project ${wu.project.projectNumber} is ${statusText} and sits on a critical path with ${chainDepth} downstream dependencies. This delay will cascade to multiple subsequent work items.`,
              recommendedAction: `Prioritize resolution of ${wu.referenceModule}:${wu.referenceId} immediately. This is a bottleneck affecting ${chainDepth} downstream WorkUnits. Consider escalation and resource reallocation.`,
              metadata: {
                chainDepth,
                status: wu.status,
                projectNumber: wu.project.projectNumber,
              },
            },
            fingerprint
          );

          if (created) {
            result.risksCreated++;
          } else {
            result.risksAlreadyExist++;
          }
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Run all rules and return aggregated results
   */
  static async runAllRules(): Promise<EngineRunResult> {
    const startTime = Date.now();

    const ruleResults = await Promise.all([
      this.evaluateLateStartRisk(),
      this.evaluateDependencyCascadeRisk(),
      this.evaluateCapacityOverloadRisk(),
      this.evaluateCriticalPathDelayRisk(),
    ]);

    const totalRisksDetected = ruleResults.reduce((sum, r) => sum + r.risksDetected, 0);
    const totalRisksCreated = ruleResults.reduce((sum, r) => sum + r.risksCreated, 0);

    return {
      runAt: new Date(),
      totalRisksDetected,
      totalRisksCreated,
      ruleResults,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get all active (unresolved) RiskEvents
   */
  static async getActiveRisks(filters: {
    severity?: RiskSeverity;
    type?: RiskType;
    projectId?: string;
  } = {}) {
    const where: Record<string, unknown> = {
      resolvedAt: null,
    };

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.projectId) {
      where.affectedProjectIds = {
        array_contains: filters.projectId,
      };
    }

    return prisma.riskEvent.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' },
      ],
    });
  }

  /**
   * Resolve a RiskEvent
   */
  static async resolveRisk(id: string) {
    const existing = await prisma.riskEvent.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`RiskEvent with ID ${id} not found`);
    }

    if (existing.resolvedAt) {
      throw new Error(`RiskEvent with ID ${id} is already resolved`);
    }

    return prisma.riskEvent.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
  }

  /**
   * Get RiskEvent by ID
   */
  static async getById(id: string) {
    const riskEvent = await prisma.riskEvent.findUnique({
      where: { id },
    });

    if (!riskEvent) {
      throw new Error(`RiskEvent with ID ${id} not found`);
    }

    return riskEvent;
  }

  /**
   * Get risk summary statistics
   */
  static async getRiskSummary() {
    const [bySeverity, byType, recentlyResolved] = await Promise.all([
      prisma.riskEvent.groupBy({
        by: ['severity'],
        where: { resolvedAt: null },
        _count: { id: true },
      }),
      prisma.riskEvent.groupBy({
        by: ['type'],
        where: { resolvedAt: null },
        _count: { id: true },
      }),
      prisma.riskEvent.count({
        where: {
          resolvedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const totalActive = bySeverity.reduce((sum, s) => sum + s._count.id, 0);

    return {
      totalActive,
      recentlyResolved,
      bySeverity: bySeverity.map((s) => ({
        severity: s.severity,
        count: s._count.id,
      })),
      byType: byType.map((t) => ({
        type: t.type,
        count: t._count.id,
      })),
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private static getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private static getWorkingDays(startDate: Date, endDate: Date, workingDaysPerWeek: number = 5): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (workingDaysPerWeek === 7 ||
          (workingDaysPerWeek === 6 && dayOfWeek !== 0) ||
          (workingDaysPerWeek === 5 && dayOfWeek !== 0 && dayOfWeek !== 6)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  private static getOverlapDays(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): number {
    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

    if (overlapStart > overlapEnd) return 0;

    return this.getWorkingDays(overlapStart, overlapEnd);
  }

  private static async getWorkUnitsForResourceWeek(
    resourceType: string,
    weekStart: Date,
    weekEnd: Date
  ) {
    // Map resource type to work unit types
    const typeMap: Record<string, string[]> = {
      DESIGNER: ['DESIGN', 'DOCUMENTATION'],
      LASER: ['PRODUCTION'],
      WELDER: ['PRODUCTION'],
      QC: ['QC'],
      PROCUREMENT: ['PROCUREMENT'],
    };

    const workUnitTypes = typeMap[resourceType] || [];

    return prisma.workUnit.findMany({
      where: {
        type: { in: workUnitTypes as never[] },
        status: { in: [WorkUnitStatus.NOT_STARTED, WorkUnitStatus.IN_PROGRESS] },
        OR: [
          { plannedStart: { gte: weekStart, lte: weekEnd } },
          { plannedEnd: { gte: weekStart, lte: weekEnd } },
          { AND: [{ plannedStart: { lte: weekStart } }, { plannedEnd: { gte: weekEnd } }] },
        ],
      },
      select: {
        id: true,
        projectId: true,
        plannedStart: true,
        plannedEnd: true,
      },
    });
  }

  private static async getDownstreamChainDepth(workUnitId: string): Promise<number> {
    let maxDepth = 0;
    const visited = new Set<string>();

    const traverse = async (currentId: string, depth: number) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      if (depth > maxDepth) maxDepth = depth;

      const successors = await prisma.workUnitDependency.findMany({
        where: { fromWorkUnitId: currentId },
        select: { toWorkUnitId: true },
      });

      for (const s of successors) {
        await traverse(s.toWorkUnitId, depth + 1);
      }
    };

    await traverse(workUnitId, 0);
    return maxDepth;
  }
}

export default EarlyWarningEngineService;
