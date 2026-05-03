export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'insufficient_data';

export interface RiskFilters {
  startDate?: string;
  endDate?: string;
  year?: number;
  customerId?: string;
  projectId?: string;
  segment?: string;
  supplierId?: string;
  departmentId?: string;
  riskLevel?: RiskLevel;
}

// ── Customer ──────────────────────────────────────────────────────────────────

export interface CustomerRiskRow {
  customerId: string;
  customerName: string;
  contractExposure: number;
  share: number;
  projectCount: number;
  lastActivityDate: Date | null;
  riskLevel: RiskLevel;
}

export interface CustomerConcentrationResult {
  rows: CustomerRiskRow[];
  totalContractExposure: number;
  top1Share: number;
  top3Share: number;
  top5Share: number;
  hhi: number;
  riskLevel: RiskLevel;
  score: number;
  insufficientData: boolean;
}

// ── Project ───────────────────────────────────────────────────────────────────

export interface ProjectRiskRow {
  projectId: string;
  projectNumber: string;
  projectName: string;
  customerName: string;
  contractValue: number;
  share: number;
  status: string;
  riskLevel: RiskLevel;
}

export interface ProjectConcentrationResult {
  rows: ProjectRiskRow[];
  totalContractValue: number;
  largestShare: number;
  top3Share: number;
  top5Share: number;
  riskLevel: RiskLevel;
  score: number;
  insufficientData: boolean;
}

// ── Segment ───────────────────────────────────────────────────────────────────

export interface SegmentRiskRow {
  segment: string;
  contractExposure: number;
  share: number;
  projectCount: number;
  riskLevel: RiskLevel;
}

export interface SegmentConcentrationResult {
  rows: SegmentRiskRow[];
  totalContractExposure: number;
  largestShare: number;
  hhi: number;
  riskLevel: RiskLevel;
  score: number;
  insufficientData: boolean;
}

// ── Supplier ──────────────────────────────────────────────────────────────────

export interface SupplierRiskRow {
  supplierName: string;
  spend: number;
  share: number;
  poCount: number;
  riskLevel: RiskLevel;
}

export interface SupplierConcentrationResult {
  rows: SupplierRiskRow[];
  totalSpend: number;
  top1Share: number;
  top3Share: number;
  hhi: number;
  riskLevel: RiskLevel;
  score: number;
  insufficientData: boolean;
}

// ── Resource ──────────────────────────────────────────────────────────────────

export type ResourceType = 'team' | 'process' | 'department' | 'employee';

export interface ResourceRiskRow {
  resourceType: ResourceType;
  resourceName: string;
  output: number;
  outputUnit: string;
  share: number;
  dependencyLevel: RiskLevel;
  riskLevel: RiskLevel;
}

export interface ResourceConcentrationResult {
  rows: ResourceRiskRow[];
  totalOutput: number;
  outputUnit: string;
  topShare: number;
  riskLevel: RiskLevel;
  score: number;
  insufficientData: boolean;
}

// ── Revenue Timing ────────────────────────────────────────────────────────────

export interface MonthlyRevenuePoint {
  year: number;
  month: number;
  label: string;
  amount: number;
}

export interface RevenueTimingResult {
  monthly: MonthlyRevenuePoint[];
  averageMonthly: number;
  stdDev: number;
  cv: number;
  riskLevel: RiskLevel;
  score: number;
  insufficientData: boolean;
}

// ── Overall ───────────────────────────────────────────────────────────────────

export interface DimensionScore {
  name: string;
  score: number;
  weight: number;
  riskLevel: RiskLevel;
  contributedScore: number;
}

export interface OverallRiskResult {
  overallScore: number;
  riskLabel: RiskLevel;
  dimensions: DimensionScore[];
  customer: CustomerConcentrationResult;
  project: ProjectConcentrationResult;
  segment: SegmentConcentrationResult;
  supplier: SupplierConcentrationResult;
  resource: ResourceConcentrationResult;
  revenueTiming: RevenueTimingResult;
}

// ── Summary (API response) ────────────────────────────────────────────────────

export interface ConcentrationRiskSummary {
  overallScore: number;
  riskLabel: RiskLevel;
  customerHhi: number;
  topCustomerShare: number;
  largestProjectShare: number;
  topSupplierShare: number;
  revenueVolatilityCv: number;
  criticalBottleneckShare: number;
  dimensions: DimensionScore[];
  insufficientData: boolean;
}
