/**
 * Leading Indicators Service
 * 
 * SIMPLIFIED RISK DETECTION - Works directly with existing data
 * No WorkUnit setup required. Scans Tasks, WorkOrders, Procurement, Schedules directly.
 * 
 * This is how aviation and oil & gas systems work:
 * - Detect problems BEFORE they happen
 * - Show leading indicators, not lagging metrics
 * - Auto-detect without manual configuration
 * 
 * RULES:
 * 1. 🔴 Tasks not started X days before due date
 * 2. 🟠 Upstream delay impacting downstream work
 * 3. 🔴 Overloaded resource (designer, engineer, vendor)
 * 4. 🟠 Procurement items not delivered but required soon
 * 5. 🔴 Schedule slippage - actual vs planned
 */

import { prisma } from '@/lib/prisma';

// ============================================
// TYPES
// ============================================

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type RiskCategory = 'task_delay' | 'cascade_risk' | 'resource_overload' | 'procurement_risk' | 'schedule_slip' | 'capacity_overload';

export interface LeadingIndicator {
  id: string;
  level: RiskLevel;
  category: RiskCategory;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  affectedItems: {
    type: string;
    id: string;
    name: string;
    link: string;
  }[];
  project?: {
    id: string;
    projectNumber: string;
    name: string;
  };
  detectedAt: Date;
  daysUntilImpact?: number;
  metadata?: Record<string, unknown>;
}

export interface LeadingIndicatorsSummary {
  totalRisks: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: {
    task_delay: number;
    cascade_risk: number;
    resource_overload: number;
    procurement_risk: number;
    schedule_slip: number;
    capacity_overload: number;
  };
  indicators: LeadingIndicator[];
  generatedAt: Date;
}

// ============================================
// CONFIGURATION - Easily adjustable thresholds
// ============================================

const CONFIG = {
  // Task not started when X% of time has elapsed
  TASK_LATE_START_CRITICAL: 60, // 60% elapsed = CRITICAL
  TASK_LATE_START_HIGH: 40,     // 40% elapsed = HIGH
  TASK_LATE_START_MEDIUM: 25,   // 25% elapsed = MEDIUM
  
  // Days before due date to flag unstarted tasks
  TASK_DUE_SOON_DAYS: 7,
  
  // Resource overload threshold (tasks assigned)
  RESOURCE_OVERLOAD_CRITICAL: 10, // 10+ active tasks
  RESOURCE_OVERLOAD_HIGH: 7,      // 7+ active tasks
  RESOURCE_OVERLOAD_MEDIUM: 5,    // 5+ active tasks
  
  // Procurement lead time warning (days)
  PROCUREMENT_URGENT_DAYS: 7,     // Required within 7 days
  PROCUREMENT_WARNING_DAYS: 14,   // Required within 14 days
  
  // Schedule slippage threshold (days)
  SCHEDULE_SLIP_CRITICAL: 14,     // 14+ days behind
  SCHEDULE_SLIP_HIGH: 7,          // 7+ days behind
  SCHEDULE_SLIP_MEDIUM: 3,        // 3+ days behind
};

// ============================================
// SERVICE CLASS
// ============================================

export class LeadingIndicatorsService {
  
