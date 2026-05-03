import type {
  RiskFilters,
  OverallRiskResult,
  ConcentrationRiskSummary,
  DimensionScore,
  RiskLevel,
} from './types';
import { getCustomerConcentration } from './customer-risk';
import { getProjectConcentration } from './project-risk';
import { getSegmentConcentration } from './segment-risk';
import { getSupplierConcentration } from './supplier-risk';
import { getResourceConcentration } from './resource-risk';
import { getRevenueTimingConcentration } from './revenue-timing-risk';
import { DIMENSION_WEIGHTS } from './risk-thresholds';
import { classifyOverallScore } from './helpers';
import { logger } from '@/lib/logger';

function makeDimension(
  name: string,
  score: number,
  weight: number,
  riskLevel: RiskLevel
): DimensionScore {
  return {
    name,
    score,
    weight,
    riskLevel,
    contributedScore: Math.round(score * weight),
  };
}

export async function getOverallRisk(filters: RiskFilters): Promise<OverallRiskResult> {
  const [customer, project, segment, supplier, resource, revenueTiming] = await Promise.all([
    getCustomerConcentration(filters),
    getProjectConcentration(filters),
    getSegmentConcentration(filters),
    getSupplierConcentration(filters),
    getResourceConcentration(filters),
    getRevenueTimingConcentration(filters),
  ]);

  const dimensions: DimensionScore[] = [
    makeDimension('Customer Concentration', customer.score, DIMENSION_WEIGHTS.customer, customer.riskLevel),
    makeDimension('Project Concentration', project.score, DIMENSION_WEIGHTS.project, project.riskLevel),
    makeDimension('Segment Concentration', segment.score, DIMENSION_WEIGHTS.segment, segment.riskLevel),
    makeDimension('Supplier Concentration', supplier.score, DIMENSION_WEIGHTS.supplier, supplier.riskLevel),
    makeDimension('Operational Dependency', resource.score, DIMENSION_WEIGHTS.resource, resource.riskLevel),
    makeDimension('Revenue Timing', revenueTiming.score, DIMENSION_WEIGHTS.revenueTiming, revenueTiming.riskLevel),
  ];

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  const riskLabel = classifyOverallScore(overallScore);

  logger.info(
    { overallScore, riskLabel, filters },
    '[ConcentrationRisk] overall risk computed'
  );

  return { overallScore, riskLabel, dimensions, customer, project, segment, supplier, resource, revenueTiming };
}

export function buildSummary(result: OverallRiskResult): ConcentrationRiskSummary {
  const anyInsufficient =
    result.customer.insufficientData &&
    result.project.insufficientData &&
    result.supplier.insufficientData &&
    result.revenueTiming.insufficientData;

  return {
    overallScore: result.overallScore,
    riskLabel: result.riskLabel,
    customerHhi: result.customer.hhi,
    topCustomerShare: result.customer.top1Share,
    largestProjectShare: result.project.largestShare,
    topSupplierShare: result.supplier.top1Share,
    revenueVolatilityCv: result.revenueTiming.cv,
    criticalBottleneckShare: result.resource.topShare,
    dimensions: result.dimensions,
    insufficientData: anyInsufficient,
  };
}
