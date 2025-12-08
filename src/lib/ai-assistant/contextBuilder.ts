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
  if (role !== 'Admin' && role !== 'Manager') {
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
  if (role !== 'Admin' && role !== 'Manager') {
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
