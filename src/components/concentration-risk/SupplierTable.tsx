'use client';

import type { SupplierConcentrationResult } from '@/lib/concentration-risk/types';
import { RiskBadge, MetricBox, InsufficientData, formatSAR } from './ConcentrationRiskDashboard';

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

export function SupplierTable({ data }: { data: SupplierConcentrationResult }) {
  if (data.insufficientData) return <InsufficientData label="supplier" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Suppliers" value={String(data.rows.length)} />
        <MetricBox label="Top Supplier" value={`${(data.top1Share * 100).toFixed(1)}%`} risk={data.riskLevel} />
        <MetricBox label="Top 3 Suppliers" value={`${(data.top3Share * 100).toFixed(1)}%`} risk={data.top3Share >= 0.70 ? 'high' : data.top3Share >= 0.50 ? 'medium' : 'low'} />
        <MetricBox label="Supplier HHI" value={data.hhi.toFixed(4)} risk={data.riskLevel} />
      </div>

      <div className="text-xs text-slate-500 px-1">
        Procurement spend sourced from <span className="text-slate-400 font-medium">LCR procurement entries</span> (LcrEntry.amount by awardedToRaw).
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-right">Spend (SAR)</th>
                <th className="px-4 py-3 text-right min-w-[140px]">Spend %</th>
                <th className="px-4 py-3 text-right">PO Count</th>
                <th className="px-4 py-3 text-center">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, idx) => (
                <tr key={row.supplierName} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{row.supplierName}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{formatSAR(row.spend)}</td>
                  <td className="px-4 py-3"><MiniBar share={row.share} /></td>
                  <td className="px-4 py-3 text-right text-slate-400">{row.poCount}</td>
                  <td className="px-4 py-3 text-center"><RiskBadge level={row.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.rows.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">No supplier data found</div>
        )}
      </div>
    </div>
  );
}
