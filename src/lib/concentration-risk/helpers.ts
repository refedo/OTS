import type { RiskLevel } from './types';

export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0 || !isFinite(denominator)) return 0;
  return numerator / denominator;
}

export function calculateShare(value: number, total: number): number {
  return safeDivide(value, total);
}

export function calculateHHI(shares: number[]): number {
  return shares.reduce((sum, s) => sum + s * s, 0);
}

export function calculateCoefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return safeDivide(stdDev, mean);
}

export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function classifyRisk(
  value: number,
  thresholds: { low?: number; medium?: number; high?: number },
  direction: 'higher_is_worse' | 'lower_is_worse' = 'higher_is_worse'
): RiskLevel {
  if (direction === 'higher_is_worse') {
    if (thresholds.high !== undefined && value >= thresholds.high) return 'high';
    if (thresholds.medium !== undefined && value >= thresholds.medium) return 'medium';
    return 'low';
  }
  if (thresholds.low !== undefined && value <= thresholds.low) return 'low';
  if (thresholds.medium !== undefined && value <= thresholds.medium) return 'medium';
  return 'high';
}

/** Convert a risk level to a 0-100 numeric score */
export function riskLevelToScore(level: RiskLevel): number {
  switch (level) {
    case 'low': return 15;
    case 'medium': return 55;
    case 'high': return 75;
    case 'critical': return 95;
    case 'insufficient_data': return 0;
  }
}

/** Map a raw 0-1 ratio to a 0-100 score, clamped */
export function ratioToScore(ratio: number, lowThreshold: number, highThreshold: number): number {
  const clamped = Math.min(ratio, 1);
  if (clamped <= lowThreshold) return Math.round(safeDivide(clamped, lowThreshold) * 30);
  if (clamped <= highThreshold) {
    const pct = safeDivide(clamped - lowThreshold, highThreshold - lowThreshold);
    return Math.round(30 + pct * 45);
  }
  const pct = Math.min(safeDivide(clamped - highThreshold, 1 - highThreshold), 1);
  return Math.round(75 + pct * 25);
}

/** Classify overall score label */
export function classifyOverallScore(score: number): RiskLevel {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}

/** Build a date range from year / startDate / endDate */
export function buildDateRange(
  year?: number,
  startDate?: string,
  endDate?: string
): { gte?: Date; lte?: Date } {
  if (startDate || endDate) {
    return {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined,
    };
  }
  if (year) {
    return {
      gte: new Date(`${year}-01-01T00:00:00.000Z`),
      lte: new Date(`${year}-12-31T23:59:59.999Z`),
    };
  }
  const currentYear = new Date().getFullYear();
  return {
    gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
    lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
  };
}

export function formatMonthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-SA-u-ca-gregory', { year: 'numeric', month: 'short' });
}