  /**
   * Get all leading indicators - main entry point
   */
  static async getAll(): Promise<LeadingIndicatorsSummary> {
    const now = new Date();
    
    // Run all detection rules in parallel
    const [
      taskDelays,
      resourceOverloads,
      procurementRisks,
      scheduleSlips,
      cascadeRisks,
      capacityRisks,
    ] = await Promise.all([
      this.detectTaskDelays(),
      this.detectResourceOverloads(),
      this.detectProcurementRisks(),
      this.detectScheduleSlips(),
      this.detectCascadeRisks(),
      this.detectCapacityOverloadRisks(),
    ]);
    
    // Combine all indicators
    const allIndicators = [
      ...taskDelays,
      ...resourceOverloads,
      ...procurementRisks,
      ...scheduleSlips,
      ...cascadeRisks,
      ...capacityRisks,
    ];
    
    // Sort by severity (critical first) then by days until impact
    allIndicators.sort((a, b) => {
      const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (levelOrder[a.level] !== levelOrder[b.level]) {
        return levelOrder[a.level] - levelOrder[b.level];
      }
      return (a.daysUntilImpact || 999) - (b.daysUntilImpact || 999);
    });
    
    // Calculate summary
    const summary: LeadingIndicatorsSummary = {
      totalRisks: allIndicators.length,
      critical: allIndicators.filter(i => i.level === 'critical').length,
      high: allIndicators.filter(i => i.level === 'high').length,
      medium: allIndicators.filter(i => i.level === 'medium').length,
      low: allIndicators.filter(i => i.level === 'low').length,
      byCategory: {
        task_delay: taskDelays.length,
        cascade_risk: cascadeRisks.length,
        resource_overload: resourceOverloads.length,
        procurement_risk: procurementRisks.length,
        schedule_slip: scheduleSlips.length,
        capacity_overload: capacityRisks.length,
      },
      indicators: allIndicators,
      generatedAt: now,
    };
    
    return summary;
  }
  
