'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CashflowData {
  thisMonth: { cashIn: number; cashOut: number; net: number };
  next30Days: { projectedIn: number; projectedOut: number; netPosition: number };
  weeklyTrend: { week: string; tonnes: number }[];
  topProjectsThisWeek: { projectId: string; projectNumber: string; name: string; tonnesThisWeek: number }[];
}

function formatSAR(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return String(value);
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: SAR {new Intl.NumberFormat('en-SA').format(p.value)}
        </p>
      ))}
    </div>
  );
};

export function CashFlowSnapshot({ data }: { data: CashflowData }) {
  const barData = [
    { name: 'This Month', cashIn: data.thisMonth.cashIn, cashOut: data.thisMonth.cashOut },
    {
      name: 'Next 30 Days',
      cashIn: data.next30Days.projectedIn,
      cashOut: data.next30Days.projectedOut,
    },
  ];

  const netPositive = data.next30Days.netPosition >= 0;

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${formatSAR(v)}`}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cashIn" name="Cash In" fill="#34d399" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cashOut" name="Cash Out" fill="#f87171" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net positions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 mb-1">This Month Net</p>
          <p
            className={cn(
              'text-lg font-bold',
              data.thisMonth.net >= 0 ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            SAR {formatSAR(data.thisMonth.net)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 mb-1">Next 30d Net</p>
          <div className="flex items-center gap-1">
            {netPositive ? (
              <TrendingUp className="size-4 text-emerald-400" />
            ) : (
              <TrendingDown className="size-4 text-red-400" />
            )}
            <p className={cn('text-lg font-bold', netPositive ? 'text-emerald-400' : 'text-red-400')}>
              SAR {formatSAR(Math.abs(data.next30Days.netPosition))}
            </p>
          </div>
        </div>
      </div>

      {/* Projections detail */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Projected collections (30d)</span>
          <span className="text-emerald-400 font-medium">
            SAR {new Intl.NumberFormat('en-SA').format(data.next30Days.projectedIn)}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Projected payables (30d)</span>
          <span className="text-red-400 font-medium">
            SAR {new Intl.NumberFormat('en-SA').format(data.next30Days.projectedOut)}
          </span>
        </div>
      </div>
    </div>
  );
}
