import db from '@/lib/db';
import { logger } from '@/lib/logger';
import type { RiskFilters, ResourceConcentrationResult, ResourceRiskRow, RiskLevel, ResourceType } from './types';
import { calculateShare, buildDateRange, ratioToScore } from './helpers';
import { RESOURCE_THRESHOLDS } from './risk-thresholds';

// Operational dependency concentration — measures production output per team/process.
// Uses ProductionLog.processedQty grouped by processingTeam and processType.
// This is NOT an HR blame tool: labels use "Operational Dependency" language.

function classifyResourceRisk(share: number): RiskLevel {
  if (share >= RESOURCE_THRESHOLDS.share.medium) return 'high';
  if (share >= RESOURCE_THRESHOLDS.share.low) return 'medium';
  return 'low';
}

function dependencyLabel(riskLevel: RiskLevel): RiskLevel {
  return riskLevel;
}

export async function getResourceConcentration(filters: RiskFilters): Promise<ResourceConcentrationResult> {
  try {
    const dateRange = buildDateRange(filters.year, filters.startDate, filters.endDate);

    const logs = await db.productionLog.findMany({
      where: {
        processedQty: { gt: 0 },
        ...(filters.projectId ? { assemblyPart: { projectId: filters.projectId } } : {}),
        ...(filters.departmentId ? {
          assemblyPart: { project: { projectManagerId: filters.departmentId } },
        } : {}),
        ...(dateRange.gte || dateRange.lte ? { dateProcessed: dateRange } : {}),
      },
      select: {
        processType: true,
        processingTeam: true,
        processedQty: true,
        assemblyPart: {
          select: {
            singlePartWeight: true,
            quantity: true,
          },
        },
      },
    });

    if (logs.length === 0) {
      return {
        rows: [],
        totalOutput: 0,
        outputUnit: 'units',
        topShare: 0,
        riskLevel: 'insufficient_data',
        score: 0,
        insufficientData: true,
      };
    }

    // Prefer weight (kg) where available, otherwise use quantity count
    let useWeight = false;
    const byTeam: Record<string, { output: number }> = {};
    const byProcess: Record<string, { output: number }> = {};
    let totalOutput = 0;

    for (const log of logs) {
      const weightKg =
        log.assemblyPart.singlePartWeight != null
          ? Number(log.assemblyPart.singlePartWeight) * log.processedQty
          : null;

      const output = weightKg ?? log.processedQty;
      if (weightKg !== null) useWeight = true;

      totalOutput += output;

      const team = (log.processingTeam ?? 'Unassigned').trim();
      if (!byTeam[team]) byTeam[team] = { output: 0 };
      byTeam[team].output += output;

      const process = log.processType ?? 'Unknown';
      if (!byProcess[process]) byProcess[process] = { output: 0 };
      byProcess[process].output += output;
    }

    const outputUnit = useWeight ? 'kg' : 'units';

    const teamRows: ResourceRiskRow[] = Object.entries(byTeam)
      .map(([name, data]) => {
        const share = calculateShare(data.output, totalOutput);
        const riskLevel = classifyResourceRisk(share);
        return {
          resourceType: 'team' as ResourceType,
          resourceName: name,
          output: data.output,
          outputUnit,
          share,
          dependencyLevel: dependencyLabel(riskLevel),
          riskLevel,
        };
      })
      .sort((a, b) => b.output - a.output);

    const processRows: ResourceRiskRow[] = Object.entries(byProcess)
      .map(([name, data]) => {
        const share = calculateShare(data.output, totalOutput);
        const riskLevel = classifyResourceRisk(share);
        return {
          resourceType: 'process' as ResourceType,
          resourceName: name,
          output: data.output,
          outputUnit,
          share,
          dependencyLevel: dependencyLabel(riskLevel),
          riskLevel,
        };
      })
      .sort((a, b) => b.output - a.output);

    const rows = [...teamRows, ...processRows];
    const topShare = rows[0]?.share ?? 0;
    const riskLevel: RiskLevel = classifyResourceRisk(topShare);
    const score = ratioToScore(topShare, RESOURCE_THRESHOLDS.share.low, RESOURCE_THRESHOLDS.share.medium);

    return {
      rows,
      totalOutput,
      outputUnit,
      topShare,
      riskLevel,
      score,
      insufficientData: false,
    };
  } catch (err) {
    logger.error({ err, filters }, '[ConcentrationRisk] resource calculation failed');
    return {
      rows: [],
      totalOutput: 0,
      outputUnit: 'units',
      topShare: 0,
      riskLevel: 'insufficient_data',
      score: 0,
      insufficientData: true,
    };
  }
}
