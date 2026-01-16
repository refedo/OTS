/**
 * KPI Formula Parser and Token Library
 * 
 * This module provides a token-based formula language for KPI calculations.
 * Tokens are placeholders that get replaced with actual SQL queries or values.
 */

import prisma from '@/lib/db';

// Token definitions mapping to database queries
export const TOKEN_LIBRARY = {
  // Production Tokens
  'PRODUCTION.PROCESSED_TONS_30D': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.assemblyPart = { projectId: entityId };
    } else if (entityType === 'department' && entityId) {
      where.createdBy = { departmentId: entityId };
    } else if (entityType === 'user' && entityId) {
      where.createdById = entityId;
    }

    const logs = await prisma.productionLog.findMany({
      where,
      include: { assemblyPart: true },
    });

    const totalTons = logs.reduce((sum, log) => {
      const weight = log.assemblyPart.weight || 0;
      const qty = log.processedQty || 0;
      return sum + (weight * qty / 1000); // Convert kg to tons
    }, 0);

    return totalTons;
  },

  'PRODUCTION.MAN_HOURS_30D': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.assemblyPart = { projectId: entityId };
    } else if (entityType === 'department' && entityId) {
      where.createdBy = { departmentId: entityId };
    } else if (entityType === 'user' && entityId) {
      where.createdById = entityId;
    }

    const logs = await prisma.productionLog.findMany({ where });
    return logs.reduce((sum, log) => sum + (log.manHours || 0), 0);
  },

  'PRODUCTION.LOGS_COUNT': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.assemblyPart = { projectId: entityId };
    } else if (entityType === 'department' && entityId) {
      where.createdBy = { departmentId: entityId };
    } else if (entityType === 'user' && entityId) {
      where.createdById = entityId;
    }

    return await prisma.productionLog.count({ where });
  },

  // QC Tokens
  'QC.NCR_OPEN_COUNT': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      status: 'Open',
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.projectId = entityId;
    } else if (entityType === 'department' && entityId) {
      where.raisedBy = { departmentId: entityId };
    } else if (entityType === 'user' && entityId) {
      where.raisedById = entityId;
    }

    return await prisma.nCRReport.count({ where });
  },

  'QC.NCR_TOTAL_COUNT': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.projectId = entityId;
    } else if (entityType === 'department' && entityId) {
      where.raisedBy = { departmentId: entityId };
    } else if (entityType === 'user' && entityId) {
      where.raisedById = entityId;
    }

    return await prisma.nCRReport.count({ where });
  },

  'QC.NCR_CLOSED_COUNT': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      status: 'Closed',
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.projectId = entityId;
    } else if (entityType === 'department' && entityId) {
      where.raisedBy = { departmentId: entityId };
    } else if (entityType === 'user' && entityId) {
      where.raisedById = entityId;
    }

    return await prisma.nCRReport.count({ where });
  },

  'QC.RFI_APPROVED_COUNT': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      status: 'Approved',
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.projectId = entityId;
    } else if (entityType === 'user' && entityId) {
      where.requestedById = entityId;
    }

    return await prisma.rFIRequest.count({ where });
  },

  'QC.RFI_TOTAL_COUNT': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.projectId = entityId;
    } else if (entityType === 'user' && entityId) {
      where.requestedById = entityId;
    }

    return await prisma.rFIRequest.count({ where });
  },

  // Project Tokens
  'PROJECT.COMPLETED_ON_TIME': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      status: 'Completed',
      updatedAt: { gte: periodStart, lte: periodEnd },
    };

    const projects = await prisma.project.findMany({
      where,
      include: {
        projectPlans: {
          where: { phase: 'Erection' },
        },
      },
    });

    return projects.filter(p => {
      const erectionPlan = p.projectPlans[0];
      if (!erectionPlan || !erectionPlan.actualEnd || !erectionPlan.plannedEnd) return false;
      return new Date(erectionPlan.actualEnd) <= new Date(erectionPlan.plannedEnd);
    }).length;
  },

  'PROJECT.COMPLETED_TOTAL': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    return await prisma.project.count({
      where: {
        status: 'Completed',
        updatedAt: { gte: periodStart, lte: periodEnd },
      },
    });
  },

  'PROJECT.ACTIVE_COUNT': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    return await prisma.project.count({
      where: {
        status: 'Active',
      },
    });
  },

  // Planning Tokens
  'PLANNING.PHASE_ADHERENCE': async (entityType: string, entityId: string | null, periodStart: Date, periodEnd: Date) => {
    const where: any = {
      updatedAt: { gte: periodStart, lte: periodEnd },
    };
    
    if (entityType === 'project' && entityId) {
      where.projectId = entityId;
    }

    const plans = await prisma.projectPlan.findMany({
      where: {
        ...where,
        actualEnd: { not: null },
        plannedEnd: { not: null },
      },
    });

    if (plans.length === 0) return 100;

    const onTimeCount = plans.filter(p => 
      new Date(p.actualEnd!) <= new Date(p.plannedEnd!)
    ).length;

    return (onTimeCount / plans.length) * 100;
  },
};

