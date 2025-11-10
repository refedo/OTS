/**
 * KPI Calculator Engine
 * 
 * Handles automatic KPI calculation, scoring, and alerting
 */

import prisma from '@/lib/db';
import { evaluateFormula, determineKPIStatus } from './formula-parser';

export interface CalculationResult {
  kpiId: string;
  entityType: string;
  entityId: string | null;
  value: number;
  rawValues: Record<string, number>;
  status: string;
}

/**
 * Calculate a single KPI for a specific entity and period
 */
export async function calculateKPI(
  kpiId: string,
  entityType: string,
  entityId: string | null,
  periodStart: Date,
  periodEnd: Date
): Promise<CalculationResult | null> {
  try {
    // Get KPI definition
    const kpi = await prisma.kPIDefinition.findUnique({
      where: { id: kpiId },
    });

    if (!kpi || !kpi.isActive) {
      console.warn(`KPI ${kpiId} not found or inactive`);
      return null;
    }

    // Evaluate formula
    const { value, rawValues } = await evaluateFormula(
      kpi.formula,
      entityType,
      entityId,
      periodStart,
      periodEnd
    );

    // Determine status
    const status = determineKPIStatus(value, kpi.target);

    return {
      kpiId,
      entityType,
      entityId,
      value,
      rawValues,
      status,
    };
  } catch (error) {
    console.error(`Error calculating KPI ${kpiId}:`, error);
    return null;
  }
}

/**
 * Calculate and store KPI score
 */
