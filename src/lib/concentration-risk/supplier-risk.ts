import db from '@/lib/db';
import { logger } from '@/lib/logger';
import type { RiskFilters, SupplierConcentrationResult, SupplierRiskRow, RiskLevel } from './types';
import { calculateShare, calculateHHI, buildDateRange, ratioToScore } from './helpers';
import { SUPPLIER_THRESHOLDS } from './risk-thresholds';

// TODO: When a dedicated PO/procurement module is added to OTS, replace this
//       adapter with a direct PurchaseOrder model query.
//       Currently using LcrEntry.amount + awardedToRaw as a procurement proxy.

function classifySupplierRisk(share: number): RiskLevel {
  if (share >= SUPPLIER_THRESHOLDS.topShare.medium) return 'high';
  if (share >= SUPPLIER_THRESHOLDS.topShare.low) return 'medium';
  return 'low';
}

export async function getSupplierConcentration(filters: RiskFilters): Promise<SupplierConcentrationResult> {
  try {
    const dateRange = buildDateRange(filters.year, filters.startDate, filters.endDate);

    const entries = await db.lcrEntry.findMany({
      where: {
        isDeleted: false,
        amount: { not: null, gt: 0 },
        awardedToRaw: { not: null },
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(dateRange.gte || dateRange.lte ? { buyingDate: dateRange } : {}),
      },
      select: {
        awardedToRaw: true,
        amount: true,
        poNumber: true,
      },
    });

    if (entries.length === 0) {
      return {
        rows: [],
        totalSpend: 0,
        top1Share: 0,
        top3Share: 0,
        hhi: 0,
        riskLevel: 'insufficient_data',
        score: 0,
        insufficientData: true,
      };
    }

    const bySupplier: Record<string, { spend: number; pos: Set<string> }> = {};
    let totalSpend = 0;

    for (const e of entries) {
      const name = (e.awardedToRaw ?? 'Unknown').trim();
      if (!name) continue;
      const amount = Number(e.amount ?? 0);
      totalSpend += amount;
      if (!bySupplier[name]) bySupplier[name] = { spend: 0, pos: new Set() };
      bySupplier[name].spend += amount;
      if (e.poNumber) bySupplier[name].pos.add(e.poNumber);
    }

    const rows: SupplierRiskRow[] = Object.entries(bySupplier)
      .map(([supplierName, data]) => {
        const share = calculateShare(data.spend, totalSpend);
        return {
          supplierName,
          spend: data.spend,
          share,
          poCount: data.pos.size,
          riskLevel: classifySupplierRisk(share),
        };
      })
      .sort((a, b) => b.spend - a.spend);

    const shares = rows.map((r) => r.share);
    const top1Share = shares[0] ?? 0;
    const top3Share = shares.slice(0, 3).reduce((s, v) => s + v, 0);
    const hhi = calculateHHI(shares);
    const riskLevel: RiskLevel = classifySupplierRisk(top1Share);
    const score = ratioToScore(top1Share, SUPPLIER_THRESHOLDS.topShare.low, SUPPLIER_THRESHOLDS.topShare.medium);

    return {
      rows,
      totalSpend,
      top1Share,
      top3Share,
      hhi,
      riskLevel,
      score,
      insufficientData: false,
    };
  } catch (err) {
    logger.error({ err, filters }, '[ConcentrationRisk] supplier calculation failed');
    return {
      rows: [],
      totalSpend: 0,
      top1Share: 0,
      top3Share: 0,
      hhi: 0,
      riskLevel: 'insufficient_data',
      score: 0,
      insufficientData: true,
    };
  }
}
