'use client';

import type { ProjectConcentrationResult } from '@/lib/concentration-risk/types';
import { RiskBadge, MetricBox, InsufficientData, formatSAR } from './ConcentrationRiskDashboard';

const STATUS_COLORS: Record<string, string> = {
  Active:     'bg-emerald-500/20 text-emerald-400',
  Completed:  'bg-blue-500/20 text-blue-400',
  Draft:      'bg-slate-500/20 text-slate-400',
  'On Hold':  'bg-amber-500/20 text-amber-400',
  Cancelled:  'bg-red-500/20 text-red-400',
};

function MiniBar({ share }: { share: number }) {
  const pct = Math.min(share * 100, 100);
  const color = share >= 0.25 ? 'bg-red-500' : share >= 0.15 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-right w-12 text-xs font-mono">{pct.toFixed(1)}%</span>
      <div className="flex-1 bg-slate-700/50 rounded-full h-1.5 min-w-[60px]">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ProjectTable({ data }: { data: ProjectConcentrationResult }) {
  if (data.insufficientData) return <InsufficientData label="project" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Projects" value={String(data.rows.length)} />
        <MetricBox label="Largest Project" value={`${(data.largestShare * 100).toFixed(1)}%`} risk={data.riskLevel} />
        <MetricBox label="Top 3 Projects" value={`${(data.top3Share * 100).toFixed(1)}%`} risk={data.top3Share >= 0.5 ? 'high' : data.top3Share >= 0.35 ? 'medium' : 'low'} />
        <MetricBox label="Top 5 Projects" value={`${(data.top5Share * 100).toFixed(1)}%`} />
      </div>

      <div className="text-xs text-slate-500 px-1">
        Values shown are <span className="text-slate-400 font-medium">contract value</span> (Project.contractValue), not invoiced revenue.
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-right">Contract Value (SAR)</th>
                <th className="px-4 py-3 text-right min-w-[140px]">Share %</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, idx) => (
                <tr key={row.projectId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{row.projectNumber}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">{row.projectName}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{row.customerName}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{formatSAR(row.contractValue)}</td>
                  <td className="px-4 py-3"><MiniBar share={row.share} /></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[row.status] ?? STATUS_COLORS.Draft}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center"><RiskBadge level={row.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.rows.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">No project data found</div>
        )}
      </div>
    </div>
  );
}
