import db from '@/lib/db';
import { logger } from '@/lib/logger';
import type { RiskFilters, ProjectConcentrationResult, ProjectRiskRow, RiskLevel } from './types';
import { calculateShare, buildDateRange, ratioToScore } from './helpers';
import { PROJECT_THRESHOLDS } from './risk-thresholds';

function classifyProjectRisk(share: number): RiskLevel {
  if (share >= PROJECT_THRESHOLDS.largestShare.medium) return 'high';
  if (share >= PROJECT_THRESHOLDS.largestShare.low) return 'medium';
  return 'low';
}

export async function getProjectConcentration(filters: RiskFilters): Promise<ProjectConcentrationResult> {
  try {
    const dateRange = buildDateRange(filters.year, filters.startDate, filters.endDate);

    const projects = await db.project.findMany({
      where: {
        deletedAt: null,
        contractValue: { not: null, gt: 0 },
        ...(filters.customerId ? { clientId: filters.customerId } : {}),
        ...(filters.projectId ? { id: filters.projectId } : {}),
        ...(dateRange.gte || dateRange.lte ? { createdAt: dateRange } : {}),
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        contractValue: true,
        status: true,
        client: { select: { name: true } },
      },
      orderBy: { contractValue: 'desc' },
    });

    if (projects.length === 0) {
      return {
        rows: [],
        totalContractValue: 0,
        largestShare: 0,
        top3Share: 0,
        top5Share: 0,
        riskLevel: 'insufficient_data',
        score: 0,
        insufficientData: true,
      };
    }

    const totalContractValue = projects.reduce((s, p) => s + Number(p.contractValue ?? 0), 0);

    const rows: ProjectRiskRow[] = projects.map((p) => {
      const contractValue = Number(p.contractValue ?? 0);
      const share = calculateShare(contractValue, totalContractValue);
      return {
        projectId: p.id,
        projectNumber: p.projectNumber,
        projectName: p.name,
        customerName: p.client.name,
        contractValue,
        share,
        status: p.status,
        riskLevel: classifyProjectRisk(share),
      };
    });

    const largestShare = rows[0]?.share ?? 0;
    const top3Share = rows.slice(0, 3).reduce((s, r) => s + r.share, 0);
    const top5Share = rows.slice(0, 5).reduce((s, r) => s + r.share, 0);

    const riskLevel: RiskLevel = classifyProjectRisk(largestShare);
    const score = ratioToScore(largestShare, PROJECT_THRESHOLDS.largestShare.low, PROJECT_THRESHOLDS.largestShare.medium);

    return {
      rows,
      totalContractValue,
      largestShare,
      top3Share,
      top5Share,
      riskLevel,
      score,
      insufficientData: false,
    };
  } catch (err) {
    logger.error({ err, filters }, '[ConcentrationRisk] project calculation failed');
    return {
      rows: [],
      totalContractValue: 0,
      largestShare: 0,
      top3Share: 0,
      top5Share: 0,
      riskLevel: 'insufficient_data',
      score: 0,
      insufficientData: true,
    };
  }
}
