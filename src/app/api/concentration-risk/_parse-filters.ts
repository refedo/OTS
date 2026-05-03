import type { RiskFilters, RiskLevel } from '@/lib/concentration-risk/types';

export function parseFilters(params: URLSearchParams): RiskFilters {
  const year = params.get('year');
  const riskLevel = params.get('riskLevel') as RiskLevel | null;

  return {
    startDate: params.get('startDate') ?? undefined,
    endDate: params.get('endDate') ?? undefined,
    year: year ? parseInt(year, 10) : undefined,
    customerId: params.get('customerId') ?? undefined,
    projectId: params.get('projectId') ?? undefined,
    segment: params.get('segment') ?? undefined,
    supplierId: params.get('supplierId') ?? undefined,
    departmentId: params.get('departmentId') ?? undefined,
    riskLevel: riskLevel ?? undefined,
  };
}
