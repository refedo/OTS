import db from '@/lib/db';
import { logger } from '@/lib/logger';
import type { RiskFilters, RevenueTimingResult, MonthlyRevenuePoint, RiskLevel } from './types';
import {
  calculateCoefficientOfVariation,
  calculateStdDev,
  buildDateRange,
  formatMonthLabel,
  ratioToScore,
} from './helpers';
import { REVENUE_TIMING_THRESHOLDS } from './risk-thresholds';

// Revenue timing uses ProjectPaymentReceipt.amount by receivedDate month.
// This reflects actual cash receipts recorded in OTS.
// TODO: When Dolibarr invoice data is mirrored into OTS, prefer invoice issue dates.

export async function getRevenueTimingConcentration(filters: RiskFilters): Promise<RevenueTimingResult> {
  try {
    const dateRange = buildDateRange(filters.year, filters.startDate, filters.endDate);

    const receipts = await db.projectPaymentReceipt.findMany({
      where: {
        amount: { gt: 0 },
        ...(dateRange.gte || dateRange.lte ? { receivedDate: dateRange } : {}),
        schedule: {
          project: {
            deletedAt: null,
            ...(filters.customerId ? { clientId: filters.customerId } : {}),
            ...(filters.projectId ? { id: filters.projectId } : {}),
          },
        },
      },
      select: {
        amount: true,
        receivedDate: true,
      },
    });

    if (receipts.length === 0) {
      return {
        monthly: [],
        averageMonthly: 0,
        stdDev: 0,
        cv: 0,
        riskLevel: 'insufficient_data',
        score: 0,
        insufficientData: true,
      };
    }

    // Group by year-month
    const byMonth: Record<string, number> = {};
    for (const r of receipts) {
      const d = new Date(r.receivedDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + Number(r.amount);
    }

    // Fill all months in range so zero-revenue months are included in CV
    const rangeStart = dateRange.gte ?? new Date(`${new Date().getFullYear()}-01-01`);
    const rangeEnd = dateRange.lte ?? new Date(`${new Date().getFullYear()}-12-31`);

    const monthly: MonthlyRevenuePoint[] = [];
    const cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cur <= rangeEnd) {
      const y = cur.getFullYear();
      const m = cur.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      monthly.push({
        year: y,
        month: m,
        label: formatMonthLabel(y, m),
        amount: byMonth[key] ?? 0,
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    const amounts = monthly.map((p) => p.amount);
    const averageMonthly = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = calculateStdDev(amounts);
    const cv = calculateCoefficientOfVariation(amounts);

    const riskLevel: RiskLevel =
      cv >= REVENUE_TIMING_THRESHOLDS.cv.medium ? 'high'
      : cv >= REVENUE_TIMING_THRESHOLDS.cv.low ? 'medium'
      : 'low';

    const score = ratioToScore(cv, REVENUE_TIMING_THRESHOLDS.cv.low, REVENUE_TIMING_THRESHOLDS.cv.medium);

    return {
      monthly,
      averageMonthly,
      stdDev,
      cv,
      riskLevel,
      score,
      insufficientData: false,
    };
  } catch (err) {
    logger.error({ err, filters }, '[ConcentrationRisk] revenue timing calculation failed');
    return {
      monthly: [],
      averageMonthly: 0,
      stdDev: 0,
      cv: 0,
      riskLevel: 'insufficient_data',
      score: 0,
      insufficientData: true,
    };
  }
}
