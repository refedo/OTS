/**
 * AI Assistant Context Builder
 * Aggregates data from various OTS modules to provide context for AI responses
 */

import prisma from '@/lib/db';

export type ContextType = 'projects' | 'tasks' | 'kpis' | 'initiatives' | 'departments';

export interface AIContext {
  contextType: ContextType;
  timestamp: string;
  user: {
    id: string;
    name: string;
    role: string;
    department?: string;
  };
  hsps?: {
    objectives: any[];
    kpis: any[];
    initiatives: any[];
  };
  projects?: any[];
  tasks?: any[];
  production?: any[];
  qc?: {
    ncrs: any[];
    inspections: any[];
  };
  logistics?: any[];
  departments?: any[];
  // Predictive Operations Control System data
  predictiveOps?: {
    riskEvents: any[];
    riskSummary: {
      totalActive: number;
      bySeverity: { severity: string; count: number }[];
      byType: { type: string; count: number }[];
    };
    workUnits: any[];
    capacityOverloads: any[];
  };
}

/**
 * Build AI context based on user and context type
 * Simplified to provide general context based on role authority
 */
export async function buildAIContext(
  userId: string,
  contextType: ContextType
): Promise<AIContext> {
  // Fetch user information
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      department: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const context: AIContext = {
    contextType,
    timestamp: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      role: user.role.name,
      department: user.department?.name,
    },
  };

  // Provide comprehensive context based on role authority
  // Admin and Manager see everything, others see their own data
  try {
    // Always fetch core data
    const [hsps, projects, tasks, departments] = await Promise.allSettled([
      getHSPSContext(userId, user.role.name, user.departmentId),
      getProjectsContext(userId, user.role.name, user.departmentId),
      getTasksContext(userId, user.role.name),
      getDepartmentsContext(userId, user.role.name),
    ]);

    if (hsps.status === 'fulfilled') {
      context.hsps = hsps.value;
      console.log(`[AI Context] HSPS data: ${JSON.stringify(hsps.value).length} chars`);
    }
    if (projects.status === 'fulfilled') {
      context.projects = projects.value;
      console.log(`[AI Context] Projects: ${Array.isArray(projects.value) ? projects.value.length : 0} items`);
    }
    if (tasks.status === 'fulfilled') {
      context.tasks = tasks.value;
      console.log(`[AI Context] Tasks: ${Array.isArray(tasks.value) ? tasks.value.length : 0} items`);
    }
    if (departments.status === 'fulfilled') {
      context.departments = departments.value;
      console.log(`[AI Context] Departments: ${Array.isArray(departments.value) ? departments.value.length : 0} items`);
    }
    
    // Add production and QC data for relevant contexts
    if (['projects', 'kpis'].includes(contextType)) {
      const [production, qc] = await Promise.allSettled([
        getProductionContext(userId, user.role.name),
        getQCContext(userId, user.role.name),
      ]);
      
      if (production.status === 'fulfilled') context.production = production.value;
      if (qc.status === 'fulfilled') context.qc = qc.value;
    }

    // Always add Predictive Operations Control System data
    const predictiveOps = await getPredictiveOpsContext();
    if (predictiveOps) {
      context.predictiveOps = predictiveOps;
      console.log(`[AI Context] Predictive Ops: ${predictiveOps.riskEvents.length} risks, ${predictiveOps.workUnits.length} work units`);
    }
  } catch (error) {
    console.error('Error building context:', error);
    // Continue with partial context if some queries fail
  }

  return context;
}

/**
 * Get HSPS context (objectives, KPIs, initiatives)
 */
async function getHSPSContext(userId: string, role: string, departmentId?: string | null) {
  const currentYear = new Date().getFullYear();

  // Fetch Company Objectives
  const objectives = await prisma.companyObjective.findMany({
    where: { year: currentYear },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      progress: true,
      priority: true,
      owner: { select: { name: true } },
    },
    take: 10,
  });

  // Fetch Balanced Scorecard KPIs
  const kpis = await prisma.balancedScorecardKPI.findMany({
    where: { year: currentYear },
    select: {
      id: true,
      name: true,
      category: true,
      targetValue: true,
      currentValue: true,
      unit: true,
      frequency: true,
      status: true,
      owner: { select: { name: true } },
    },
    take: 20,
  });

  // Fetch Annual Initiatives
  const initiatives = await prisma.annualInitiative.findMany({
    where: { year: currentYear },
    select: {
      id: true,
      name: true,
      status: true,
      progress: true,
      startDate: true,
      endDate: true,
      owner: { select: { name: true } },
      department: { select: { name: true } },
    },
    take: 15,
  });

  return {
    objectives,
    kpis,
    initiatives,
  };
}

