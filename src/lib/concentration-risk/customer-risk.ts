import db from '@/lib/db';
import { logger } from '@/lib/logger';
import type { RiskFilters, CustomerConcentrationResult, CustomerRiskRow, RiskLevel } from './types';
import {
  calculateShare,
  calculateHHI,
  buildDateRange,
  ratioToScore,
} from './helpers';
import { CUSTOMER_THRESHOLDS } from './risk-thresholds';

function classifyCustomerRisk(share: number): RiskLevel {
  if (share >= CUSTOMER_THRESHOLDS.singleHigh) return 'high';
  if (share >= CUSTOMER_THRESHOLDS.singleWarning) return 'medium';
  return 'low';
}

function computeScore(top1: number, top3: number, hhi: number): number {
  // Weight: top1 dominates (50%), top3 (30%), hhi (20%)
  const s1 = ratioToScore(top1, CUSTOMER_THRESHOLDS.singleWarning, CUSTOMER_THRESHOLDS.singleHigh);
  const s3 = ratioToScore(top3, CUSTOMER_THRESHOLDS.top3High, 0.65);
  const sHhi = ratioToScore(hhi, CUSTOMER_THRESHOLDS.hhi.low, CUSTOMER_THRESHOLDS.hhi.medium);
  return Math.round(s1 * 0.5 + s3 * 0.3 + sHhi * 0.2);
}

export async function getCustomerConcentration(filters: RiskFilters): Promise<CustomerConcentrationResult> {
  try {
    const dateRange = buildDateRange(filters.year, filters.startDate, filters.endDate);

    const projects = await db.project.findMany({
      where: {
        deletedAt: null,
        contractValue: { not: null, gt: 0 },
        ...(filters.customerId ? { clientId: filters.customerId } : {}),
        ...(dateRange.gte || dateRange.lte ? { createdAt: dateRange } : {}),
      },
      select: {
        clientId: true,
        contractValue: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
      },
    });

    if (projects.length === 0) {
      return {
        rows: [],
        totalContractExposure: 0,
        top1Share: 0,
        top3Share: 0,
        top5Share: 0,
        hhi: 0,
        riskLevel: 'insufficient_data',
        score: 0,
        insufficientData: true,
      };
    }

    const byClient: Record<string, { name: string; total: number; count: number; lastDate: Date | null }> = {};
    let totalContractExposure = 0;

    for (const p of projects) {
      const val = Number(p.contractValue ?? 0);
      totalContractExposure += val;
      if (!byClient[p.clientId]) {
        byClient[p.clientId] = { name: p.client.name, total: 0, count: 0, lastDate: null };
      }
      byClient[p.clientId].total += val;
      byClient[p.clientId].count += 1;
      if (!byClient[p.clientId].lastDate || p.createdAt > byClient[p.clientId].lastDate!) {
        byClient[p.clientId].lastDate = p.createdAt;
      }
    }

    const rows: CustomerRiskRow[] = Object.entries(byClient)
      .map(([clientId, data]) => {
        const share = calculateShare(data.total, totalContractExposure);
        return {
          customerId: clientId,
          customerName: data.name,
          contractExposure: data.total,
          share,
          projectCount: data.count,
          lastActivityDate: data.lastDate,
          riskLevel: classifyCustomerRisk(share),
        };
      })
      .sort((a, b) => b.contractExposure - a.contractExposure);

    const shares = rows.map((r) => r.share);
    const hhi = calculateHHI(shares);
    const top1Share = shares[0] ?? 0;
    const top3Share = shares.slice(0, 3).reduce((s, v) => s + v, 0);
    const top5Share = shares.slice(0, 5).reduce((s, v) => s + v, 0);

    let riskLevel: RiskLevel =
      hhi >= CUSTOMER_THRESHOLDS.hhi.medium ? 'high'
      : hhi >= CUSTOMER_THRESHOLDS.hhi.low ? 'medium'
      : 'low';

    if (top1Share >= CUSTOMER_THRESHOLDS.singleHigh) riskLevel = 'high';
    if (top3Share >= CUSTOMER_THRESHOLDS.top3High && riskLevel !== 'high') riskLevel = 'high';

    const score = computeScore(top1Share, top3Share, hhi);

    return {
      rows,
      totalContractExposure,
      top1Share,
      top3Share,
      top5Share,
      hhi,
      riskLevel,
      score,
      insufficientData: false,
    };
  } catch (err) {
    logger.error({ err, filters }, '[ConcentrationRisk] customer calculation failed');
    return {
      rows: [],
      totalContractExposure: 0,
      top1Share: 0,
      top3Share: 0,
      top5Share: 0,
      hhi: 0,
      riskLevel: 'insufficient_data',
      score: 0,
      insufficientData: true,
    };
  }
}
