export const CUSTOMER_THRESHOLDS = {
  hhi: { low: 0.15, medium: 0.25 },
  singleWarning: 0.15,
  singleHigh: 0.25,
  top3High: 0.40,
} as const;

export const PROJECT_THRESHOLDS = {
  largestShare: { low: 0.15, medium: 0.25 },
} as const;

export const SEGMENT_THRESHOLDS = {
  largestShare: { medium: 0.35, high: 0.50 },
} as const;

export const SUPPLIER_THRESHOLDS = {
  topShare: { low: 0.25, medium: 0.40 },
} as const;

export const RESOURCE_THRESHOLDS = {
  share: { low: 0.25, medium: 0.40 },
} as const;

export const REVENUE_TIMING_THRESHOLDS = {
  cv: { low: 0.30, medium: 0.60 },
} as const;

export const OVERALL_SCORE_LABELS = {
  low: { max: 30, label: 'Low' },
  medium: { max: 60, label: 'Medium' },
  high: { max: 80, label: 'High' },
  critical: { max: 100, label: 'Critical' },
} as const;

export const DIMENSION_WEIGHTS = {
  customer: 0.25,
  project: 0.20,
  segment: 0.15,
  supplier: 0.15,
  resource: 0.15,
  revenueTiming: 0.10,
} as const;