/**
 * Get Projects context
 */
async function getProjectsContext(userId: string, role: string, departmentId?: string | null) {
  const whereClause: any = {
    status: { in: ['Active', 'On-Hold'] }, // Focus on active projects
  };

  // Role-based filtering
  if (!['CEO', 'Admin', 'Manager'].includes(role)) {
    whereClause.OR = [
      { projectManagerId: userId },
      { salesEngineerId: userId },
    ];
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    select: {
      id: true,
      projectNumber: true,
      name: true,
      status: true,
      contractualTonnage: true,
      plannedStartDate: true,
      plannedEndDate: true,
      client: { select: { name: true } },
      projectManager: { select: { name: true } },
      buildings: {
        select: {
          designation: true,
          name: true,
        },
        take: 5,
      },
    },
    orderBy: { plannedStartDate: 'desc' },
    take: 10,
  });

  return projects;
}

/**
 * Get Tasks context
 */
async function getTasksContext(userId: string, role: string) {
  const whereClause: any = {};

  // Role-based filtering
  if (!['CEO', 'Admin', 'Manager'].includes(role)) {
    whereClause.assignedToId = userId;
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      taskInputDate: true,
      assignedTo: { 
        select: { 
          name: true,
          email: true,
        } 
      },
      createdBy: {
        select: {
          name: true,
        }
      },
      project: { 
        select: { 
          projectNumber: true, 
          name: true,
        } 
      },
      building: {
        select: {
          designation: true,
          name: true,
        }
      },
      department: { 
        select: { 
          name: true,
        } 
      },
    },
    orderBy: [
      { status: 'asc' },
      { priority: 'desc' },
      { dueDate: 'asc' },
    ],
    take: 20, // Reduced from 50 to save tokens
  });

  console.log(`[AI Context] Found ${tasks.length} tasks for user ${userId} (role: ${role})`);
  return tasks;
}

/**
 * Get Production context (last 30 days)
 */
