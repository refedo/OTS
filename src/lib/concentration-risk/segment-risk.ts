import db from '@/lib/db';
import { logger } from '@/lib/logger';
import type { RiskFilters, SegmentConcentrationResult, SegmentRiskRow, RiskLevel } from './types';
import { calculateShare, calculateHHI, buildDateRange, ratioToScore } from './helpers';
import { SEGMENT_THRESHOLDS } from './risk-thresholds';

const UNCLASSIFIED = 'Unclassified';

function classifySegmentRisk(share: number): RiskLevel {
  if (share >= SEGMENT_THRESHOLDS.largestShare.high) return 'high';
  if (share >= SEGMENT_THRESHOLDS.largestShare.medium) return 'medium';
  return 'low';
}

export async function getSegmentConcentration(filters: RiskFilters): Promise<SegmentConcentrationResult> {
  try {
    const dateRange = buildDateRange(filters.year, filters.startDate, filters.endDate);

    const projects = await db.project.findMany({
      where: {
        deletedAt: null,
        contractValue: { not: null, gt: 0 },
        ...(filters.customerId ? { clientId: filters.customerId } : {}),
        ...(filters.segment ? {
          OR: [
            { segment: { name: filters.segment } },
            { projectNature: filters.segment },
          ],
        } : {}),
        ...(dateRange.gte || dateRange.lte ? { createdAt: dateRange } : {}),
      },
      select: {
        contractValue: true,
        projectNature: true,
        segment: { select: { name: true } },
      },
    });

    if (projects.length === 0) {
      return {
        rows: [],
        totalContractExposure: 0,
        largestShare: 0,
        hhi: 0,
        riskLevel: 'insufficient_data',
        score: 0,
        insufficientData: true,
      };
    }

    const bySegment: Record<string, { total: number; count: number }> = {};
    let totalContractExposure = 0;

    for (const p of projects) {
      const segmentName = p.segment?.name ?? p.projectNature ?? UNCLASSIFIED;
      const val = Number(p.contractValue ?? 0);
      totalContractExposure += val;
      if (!bySegment[segmentName]) bySegment[segmentName] = { total: 0, count: 0 };
      bySegment[segmentName].total += val;
      bySegment[segmentName].count += 1;
    }

    const rows: SegmentRiskRow[] = Object.entries(bySegment)
      .map(([segment, data]) => {
        const share = calculateShare(data.total, totalContractExposure);
        return {
          segment,
          contractExposure: data.total,
          share,
          projectCount: data.count,
          riskLevel: classifySegmentRisk(share),
        };
      })
      .sort((a, b) => b.contractExposure - a.contractExposure);

    const largestShare = rows[0]?.share ?? 0;
    const hhi = calculateHHI(rows.map((r) => r.share));
    const riskLevel: RiskLevel = classifySegmentRisk(largestShare);
    const score = ratioToScore(largestShare, SEGMENT_THRESHOLDS.largestShare.medium, SEGMENT_THRESHOLDS.largestShare.high);

    return {
      rows,
      totalContractExposure,
      largestShare,
      hhi,
      riskLevel,
      score,
      insufficientData: false,
    };
  } catch (err) {
    logger.error({ err, filters }, '[ConcentrationRisk] segment calculation failed');
    return {
      rows: [],
      totalContractExposure: 0,
      largestShare: 0,
      hhi: 0,
      riskLevel: 'insufficient_data',
      score: 0,
      insufficientData: true,
    };
  }
}
