'use client';

import { cn } from '@/lib/utils';
import type {
  CustomerConcentrationResult,
  ProjectConcentrationResult,
  SegmentConcentrationResult,
  SupplierConcentrationResult,
  ResourceConcentrationResult,
  RevenueTimingResult,
  RiskLevel,
} from '@/lib/concentration-risk/types';
import { RiskBadge } from './ConcentrationRiskDashboard';

interface HeatmapRow {
  dimension: string;
  exposure: string;
  metric: string;
  metricLabel: string;
  riskLevel: RiskLevel;
  trigger: string;
  action: string;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function buildRows(
  customer: CustomerConcentrationResult,
  project: ProjectConcentrationResult,
  segment: SegmentConcentrationResult,
  supplier: SupplierConcentrationResult,
  resource: ResourceConcentrationResult,
  revenueTiming: RevenueTimingResult,
): HeatmapRow[] {
  const customerTrigger =
    customer.insufficientData ? 'No data'
    : customer.top1Share >= 0.25 ? `Top client ≥ 25% (${pct(customer.top1Share)})`
    : customer.top3Share >= 0.40 ? `Top 3 clients ≥ 40% (${pct(customer.top3Share)})`
    : customer.hhi >= 0.25 ? `HHI ≥ 0.25 (${customer.hhi.toFixed(3)})`
    : customer.top1Share >= 0.15 ? `Top client ≥ 15% (${pct(customer.top1Share)})`
    : 'Within thresholds';

  const projectTrigger =
    project.insufficientData ? 'No data'
    : project.largestShare >= 0.25 ? `Largest project ≥ 25% (${pct(project.largestShare)})`
    : project.largestShare >= 0.15 ? `Largest project ≥ 15% (${pct(project.largestShare)})`
    : 'Within thresholds';

  const segmentTrigger =
    segment.insufficientData ? 'No data'
    : segment.largestShare >= 0.50 ? `Largest segment ≥ 50% (${pct(segment.largestShare)})`
    : segment.largestShare >= 0.35 ? `Largest segment ≥ 35% (${pct(segment.largestShare)})`
    : 'Within thresholds';

  const supplierTrigger =
    supplier.insufficientData ? 'No data'
    : supplier.top1Share >= 0.40 ? `Top supplier ≥ 40% (${pct(supplier.top1Share)})`
    : supplier.top1Share >= 0.25 ? `Top supplier ≥ 25% (${pct(supplier.top1Share)})`
    : 'Within thresholds';

  const resourceTrigger =
    resource.insufficientData ? 'No data'
    : resource.topShare >= 0.40 ? `Top resource ≥ 40% (${pct(resource.topShare)})`
    : resource.topShare >= 0.25 ? `Top resource ≥ 25% (${pct(resource.topShare)})`
    : 'Within thresholds';

  const revTrigger =
    revenueTiming.insufficientData ? 'No data'
    : revenueTiming.cv >= 0.60 ? `CV ≥ 0.60 (${revenueTiming.cv.toFixed(2)})`
    : revenueTiming.cv >= 0.30 ? `CV ≥ 0.30 (${revenueTiming.cv.toFixed(2)})`
    : 'Within thresholds';

  return [
    {
      dimension: 'Customer',
      exposure: customer.insufficientData ? '—' : pct(customer.top1Share),
      metric: customer.insufficientData ? '—' : customer.hhi.toFixed(3),
      metricLabel: 'HHI',
      riskLevel: customer.riskLevel,
      trigger: customerTrigger,
      action: customer.riskLevel === 'low' ? 'No action required' : customer.top1Share >= 0.25 ? 'Diversify customer pipeline — reduce dependency on top client' : 'Monitor and build pipeline with new clients',
    },
    {
      dimension: 'Projects',
      exposure: project.insufficientData ? '—' : pct(project.largestShare),
      metric: project.insufficientData ? '—' : pct(project.top3Share),
      metricLabel: 'Top-3 Share',
      riskLevel: project.riskLevel,
      trigger: projectTrigger,
      action: project.riskLevel === 'low' ? 'No action required' : 'Increase project count; pursue smaller complementary contracts',
    },
    {
      dimension: 'Segments',
      exposure: segment.insufficientData ? '—' : pct(segment.largestShare),
      metric: segment.insufficientData ? '—' : segment.hhi.toFixed(3),
      metricLabel: 'HHI',
      riskLevel: segment.riskLevel,
      trigger: segmentTrigger,
      action: segment.riskLevel === 'low' ? 'No action required' : 'Pursue business development in under-represented market segments',
    },
    {
      dimension: 'Suppliers',
      exposure: supplier.insufficientData ? '—' : pct(supplier.top1Share),
      metric: supplier.insufficientData ? '—' : supplier.hhi.toFixed(3),
      metricLabel: 'HHI',
      riskLevel: supplier.riskLevel,
      trigger: supplierTrigger,
      action: supplier.riskLevel === 'low' ? 'No action required' : 'Secure alternate suppliers; dual-source critical materials',
    },
    {
      dimension: 'Operational Dependency',
      exposure: resource.insufficientData ? '—' : pct(resource.topShare),
      metric: '—',
      metricLabel: '—',
      riskLevel: resource.riskLevel,
      trigger: resourceTrigger,
      action: resource.riskLevel === 'low' ? 'No action required' : 'Cross-train backup resources; redistribute workload across teams',
    },
    {
      dimension: 'Revenue Timing',
      exposure: revenueTiming.insufficientData ? '—' : revenueTiming.cv.toFixed(2),
      metric: revenueTiming.insufficientData ? '—' : revenueTiming.averageMonthly > 0 ? `Avg ${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(revenueTiming.averageMonthly)} SAR/mo` : '—',
      metricLabel: 'Avg Monthly',
      riskLevel: revenueTiming.riskLevel,
      trigger: revTrigger,
      action: revenueTiming.riskLevel === 'low' ? 'No action required' : 'Smooth billing milestones; negotiate monthly retainers where possible',
    },
  ];
}

export function RiskHeatmap({
  customer, project, segment, supplier, resource, revenueTiming,
}: {
  customer: CustomerConcentrationResult;
  project: ProjectConcentrationResult;
  segment: SegmentConcentrationResult;
  supplier: SupplierConcentrationResult;
  resource: ResourceConcentrationResult;
  revenueTiming: RevenueTimingResult;
}) {
  const rows = buildRows(customer, project, segment, supplier, resource, revenueTiming);

  const rowBg = (level: RiskLevel) => {
    if (level === 'high' || level === 'critical') return 'bg-red-500/5 hover:bg-red-500/10';
    if (level === 'medium') return 'bg-amber-500/5 hover:bg-amber-500/10';
    return 'hover:bg-slate-800/30';
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-200">Risk Heatmap</h2>
        <p className="text-xs text-slate-500 mt-0.5">Concentration exposure across all dimensions</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-40">Dimension</th>
              <th className="px-4 py-3 text-right">Top Exposure</th>
              <th className="px-4 py-3 text-right">HHI / CV</th>
              <th className="px-4 py-3 text-center w-24">Risk Level</th>
              <th className="px-4 py-3 text-left">Trigger</th>
              <th className="px-4 py-3 text-left">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dimension} className={cn('border-b border-slate-800/50 transition-colors', rowBg(row.riskLevel))}>
                <td className="px-4 py-3 font-medium text-slate-200">{row.dimension}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">{row.exposure}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  <span>{row.metric}</span>
                  {row.metric !== '—' && <span className="text-xs text-slate-600 ml-1">({row.metricLabel})</span>}
                </td>
                <td className="px-4 py-3 text-center"><RiskBadge level={row.riskLevel} /></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{row.trigger}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