async function getProductionContext(userId: string, role: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const productionLogs = await prisma.productionLog.findMany({
    where: {
      dateProcessed: { gte: thirtyDaysAgo },
    },
    select: {
      id: true,
      processType: true,
      dateProcessed: true,
      processedQty: true,
      remainingQty: true,
      qcStatus: true,
      assemblyPart: {
        select: {
          partDesignation: true,
          assemblyMark: true,
          name: true,
          project: {
            select: {
              projectNumber: true,
              name: true,
            },
          },
          building: {
            select: {
              designation: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { dateProcessed: 'desc' },
    take: 15, // Reduced from 30 to save tokens
  });

  console.log(`[AI Context] Found ${productionLogs.length} production logs`);
  return productionLogs;
}

/**
 * Get QC context (NCRs and inspections)
 */
async function getQCContext(userId: string, role: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch recent NCRs
  const ncrs = await prisma.nCRReport.findMany({
    where: {
      status: { in: ['Open', 'In Progress'] },
    },
    select: {
      id: true,
      ncrNumber: true,
      description: true,
      status: true,
      severity: true,
      deadline: true,
      project: { select: { projectNumber: true, name: true } },
      building: { select: { designation: true } },
      raisedBy: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10, // Reduced from 20 to save tokens
  });

  console.log(`[AI Context] Found ${ncrs.length} NCRs`);
  return {
    ncrs,
    inspections: [], // Can add material/welding/dimensional inspections if needed
  };
}

/**
 * Get Departments context
 */
async function getDepartmentsContext(userId: string, role: string) {
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      manager: { select: { name: true } },
      _count: {
        select: {
          users: true,
          tasks: true,
        },
      },
    },
  });

  return departments;
}

/**
 * Get Predictive Operations Control System context
 * Includes: RiskEvents, WorkUnits, Dependencies, Capacity analysis
 */
async function getPredictiveOpsContext() {
  try {
    // Get active (unresolved) risk events
    const riskEvents = await prisma.riskEvent.findMany({
      where: { resolvedAt: null },
      select: {
        id: true,
        severity: true,
        type: true,
        affectedProjectIds: true,
        affectedWorkUnitIds: true,
        reason: true,
        recommendedAction: true,
        detectedAt: true,
        metadata: true,
      },
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' },
      ],
      take: 20, // Limit to top 20 risks
    });

    // Get risk summary by severity and type
    const [bySeverity, byType] = await Promise.all([
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
    ]);

    const totalActive = bySeverity.reduce((sum, s) => sum + s._count.id, 0);

    // Get at-risk WorkUnits (not started but should have, or blocked)
    const now = new Date();
    const workUnits = await prisma.workUnit.findMany({
      where: {
        OR: [
          { status: 'BLOCKED' },
          {
            status: 'NOT_STARTED',
            plannedStart: { lt: now },
          },
          {
            status: 'IN_PROGRESS',
            plannedEnd: { lt: now },
          },
        ],
      },
      select: {
        id: true,
        type: true,
        referenceModule: true,
        referenceId: true,
        status: true,
        plannedStart: true,
        plannedEnd: true,
        actualStart: true,
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
          },
        },
        owner: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { plannedEnd: 'asc' },
      take: 15,
    });

    // Get capacity overloads (resources with high utilization)
    const capacityOverloads = await getCapacityOverloadsForAI();

    return {
      riskEvents: riskEvents.map((r) => ({
        ...r,
        // Parse JSON fields for readability
        affectedProjectIds: r.affectedProjectIds as string[],
        affectedWorkUnitIds: r.affectedWorkUnitIds as string[],
      })),
      riskSummary: {
        totalActive,
        bySeverity: bySeverity.map((s) => ({
          severity: s.severity,
          count: s._count.id,
        })),
        byType: byType.map((t) => ({
          type: t.type,
          count: t._count.id,
        })),
      },
      workUnits,
      capacityOverloads,
    };
  } catch (error) {
    console.error('Error fetching predictive ops context:', error);
    return null;
  }
}

/**
 * Get capacity overloads for AI context
 */
async function getCapacityOverloadsForAI() {
  try {
    const now = new Date();
    const fourWeeksLater = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

    // Get active resources
    const resources = await prisma.resourceCapacity.findMany({
      where: { isActive: true },
      select: {
        id: true,
        resourceType: true,
        resourceName: true,
        capacityPerDay: true,
        unit: true,
        workingDaysPerWeek: true,
      },
    });

    // For each resource, check if any week is overloaded
    const overloads: any[] = [];

    for (const resource of resources) {
      // Simplified: just check if there are WorkUnits that might cause overload
      // Full calculation is in ResourceCapacityService
      const workUnitTypes = getWorkUnitTypesForResource(resource.resourceType);
      
      const workUnitCount = await prisma.workUnit.count({
        where: {
          type: { in: workUnitTypes as any[] },
          status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
          plannedStart: { lte: fourWeeksLater },
          plannedEnd: { gte: now },
        },
      });

      // If there are many work units, flag as potential overload
      // This is a simplified heuristic for AI context
      const weeklyCapacity = resource.capacityPerDay * resource.workingDaysPerWeek;
      const estimatedWeeklyLoad = workUnitCount * 8; // Rough estimate

      if (estimatedWeeklyLoad > weeklyCapacity * 0.8) {
        overloads.push({
          resourceId: resource.id,
          resourceType: resource.resourceType,
          resourceName: resource.resourceName,
          unit: resource.unit,
          weeklyCapacity,
          estimatedLoad: estimatedWeeklyLoad,
          utilizationEstimate: Math.round((estimatedWeeklyLoad / weeklyCapacity) * 100),
          workUnitCount,
        });
      }
    }

    return overloads;
  } catch (error) {
    console.error('Error fetching capacity overloads:', error);
    return [];
  }
}

/**
 * Map resource type to work unit types
 */
function getWorkUnitTypesForResource(resourceType: string): string[] {
  const typeMap: Record<string, string[]> = {
    DESIGNER: ['DESIGN', 'DOCUMENTATION'],
    LASER: ['PRODUCTION'],
    WELDER: ['PRODUCTION'],
    QC: ['QC'],
    PROCUREMENT: ['PROCUREMENT'],
  };
  return typeMap[resourceType] || [];
}
