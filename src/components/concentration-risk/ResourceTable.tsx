'use client';

import type { ResourceConcentrationResult } from '@/lib/concentration-risk/types';
import { RiskBadge, MetricBox, InsufficientData } from './ConcentrationRiskDashboard';

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  team: 'Production Team',
  process: 'Process Stage',
  department: 'Department',
  employee: 'Operator',
};

function MiniBar({ share }: { share: number }) {
  const pct = Math.min(share * 100, 100);
  const color = share >= 0.40 ? 'bg-red-500' : share >= 0.25 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-right w-12 text-xs font-mono">{pct.toFixed(1)}%</span>
      <div className="flex-1 bg-slate-700/50 rounded-full h-1.5 min-w-[60px]">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ResourceTable({ data }: { data: ResourceConcentrationResult }) {
  if (data.insufficientData) return <InsufficientData label="production" />;

  const topShare = data.topShare;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Resources Tracked" value={String(data.rows.length)} />
        <MetricBox label="Top Dependency" value={`${(topShare * 100).toFixed(1)}%`} risk={data.riskLevel} />
        <MetricBox label="Total Output" value={`${data.totalOutput.toFixed(0)} ${data.outputUnit}`} />
        <MetricBox label="Risk Level" value={data.riskLevel.toUpperCase()} risk={data.riskLevel} />
      </div>

      <div className="text-xs text-slate-500 px-1">
        Operational dependency analysis — sourced from production logs.{' '}
        Output unit: <span className="text-slate-400 font-medium">{data.outputUnit}</span>.
        This identifies process concentration, not individual performance.
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Resource / Process</th>
                <th className="px-4 py-3 text-right">Output</th>
                <th className="px-4 py-3 text-right min-w-[140px]">Output %</th>
                <th className="px-4 py-3 text-center">Dependency Level</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, idx) => (
                <tr key={`${row.resourceType}-${row.resourceName}-${idx}`} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 text-xs bg-slate-700/50 text-slate-400 rounded">
                      {RESOURCE_TYPE_LABELS[row.resourceType] ?? row.resourceType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">{row.resourceName}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {row.output.toFixed(1)} <span className="text-slate-500 text-xs">{row.outputUnit}</span>
                  </td>
                  <td className="px-4 py-3"><MiniBar share={row.share} /></td>
                  <td className="px-4 py-3 text-center"><RiskBadge level={row.dependencyLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.rows.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">No production data found</div>
        )}
      </div>
    </div>
  );
}
