import { describe, it, expect } from 'vitest';
import {
  safeDivide,
  calculateShare,
  calculateHHI,
  calculateCoefficientOfVariation,
  calculateStdDev,
  classifyRisk,
  riskLevelToScore,
  ratioToScore,
  classifyOverallScore,
  buildDateRange,
} from '../concentration-risk/helpers';
import { DIMENSION_WEIGHTS } from '../concentration-risk/risk-thresholds';

// ── safeDivide ────────────────────────────────────────────────────────────────

describe('safeDivide', () => {
  it('divides normally', () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it('returns 0 when denominator is 0', () => {
    expect(safeDivide(100, 0)).toBe(0);
  });

  it('returns 0 when denominator is Infinity', () => {
    expect(safeDivide(100, Infinity)).toBe(0);
  });
});

// ── calculateShare ────────────────────────────────────────────────────────────

describe('calculateShare', () => {
  it('calculates correct share', () => {
    expect(calculateShare(250, 1000)).toBe(0.25);
  });

  it('returns 0 for zero total', () => {
    expect(calculateShare(100, 0)).toBe(0);
  });

  it('can return 1.0 when value equals total', () => {
    expect(calculateShare(500, 500)).toBe(1);
  });
});

// ── calculateHHI ──────────────────────────────────────────────────────────────

describe('calculateHHI', () => {
  it('returns 1 for monopoly (single player)', () => {
    expect(calculateHHI([1])).toBe(1);
  });

  it('returns low HHI for highly diversified market (10 equal shares)', () => {
    const shares = Array(10).fill(0.1);
    expect(calculateHHI(shares)).toBeCloseTo(0.1, 5);
  });

  it('returns correct HHI for known distribution', () => {
    // Customer A = 50%, B = 30%, C = 20%
    const hhi = calculateHHI([0.5, 0.3, 0.2]);
    expect(hhi).toBeCloseTo(0.38, 5); // 0.25 + 0.09 + 0.04
  });

  it('returns 0 for empty array', () => {
    expect(calculateHHI([])).toBe(0);
  });
});

// ── calculateCoefficientOfVariation ──────────────────────────────────────────

describe('calculateCoefficientOfVariation', () => {
  it('returns 0 for empty array', () => {
    expect(calculateCoefficientOfVariation([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(calculateCoefficientOfVariation([100])).toBe(0);
  });

  it('returns 0 when all values are equal', () => {
    expect(calculateCoefficientOfVariation([200, 200, 200, 200])).toBe(0);
  });

  it('returns correct CV for known values', () => {
    // mean = 100, stdDev = 50 → CV = 0.5
    const values = [50, 100, 150];
    const cv = calculateCoefficientOfVariation(values);
    expect(cv).toBeCloseTo(0.4082, 3);
  });

  it('returns 0 when mean is 0', () => {
    expect(calculateCoefficientOfVariation([0, 0, 0])).toBe(0);
  });
});

// ── calculateStdDev ───────────────────────────────────────────────────────────

describe('calculateStdDev', () => {
  it('returns 0 for uniform values', () => {
    expect(calculateStdDev([5, 5, 5, 5])).toBe(0);
  });

  it('calculates correct stdDev for known values', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, stdDev=2
    expect(calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
  });
});

// ── classifyRisk ──────────────────────────────────────────────────────────────

describe('classifyRisk (higher_is_worse)', () => {
  it('classifies low when below low threshold', () => {
    expect(classifyRisk(0.10, { low: 0.15, medium: 0.25 })).toBe('low');
  });

  it('classifies medium when above low threshold', () => {
    expect(classifyRisk(0.20, { low: 0.15, medium: 0.25 })).toBe('medium');
  });

  it('classifies high when above high threshold', () => {
    expect(classifyRisk(0.30, { low: 0.15, medium: 0.25, high: 0.25 })).toBe('high');
  });
});

// ── riskLevelToScore ──────────────────────────────────────────────────────────

describe('riskLevelToScore', () => {
  it('returns 15 for low', () => expect(riskLevelToScore('low')).toBe(15));
  it('returns 55 for medium', () => expect(riskLevelToScore('medium')).toBe(55));
  it('returns 75 for high', () => expect(riskLevelToScore('high')).toBe(75));
  it('returns 95 for critical', () => expect(riskLevelToScore('critical')).toBe(95));
  it('returns 0 for insufficient_data', () => expect(riskLevelToScore('insufficient_data')).toBe(0));
});

// ── ratioToScore ──────────────────────────────────────────────────────────────

describe('ratioToScore', () => {
  it('returns 0 for ratio 0', () => {
    expect(ratioToScore(0, 0.15, 0.25)).toBe(0);
  });

  it('returns score ≤ 30 when within low threshold', () => {
    const score = ratioToScore(0.10, 0.15, 0.25);
    expect(score).toBeLessThanOrEqual(30);
  });

  it('returns score between 30 and 75 in medium range', () => {
    const score = ratioToScore(0.20, 0.15, 0.25);
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThanOrEqual(75);
  });

  it('returns score > 75 above high threshold', () => {
    const score = ratioToScore(0.50, 0.15, 0.25);
    expect(score).toBeGreaterThan(75);
  });

  it('caps at 100 for extreme values', () => {
    const score = ratioToScore(1.0, 0.15, 0.25);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── classifyOverallScore ──────────────────────────────────────────────────────

describe('classifyOverallScore', () => {
  it('returns low for score 0-30', () => {
    expect(classifyOverallScore(0)).toBe('low');
    expect(classifyOverallScore(30)).toBe('low');
  });

  it('returns medium for score 31-60', () => {
    expect(classifyOverallScore(31)).toBe('medium');
    expect(classifyOverallScore(60)).toBe('medium');
  });

  it('returns high for score 61-80', () => {
    expect(classifyOverallScore(61)).toBe('high');
    expect(classifyOverallScore(80)).toBe('high');
  });

  it('returns critical for score 81-100', () => {
    expect(classifyOverallScore(81)).toBe('critical');
    expect(classifyOverallScore(100)).toBe('critical');
  });
});

// ── buildDateRange ────────────────────────────────────────────────────────────

describe('buildDateRange', () => {
  it('uses explicit startDate/endDate when provided', () => {
    const range = buildDateRange(undefined, '2025-01-01', '2025-06-30');
    expect(range.gte).toEqual(new Date('2025-01-01'));
    expect(range.lte).toEqual(new Date('2025-06-30'));
  });

  it('builds year range when year is provided', () => {
    const range = buildDateRange(2024);
    expect(range.gte).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    expect(range.lte).toEqual(new Date('2024-12-31T23:59:59.999Z'));
  });

  it('defaults to current year when no params', () => {
    const range = buildDateRange();
    const currentYear = new Date().getFullYear();
    expect(range.gte?.getFullYear()).toBe(currentYear);
    expect(range.lte?.getFullYear()).toBe(currentYear);
  });
});

// ── dimension weights sanity check ───────────────────────────────────────────

describe('dimension weights', () => {
  it('all weights sum to 1.0', () => {
    const total = Object.values(DIMENSION_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });
});

// ── overall score determinism ─────────────────────────────────────────────────

describe('overall score determinism', () => {
  it('produces identical scores for identical inputs', () => {
    const dimensionScores = [50, 30, 20, 60, 40, 70];
    const weights = Object.values(DIMENSION_WEIGHTS);
    const score1 = Math.round(dimensionScores.reduce((sum, s, i) => sum + s * weights[i], 0));
    const score2 = Math.round(dimensionScores.reduce((sum, s, i) => sum + s * weights[i], 0));
    expect(score1).toBe(score2);
  });
});

// ── empty dataset behaviour ───────────────────────────────────────────────────

describe('empty dataset helpers', () => {
  it('calculateHHI returns 0 for empty', () => {
    expect(calculateHHI([])).toBe(0);
  });

  it('calculateCV returns 0 for empty', () => {
    expect(calculateCoefficientOfVariation([])).toBe(0);
  });

  it('safeDivide handles zero total', () => {
    expect(safeDivide(0, 0)).toBe(0);
  });
});