  /**
   * RULE 1: Detect tasks not started but due soon
   * 
   * Logic:
   * - Task status is not "Completed" or "In Progress"
   * - Due date is approaching
   * - Calculate % of planned time elapsed
   */
  static async detectTaskDelays(): Promise<LeadingIndicator[]> {
    const indicators: LeadingIndicator[] = [];
    const now = new Date();
    
    try {
      // Get all incomplete tasks with due dates
      const tasks = await prisma.task.findMany({
        where: {
          status: { notIn: ['Completed', 'Cancelled'] },
          dueDate: { not: null },
        },
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
          building: { select: { id: true, designation: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      });
      
      for (const task of tasks) {
        if (!task.dueDate) continue;
        
        const startDate = task.taskInputDate || task.createdAt;
        const dueDate = new Date(task.dueDate);
        const totalDuration = dueDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const elapsedPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Skip if already past due (that's a different metric)
        if (daysUntilDue < 0) continue;
        
        // Only flag if task is NOT started (not "In Progress")
        const isNotStarted = task.status === 'Pending' || task.status === 'Not Started';
        if (!isNotStarted) continue;
        
        // Determine risk level
        let level: RiskLevel | null = null;
        if (elapsedPercent >= CONFIG.TASK_LATE_START_CRITICAL) {
          level = 'critical';
        } else if (elapsedPercent >= CONFIG.TASK_LATE_START_HIGH) {
          level = 'high';
        } else if (elapsedPercent >= CONFIG.TASK_LATE_START_MEDIUM && daysUntilDue <= CONFIG.TASK_DUE_SOON_DAYS) {
          level = 'medium';
        }
        
        if (level) {
          indicators.push({
            id: `task-delay-${task.id}`,
            level,
            category: 'task_delay',
            title: `Task "${task.title}" not started`,
            description: `${Math.round(elapsedPercent)}% of planned time has elapsed but task hasn't started. Due in ${daysUntilDue} days.`,
            impact: `May miss deadline on ${dueDate.toLocaleDateString()}. ${task.building ? `Affects ${task.building.designation}.` : ''}`,
            recommendation: task.assignedTo 
              ? `Contact ${task.assignedTo.name} to start immediately or reassign.`
              : `Assign this task to someone and start immediately.`,
            affectedItems: [{
              type: 'Task',
              id: task.id,
              name: task.title,
              link: `/tasks/${task.id}`,
            }],
            project: task.project ? {
              id: task.project.id,
              projectNumber: task.project.projectNumber,
              name: task.project.name,
            } : undefined,
            detectedAt: now,
            daysUntilImpact: daysUntilDue,
            metadata: {
              elapsedPercent: Math.round(elapsedPercent),
              daysUntilDue,
              assignedTo: task.assignedTo?.name,
              department: task.department?.name,
            },
          });
        }
      }
    } catch (error) {
      console.error('[LeadingIndicators] Error detecting task delays:', error);
    }
    
    return indicators;
  }
  
  /**
   * RULE 2: Detect resource overload
   * 
   * Logic:
   * - Count active tasks per user
   * - Flag users with too many concurrent tasks
   */
  static async detectResourceOverloads(): Promise<LeadingIndicator[]> {
    const indicators: LeadingIndicator[] = [];
    const now = new Date();
    
    try {
      // Get task counts per user
      const userTaskCounts = await prisma.task.groupBy({
        by: ['assignedToId'],
        where: {
          status: { notIn: ['Completed', 'Cancelled'] },
          assignedToId: { not: null },
        },
        _count: { id: true },
      });
      
      // Get user details for overloaded users
      for (const utc of userTaskCounts) {
        if (!utc.assignedToId) continue;
        
        const taskCount = utc._count.id;
        let level: RiskLevel | null = null;
        
        if (taskCount >= CONFIG.RESOURCE_OVERLOAD_CRITICAL) {
          level = 'critical';
        } else if (taskCount >= CONFIG.RESOURCE_OVERLOAD_HIGH) {
          level = 'high';
        } else if (taskCount >= CONFIG.RESOURCE_OVERLOAD_MEDIUM) {
          level = 'medium';
        }
        
        if (level) {
          const user = await prisma.user.findUnique({
            where: { id: utc.assignedToId },
            select: { id: true, name: true, email: true, role: true },
          });
          
          if (user) {
            // Get the user's tasks for details
            const userTasks = await prisma.task.findMany({
              where: {
                assignedToId: user.id,
                status: { notIn: ['Completed', 'Cancelled'] },
              },
              select: { id: true, title: true, dueDate: true },
              orderBy: { dueDate: 'asc' },
              take: 5,
            });
            
            indicators.push({
              id: `resource-overload-${user.id}`,
              level,
              category: 'resource_overload',
              title: `${user.name} is overloaded`,
              description: `${taskCount} active tasks assigned. This exceeds safe capacity and increases risk of delays.`,
              impact: `Quality may suffer. Deadlines at risk. Team member burnout possible.`,
              recommendation: `Review ${user.name}'s workload. Redistribute tasks or extend deadlines.`,
              affectedItems: userTasks.map(t => ({
                type: 'Task',
                id: t.id,
                name: t.title,
                link: `/tasks/${t.id}`,
              })),
              detectedAt: now,
              metadata: {
                taskCount,
                userName: user.name,
                userRole: user.role,
              },
            });
          }
        }
      }
      
      // Also check WorkOrder assignments (production engineers)
      const engineerWorkOrderCounts = await prisma.workOrder.groupBy({
        by: ['productionEngineerId'],
        where: {
          status: { notIn: ['Completed', 'Cancelled'] },
        },
        _count: { id: true },
      });
      
      for (const ewc of engineerWorkOrderCounts) {
        if (!ewc.productionEngineerId) continue;
        
        const woCount = ewc._count.id;
        // Use lower thresholds for work orders (they're bigger)
        let level: RiskLevel | null = null;
        
        if (woCount >= 5) {
          level = 'critical';
        } else if (woCount >= 4) {
          level = 'high';
        } else if (woCount >= 3) {
          level = 'medium';
        }
        
        if (level) {
          const engineer = await prisma.user.findUnique({
            where: { id: ewc.productionEngineerId },
            select: { id: true, name: true },
          });
          
          if (engineer) {
            indicators.push({
              id: `engineer-overload-${engineer.id}`,
              level,
              category: 'resource_overload',
              title: `Production Engineer ${engineer.name} overloaded`,
              description: `${woCount} active work orders assigned. Production capacity at risk.`,
              impact: `Work orders may be delayed. Quality control issues possible.`,
              recommendation: `Redistribute work orders or add production support.`,
              affectedItems: [{
                type: 'User',
                id: engineer.id,
                name: engineer.name,
                link: `/users/${engineer.id}`,
              }],
              detectedAt: now,
              metadata: {
                workOrderCount: woCount,
                engineerName: engineer.name,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('[LeadingIndicators] Error detecting resource overloads:', error);
    }
    
    return indicators;
  }
  
  /**
   * RULE 3: Detect procurement risks
   * 
   * Logic:
   * - Materials not delivered but required for upcoming work
   * - Purchase orders pending but fabrication starting soon
   */
  static async detectProcurementRisks(): Promise<LeadingIndicator[]> {
    const indicators: LeadingIndicator[] = [];
    const now = new Date();
    
    try {
      // Check for work orders starting soon without materials
      const upcomingWorkOrders = await prisma.workOrder.findMany({
        where: {
          status: 'Pending',
          plannedStartDate: {
            gte: now,
            lte: new Date(now.getTime() + CONFIG.PROCUREMENT_WARNING_DAYS * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
          building: { select: { id: true, designation: true } },
        },
      });
      
      for (const wo of upcomingWorkOrders) {
        const daysUntilStart = Math.ceil(
          (new Date(wo.plannedStartDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Check if there are pending procurement tasks for this building
        const pendingProcurement = await prisma.task.findMany({
          where: {
            buildingId: wo.buildingId,
            department: { name: { contains: 'Procurement' } },
            status: { notIn: ['Completed', 'Cancelled'] },
          },
          include: {
            department: { select: { name: true } },
          },
        });
        
        if (pendingProcurement.length > 0) {
          let level: RiskLevel = 'medium';
          if (daysUntilStart <= 3) {
            level = 'critical';
          } else if (daysUntilStart <= CONFIG.PROCUREMENT_URGENT_DAYS) {
            level = 'high';
          }
          
          indicators.push({
            id: `procurement-risk-${wo.id}`,
            level,
            category: 'procurement_risk',
            title: `Procurement pending for ${wo.workOrderNumber}`,
            description: `Work order starts in ${daysUntilStart} days but ${pendingProcurement.length} procurement task(s) still pending.`,
            impact: `Production may be delayed waiting for materials.`,
            recommendation: `Expedite procurement or delay work order start date.`,
            affectedItems: [
              {
                type: 'WorkOrder',
                id: wo.id,
                name: wo.workOrderNumber,
                link: `/production/work-orders/${wo.id}`,
              },
              ...pendingProcurement.map(p => ({
                type: 'Task',
                id: p.id,
                name: p.title,
                link: `/tasks/${p.id}`,
              })),
            ],
            project: wo.project ? {
              id: wo.project.id,
              projectNumber: wo.project.projectNumber,
              name: wo.project.name,
            } : undefined,
            detectedAt: now,
            daysUntilImpact: daysUntilStart,
            metadata: {
              workOrderNumber: wo.workOrderNumber,
              pendingProcurementCount: pendingProcurement.length,
              daysUntilStart,
            },
          });
        }
      }
    } catch (error) {
      console.error('[LeadingIndicators] Error detecting procurement risks:', error);
    }
    
    return indicators;
  }
  
  /**
   * RULE 4: Detect schedule slippage
   * 
   * Logic:
   * - Compare actual progress vs planned progress
   * - Flag projects/buildings behind schedule
   */
  static async detectScheduleSlips(): Promise<LeadingIndicator[]> {
    const indicators: LeadingIndicator[] = [];
    const now = new Date();
    
    try {
      // Check scope schedules for slippage
      const schedules = await prisma.scopeSchedule.findMany({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
        include: {
          building: {
            include: {
              project: { select: { id: true, projectNumber: true, name: true } },
            },
          },
        },
      });
      
      for (const schedule of schedules) {
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const expectedProgress = (elapsed / totalDuration) * 100;
        
        // Calculate actual progress based on production logs for this building/scope
        let actualProgress = 0;
        
        if (schedule.scopeType.toLowerCase() === 'fabrication') {
          // Get actual progress from production logs (weight-based calculation)
          const assemblyParts = await prisma.assemblyPart.findMany({
            where: { buildingId: schedule.buildingId },
            select: {
              id: true,
              netWeightTotal: true,
              quantity: true,
              productionLogs: {
                select: {
                  processedQty: true,
                  remainingQty: true,
                },
                orderBy: { dateProcessed: 'desc' },
                take: 1, // Get latest log per part
              },
            },
          });
          
          if (assemblyParts.length > 0) {
            // Calculate total required weight
            const requiredWeight = assemblyParts.reduce(
              (sum, part) => sum + (Number(part.netWeightTotal) || 0),
              0
            );
            
            // Calculate produced weight from production logs
            let producedWeight = 0;
            assemblyParts.forEach(part => {
              const partWeight = Number(part.netWeightTotal) || 0;
              const partQty = part.quantity || 1;
              
              if (part.productionLogs.length > 0) {
                const latestLog = part.productionLogs[0];
                if (latestLog.remainingQty === 0) {
                  producedWeight += partWeight;
                } else {
                  const processedRatio = latestLog.processedQty / partQty;
                  producedWeight += partWeight * processedRatio;
                }
              }
            });
            
            actualProgress = requiredWeight > 0 ? (producedWeight / requiredWeight) * 100 : 0;
          }
        } else {
          // For other scopes (design, procurement, etc.), check task completion
          const tasks = await prisma.task.findMany({
            where: {
              buildingId: schedule.buildingId,
              department: { name: { contains: schedule.scopeType } },
            },
            select: { status: true },
          });
          
          if (tasks.length > 0) {
            const completedTasks = tasks.filter(t => t.status === 'Completed').length;
            actualProgress = (completedTasks / tasks.length) * 100;
          } else if (endDate < now) {
            actualProgress = 50; // Assume 50% if overdue and no other data
          }
        }
        
        const slippage = expectedProgress - actualProgress;
        
        if (slippage > 0) {
          // Calculate days behind
          const daysBehind = Math.round((slippage / 100) * (totalDuration / (1000 * 60 * 60 * 24)));
          
          let level: RiskLevel | null = null;
          if (daysBehind >= CONFIG.SCHEDULE_SLIP_CRITICAL) {
            level = 'critical';
          } else if (daysBehind >= CONFIG.SCHEDULE_SLIP_HIGH) {
            level = 'high';
          } else if (daysBehind >= CONFIG.SCHEDULE_SLIP_MEDIUM) {
            level = 'medium';
          }
          
          if (level) {
            indicators.push({
              id: `schedule-slip-${schedule.id}`,
              level,
              category: 'schedule_slip',
              title: `${schedule.building.name || schedule.building.designation} ${schedule.scopeType} behind schedule`,
              description: `Expected ${Math.round(expectedProgress)}% complete, actual ${Math.round(actualProgress)}%. Approximately ${daysBehind} days behind.`,
              impact: `May miss ${schedule.scopeType} deadline of ${endDate.toLocaleDateString()}.`,
              recommendation: `Review blockers. Consider adding resources or adjusting timeline.`,
              affectedItems: [{
                type: 'Building',
                id: schedule.buildingId,
                name: schedule.building.name || schedule.building.designation,
                link: `/projects/${schedule.building.projectId}/buildings/${schedule.buildingId}`,
              }],
              project: schedule.building.project ? {
                id: schedule.building.project.id,
                projectNumber: schedule.building.project.projectNumber,
                name: schedule.building.project.name,
              } : undefined,
              detectedAt: now,
              daysUntilImpact: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
              metadata: {
                scopeType: schedule.scopeType,
                expectedProgress: Math.round(expectedProgress),
                actualProgress: Math.round(actualProgress),
                daysBehind,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('[LeadingIndicators] Error detecting schedule slips:', error);
    }
    
    return indicators;
  }
  
  /**
   * RULE 5: Detect cascade risks (upstream delays affecting downstream)
   * 
   * Logic:
   * - If design is delayed, fabrication will be delayed
   * - If fabrication is delayed, erection will be delayed
   */
  static async detectCascadeRisks(): Promise<LeadingIndicator[]> {
    const indicators: LeadingIndicator[] = [];
    const now = new Date();
    
    try {
      // Get buildings with multiple scope schedules
      const buildings = await prisma.building.findMany({
        where: {
          scopeSchedules: { some: {} },
        },
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
          scopeSchedules: {
            orderBy: { startDate: 'asc' },
          },
        },
      });
      
      // Define the workflow order
      const workflowOrder = ['design', 'procurement', 'fabrication', 'galvanizing', 'painting', 'delivery', 'erection'];
      
      for (const building of buildings) {
        const schedules = building.scopeSchedules;
        
        // Check each schedule against its downstream dependencies
        for (let i = 0; i < schedules.length; i++) {
          const currentSchedule = schedules[i];
          const currentIndex = workflowOrder.indexOf(currentSchedule.scopeType.toLowerCase());
          
          if (currentIndex === -1) continue;
          
          // Check if current schedule is delayed
          const currentEndDate = new Date(currentSchedule.endDate);
          const isDelayed = currentEndDate < now;
          
          if (isDelayed) {
            // Find downstream schedules that will be affected
            const downstreamSchedules = schedules.filter(s => {
              const sIndex = workflowOrder.indexOf(s.scopeType.toLowerCase());
              return sIndex > currentIndex;
            });
            
            if (downstreamSchedules.length > 0) {
              const delayDays = Math.ceil((now.getTime() - currentEndDate.getTime()) / (1000 * 60 * 60 * 24));
              
              let level: RiskLevel = 'medium';
              if (delayDays >= 14 || downstreamSchedules.length >= 3) {
                level = 'critical';
              } else if (delayDays >= 7 || downstreamSchedules.length >= 2) {
                level = 'high';
              }
              
              indicators.push({
                id: `cascade-risk-${currentSchedule.id}`,
                level,
                category: 'cascade_risk',
                title: `${currentSchedule.scopeType} delay cascading to ${downstreamSchedules.length} downstream phases`,
                description: `${building.name || building.designation} ${currentSchedule.scopeType} is ${delayDays} days overdue. This will delay: ${downstreamSchedules.map(s => s.scopeType).join(', ')}.`,
                impact: `${downstreamSchedules.length} downstream phase(s) at risk. Project timeline compromised.`,
                recommendation: `Prioritize completing ${currentSchedule.scopeType}. Notify stakeholders of potential delays.`,
                affectedItems: [
                  {
                    type: 'Schedule',
                    id: currentSchedule.id,
                    name: `${building.name || building.designation} - ${currentSchedule.scopeType}`,
                    link: `/projects/${building.projectId}/buildings/${building.id}`,
                  },
                  ...downstreamSchedules.map(s => ({
                    type: 'Schedule',
                    id: s.id,
                    name: `${building.name || building.designation} - ${s.scopeType}`,
                    link: `/projects/${building.projectId}/buildings/${building.id}`,
                  })),
                ],
                project: building.project ? {
                  id: building.project.id,
                  projectNumber: building.project.projectNumber,
                  name: building.project.name,
                } : undefined,
                detectedAt: now,
                metadata: {
                  delayedPhase: currentSchedule.scopeType,
                  delayDays,
                  affectedPhases: downstreamSchedules.map(s => s.scopeType),
                  buildingName: building.name || building.designation,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[LeadingIndicators] Error detecting cascade risks:', error);
    }
    
    return indicators;
  }
  
  /**
   * RULE 6: Detect capacity overload risks
   * 
   * Uses WorkUnits, Dependencies, and ResourceCapacity to generate specific messages like:
   * "You will be late in 9 days because welding capacity is exceeded by 37% due to 3 upstream delays"
   */
  static async detectCapacityOverloadRisks(): Promise<LeadingIndicator[]> {
    const indicators: LeadingIndicator[] = [];
    const now = new Date();
    
    try {
      // Get resource capacities
      const capacities = await prisma.resourceCapacity.findMany({
        where: { isActive: true },
      });
      
      if (capacities.length === 0) {
        return indicators;
      }
      
      // Get active work orders with weight
      const activeWorkOrders = await prisma.workOrder.findMany({
        where: {
          status: { in: ['Pending', 'In Progress'] },
        },
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
        },
      });
      
      // Calculate total load
      const totalProductionWeight = activeWorkOrders.reduce(
        (sum, wo) => sum + Number(wo.totalWeight || 0), 0
      ) / 1000;
      
      // Group capacities by type
      const capacityByType: Record<string, number> = {};
      for (const cap of capacities) {
        capacityByType[cap.resourceType] = (capacityByType[cap.resourceType] || 0) + cap.capacityPerDay;
      }
      
      // Check welding capacity
      const weldingCapacity = capacityByType['WELDER'] || 0;
      if (weldingCapacity > 0) {
        const workingDays = 30;
        const capacityAvailable = weldingCapacity * workingDays;
        const utilizationPercent = Math.round((totalProductionWeight / capacityAvailable) * 100);
        const overloadPercent = Math.max(0, utilizationPercent - 100);
        
        // Count upstream delays
        let upstreamDelays = 0;
        try {
          upstreamDelays = await prisma.workUnit.count({
            where: {
              status: { in: ['NOT_STARTED', 'BLOCKED'] },
              plannedEnd: { lt: now },
              type: { in: ['DESIGN', 'PROCUREMENT'] },
            },
          });
        } catch (e) { /* WorkUnit table might be empty */ }
        
        // Calculate days late
        const daysNeeded = totalProductionWeight / weldingCapacity;
        const daysLate = Math.max(0, Math.ceil(daysNeeded - workingDays));
        
        if (overloadPercent > 0 || daysLate > 0) {
          let level: RiskLevel = 'medium';
          if (overloadPercent >= 50 || daysLate >= 14) level = 'critical';
          else if (overloadPercent >= 25 || daysLate >= 7) level = 'high';
          
          let description = `Welding capacity at ${utilizationPercent}% utilization.`;
          if (daysLate > 0) {
            description = `You will be late by ${daysLate} days because welding capacity is exceeded by ${overloadPercent}%`;
            if (upstreamDelays > 0) {
              description += ` due to ${upstreamDelays} upstream delay${upstreamDelays > 1 ? 's' : ''}.`;
            } else {
              description += '.';
            }
          }
          
          indicators.push({
            id: 'capacity-overload-welding',
            level,
            category: 'capacity_overload',
            title: 'Welding capacity overloaded',
            description,
            impact: daysLate > 0 
              ? `Production schedule will slip by ${daysLate} days. ${activeWorkOrders.length} work orders affected.`
              : `Risk of delays if more work added. ${totalProductionWeight.toFixed(1)} tons in queue.`,
            recommendation: overloadPercent > 30
              ? `Add overtime or outsource ${Math.ceil(totalProductionWeight * overloadPercent / 100)} tons.`
              : 'Monitor closely. Redistribute work across stations.',
            affectedItems: activeWorkOrders.slice(0, 5).map(wo => ({
              type: 'WorkOrder',
              id: wo.id,
              name: wo.workOrderNumber,
              link: `/production/work-orders/${wo.id}`,
            })),
            detectedAt: now,
            daysUntilImpact: daysLate > 0 ? 0 : undefined,
            metadata: {
              utilizationPercent,
              overloadPercent,
              totalProductionWeight,
              weldingCapacityPerDay: weldingCapacity,
              daysLate,
              upstreamDelays,
            },
          });
        }
      }
    } catch (error) {
      console.error('[LeadingIndicators] Error detecting capacity overloads:', error);
    }
    
    return indicators;
  }
}

export default LeadingIndicatorsService;
