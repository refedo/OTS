'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CashflowData {
  weeklyTrend: { week: string; tonnes: number }[];
  topProjectsThisWeek: {
    projectId: string;
    projectNumber: string;
    name: string;
    tonnesThisWeek: number;
  }[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-slate-400 mb-1">Week of {label}</p>
      <p className="text-emerald-400 font-medium">{payload[0].value.toFixed(1)} tonnes</p>
    </div>
  );
};

function formatWeek(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export function ProductionPulse({ data }: { data: CashflowData }) {
  const chartData = data.weeklyTrend.map(w => ({
    week: formatWeek(w.week),
    tonnes: w.tonnes,
  }));

  return (
    <div className="space-y-4">
      {/* Line chart */}
      <div className="h-44">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}t`}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="tonnes"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ fill: '#34d399', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No production data in last 30 days
          </div>
        )}
      </div>

      {/* Top 3 projects this week */}
      {data.topProjectsThisWeek.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
            Top this week
          </p>
          <div className="space-y-2">
            {data.topProjectsThisWeek.map((p, i) => (
              <div key={p.projectId} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-600 w-4">{i + 1}.</span>
                  <span className="text-xs text-slate-400 font-medium truncate">
                    {p.projectNumber}
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-medium whitespace-nowrap ml-2">
                  {p.tonnesThisWeek.toFixed(1)} t
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