export async function calculateAndStoreKPI(
  kpiId: string,
  entityType: string,
  entityId: string | null,
  periodStart: Date,
  periodEnd: Date,
  computedBy: string | null = null
): Promise<void> {
  const result = await calculateKPI(kpiId, entityType, entityId, periodStart, periodEnd);
  
  if (!result) return;

  // Store score
  await prisma.kPIScore.create({
    data: {
      kpiId: result.kpiId,
      entityType: result.entityType,
      entityId: result.entityId,
      periodStart,
      periodEnd,
      value: result.value,
      rawValue: result.rawValues,
      status: result.status,
      computedBy,
    },
  });

  // Log history
  await prisma.kPIHistory.create({
    data: {
      kpiId: result.kpiId,
      action: 'calculated',
      payload: {
        entityType: result.entityType,
        entityId: result.entityId,
        value: result.value,
        status: result.status,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
      performedBy: computedBy,
    },
  });

  // Check for alerts
  await checkAndCreateAlerts(result, periodStart, periodEnd);
}

/**
 * Check KPI value against thresholds and create alerts
 */
async function checkAndCreateAlerts(
  result: CalculationResult,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  if (result.status === 'ok' || !result.entityId) return;

  const kpi = await prisma.kPIDefinition.findUnique({
    where: { id: result.kpiId },
  });

  if (!kpi || !kpi.target) return;

  const percentage = (result.value / kpi.target) * 100;
  let level: string;
  let message: string;

  if (percentage < 70) {
    level = 'critical';
    message = `CRITICAL: ${kpi.name} is at ${result.value.toFixed(2)}${kpi.unit || ''} (${percentage.toFixed(1)}% of target ${kpi.target})`;
  } else if (percentage < 90) {
    level = 'warning';
    message = `WARNING: ${kpi.name} is at ${result.value.toFixed(2)}${kpi.unit || ''} (${percentage.toFixed(1)}% of target ${kpi.target})`;
  } else {
    return;
  }

  // Check if alert already exists for this period
  const existingAlert = await prisma.kPIAlert.findFirst({
    where: {
      kpiId: result.kpiId,
      entityType: result.entityType,
      entityId: result.entityId,
      level,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  if (!existingAlert) {
    await prisma.kPIAlert.create({
      data: {
        kpiId: result.kpiId,
        entityType: result.entityType,
        entityId: result.entityId,
        level,
        message,
      },
    });
  }
}

/**
 * Calculate KPIs for all active entities
 */
export async function calculateKPIsForAllEntities(
  kpiId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  const kpi = await prisma.kPIDefinition.findUnique({
    where: { id: kpiId },
  });

  if (!kpi || !kpi.isActive) return;

  const sourceModules = kpi.sourceModules as string[] | null;

  // Determine which entities to calculate for based on source modules
  if (!sourceModules || sourceModules.includes('production')) {
    // Calculate for all projects
    const projects = await prisma.project.findMany({
      where: { status: 'Active' },
      select: { id: true },
    });

    for (const project of projects) {
      await calculateAndStoreKPI(kpiId, 'project', project.id, periodStart, periodEnd);
    }

    // Calculate for all departments
    const departments = await prisma.department.findMany({
      select: { id: true },
    });

    for (const dept of departments) {
      await calculateAndStoreKPI(kpiId, 'department', dept.id, periodStart, periodEnd);
    }

    // Calculate company-wide
    await calculateAndStoreKPI(kpiId, 'company', null, periodStart, periodEnd);
  }
}

/**
 * Get period dates based on frequency
 */
export function getPeriodDates(frequency: string): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const periodEnd = new Date(now);
  let periodStart = new Date(now);

  switch (frequency) {
    case 'daily':
      periodStart.setDate(periodStart.getDate() - 1);
      break;
    case 'weekly':
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case 'monthly':
      periodStart.setMonth(periodStart.getMonth() - 1);
      break;
    default:
      periodStart.setDate(periodStart.getDate() - 30);
  }

  return { periodStart, periodEnd };
}

/**
 * Recalculate all active KPIs for a given frequency
 */
export async function recalculateKPIsByFrequency(frequency: string): Promise<void> {
  const kpis = await prisma.kPIDefinition.findMany({
    where: {
      isActive: true,
      frequency,
      calculationType: 'auto',
    },
  });

  const { periodStart, periodEnd } = getPeriodDates(frequency);

  console.log(`Recalculating ${kpis.length} ${frequency} KPIs for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  for (const kpi of kpis) {
    try {
      await calculateKPIsForAllEntities(kpi.id, periodStart, periodEnd);
      console.log(`✓ Calculated KPI: ${kpi.code}`);
    } catch (error) {
      console.error(`✗ Error calculating KPI ${kpi.code}:`, error);
    }
  }
}

/**
 * Approve a manual KPI entry
 */
export async function approveManualEntry(
  entryId: string,
  approverId: string
): Promise<void> {
  const entry = await prisma.kPIManualEntry.findUnique({
    where: { id: entryId },
    include: { kpiDefinition: true },
  });

  if (!entry) {
    throw new Error('Manual entry not found');
  }

  if (entry.approved) {
    throw new Error('Entry already approved');
  }

  // Update entry
  await prisma.kPIManualEntry.update({
    where: { id: entryId },
    data: {
      approved: true,
      approvedBy: approverId,
      approvedAt: new Date(),
    },
  });

  // Create or update KPI score
  const existingScore = await prisma.kPIScore.findFirst({
    where: {
      kpiId: entry.kpiId,
      entityType: 'user',
      entityId: entry.userId,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
    },
  });

  const status = determineKPIStatus(entry.value, entry.kpiDefinition.target);

  if (existingScore) {
    await prisma.kPIScore.update({
      where: { id: existingScore.id },
      data: {
        value: entry.value,
        status,
        computedBy: approverId,
      },
    });
  } else {
    await prisma.kPIScore.create({
      data: {
        kpiId: entry.kpiId,
        entityType: 'user',
        entityId: entry.userId,
        periodStart: entry.periodStart,
        periodEnd: entry.periodEnd,
        value: entry.value,
        status,
        computedBy: approverId,
      },
    });
  }

  // Log history
  await prisma.kPIHistory.create({
    data: {
      kpiId: entry.kpiId,
      action: 'approved',
      payload: {
        entryId,
        userId: entry.userId,
        value: entry.value,
        notes: entry.notes,
      },
      performedBy: approverId,
    },
  });
}
