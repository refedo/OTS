'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RevenueTimingResult } from '@/lib/concentration-risk/types';
import { MetricBox, InsufficientData, RiskBadge } from './ConcentrationRiskDashboard';

function formatSARCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(Math.round(value));
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white font-semibold">
        {new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(value)} SAR
      </p>
    </div>
  );
}

export function RevenueTimingChart({ data }: { data: RevenueTimingResult }) {
  if (data.insufficientData) return <InsufficientData label="payment receipt" />;

  const barColor = (value: number) => {
    if (value > data.averageMonthly * 1.5) return '#f97316';
    if (value === 0) return '#475569';
    return '#8b5cf6';
  };

  const chartData = data.monthly.map((p) => ({
    label: p.label,
    amount: p.amount,
    fill: barColor(p.amount),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox
          label="Average Monthly"
          value={`${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(data.averageMonthly)} SAR`}
        />
        <MetricBox label="Std Deviation" value={`${new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(data.stdDev)} SAR`} />
        <MetricBox
          label="Coeff. of Variation"
          value={data.cv.toFixed(3)}
          risk={data.cv >= 0.60 ? 'high' : data.cv >= 0.30 ? 'medium' : 'low'}
        />
        <MetricBox label="Timing Risk" value={data.riskLevel.toUpperCase()} risk={data.riskLevel} />
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Monthly Payment Receipts</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              CV = {data.cv.toFixed(3)} — <RiskBadge level={data.riskLevel} />
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-violet-500" />Monthly receipts</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-amber-400" />Average</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatSARCompact}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <ReferenceLine
              y={data.averageMonthly}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Avg', position: 'right', fill: '#f59e0b', fontSize: 10 }}
            />
            <Bar dataKey="amount" radius={[3, 3, 0, 0]} fill="#8b5cf6">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
            <p className="text-slate-500">Interpretation</p>
            <p className="text-slate-300 mt-0.5">
              {data.cv < 0.30
                ? 'Revenue timing is stable. Cash flow is predictable and well-distributed throughout the year.'
                : data.cv < 0.60
                ? 'Moderate revenue concentration. Some months receive significantly more than average — consider smoothing billing milestones.'
                : 'High revenue volatility. Cash flow is highly irregular — significant risk of cash shortfalls. Review milestone billing structure.'}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
            <p className="text-slate-500">Recommended Action</p>
            <p className="text-slate-300 mt-0.5">
              {data.cv < 0.30
                ? 'Maintain current billing cadence.'
                : data.cv < 0.60
                ? 'Negotiate monthly or bi-monthly progress payment structures on large contracts.'
                : 'Restructure milestone billing across portfolio. Align delivery milestones with cash needs.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