/**
 * Parse and evaluate a KPI formula
 */
export async function evaluateFormula(
  formula: string,
  entityType: string,
  entityId: string | null,
  periodStart: Date,
  periodEnd: Date
): Promise<{ value: number; rawValues: Record<string, number> }> {
  const rawValues: Record<string, number> = {};
  
  // Extract all tokens from the formula
  const tokenRegex = /\{([A-Z_\.]+)\}/g;
  const tokens = [...formula.matchAll(tokenRegex)].map(match => match[1]);
  
  // Evaluate each token
  for (const token of tokens) {
    const tokenKey = token as keyof typeof TOKEN_LIBRARY;
    if (TOKEN_LIBRARY[tokenKey]) {
      const value = await TOKEN_LIBRARY[tokenKey](entityType, entityId, periodStart, periodEnd);
      rawValues[token] = value;
    } else {
      console.warn(`Unknown token: ${token}`);
      rawValues[token] = 0;
    }
  }
  
  // Replace tokens in formula with actual values
  let evaluatedFormula = formula;
  for (const [token, value] of Object.entries(rawValues)) {
    evaluatedFormula = evaluatedFormula.replace(new RegExp(`\\{${token}\\}`, 'g'), value.toString());
  }
  
  // Evaluate the mathematical expression
  try {
    // Safe evaluation using Function constructor (be careful with user input!)
    const result = new Function(`return ${evaluatedFormula}`)();
    return {
      value: typeof result === 'number' ? result : 0,
      rawValues,
    };
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return { value: 0, rawValues };
  }
}

/**
 * Predefined KPI formulas
 */
export const PREDEFINED_FORMULAS = {
  PRODUCTION_PRODUCTIVITY: {
    code: 'PROD_PRODUCTIVITY',
    name: 'Production Productivity',
    description: 'Tons produced per man-hour',
    formula: '{PRODUCTION.PROCESSED_TONS_30D} / {PRODUCTION.MAN_HOURS_30D}',
    unit: 'tons/hr',
    target: 0.5,
  },
  NCR_CLOSURE_RATE: {
    code: 'QC_NCR_CLOSURE',
    name: 'NCR Closure Rate',
    description: 'Percentage of NCRs closed within period',
    formula: '({QC.NCR_CLOSED_COUNT} / {QC.NCR_TOTAL_COUNT}) * 100',
    unit: '%',
    target: 90,
  },
  PROJECT_ON_TIME: {
    code: 'PROJECT_ON_TIME',
    name: 'On-Time Project Completion',
    description: 'Percentage of projects completed on schedule',
    formula: '({PROJECT.COMPLETED_ON_TIME} / {PROJECT.COMPLETED_TOTAL}) * 100',
    unit: '%',
    target: 85,
  },
  RFI_APPROVAL_RATE: {
    code: 'QC_RFI_APPROVAL',
    name: 'RFI Approval Rate',
    description: 'Percentage of RFIs approved',
    formula: '({QC.RFI_APPROVED_COUNT} / {QC.RFI_TOTAL_COUNT}) * 100',
    unit: '%',
    target: 95,
  },
  PHASE_ADHERENCE: {
    code: 'PLANNING_ADHERENCE',
    name: 'Phase Schedule Adherence',
    description: 'Percentage of phases completed on time',
    formula: '{PLANNING.PHASE_ADHERENCE}',
    unit: '%',
    target: 80,
  },
};

/**
 * Determine KPI status based on value and target
 */
export function determineKPIStatus(value: number, target: number | null): string {
  if (!target) return 'ok';
  
  const percentage = (value / target) * 100;
  
  if (percentage >= 90) return 'ok';
  if (percentage >= 70) return 'warning';
  return 'critical';
}
