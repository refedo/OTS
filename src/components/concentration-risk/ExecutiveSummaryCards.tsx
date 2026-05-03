'use client';

import {
  Users,
  FolderKanban,
  Layers,
  Truck,
  Wrench,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConcentrationRiskSummary } from '@/lib/concentration-risk/types';

interface CardDef {
  label: string;
  value: string;
  subLabel: string;
  color: 'green' | 'amber' | 'orange' | 'red' | 'neutral';
  icon: React.ElementType;
  tooltip: string;
}

function getColor(value: number, lowThreshold: number, highThreshold: number): 'green' | 'amber' | 'orange' | 'red' {
  if (value >= highThreshold) return 'red';
  if (value >= lowThreshold) return 'amber';
  return 'green';
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

const colorMap: Record<string, { text: string; bg: string; border: string }> = {
  green:   { text: 'text-emerald-400',  bg: 'bg-emerald-400/10',  border: 'border-emerald-400/20' },
  amber:   { text: 'text-amber-400',    bg: 'bg-amber-400/10',    border: 'border-amber-400/20' },
  orange:  { text: 'text-orange-400',   bg: 'bg-orange-400/10',   border: 'border-orange-400/20' },
  red:     { text: 'text-red-400',      bg: 'bg-red-400/10',      border: 'border-red-400/20' },
  neutral: { text: 'text-slate-300',    bg: 'bg-slate-400/10',    border: 'border-slate-400/20' },
};

function SummaryCard({ card }: { card: CardDef }) {
  const Icon = card.icon;
  const c = colorMap[card.color];
  return (
    <div className={cn(
      'relative bg-slate-900/60 border rounded-xl p-4 flex flex-col gap-2',
      c.border
    )}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', c.bg)}>
          <Icon className={cn('h-4 w-4', c.text)} />
        </div>
        <span className={cn('text-2xl font-bold', c.text)}>{card.value}</span>
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{card.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{card.subLabel}</p>
      </div>
    </div>
  );
}

export function ExecutiveSummaryCards({ summary }: { summary: ConcentrationRiskSummary }) {
  const cards: CardDef[] = [
    {
      label: 'Overall Risk Score',
      value: String(summary.overallScore),
      subLabel: `${summary.riskLabel.toUpperCase()} — weighted across 6 dimensions`,
      color: summary.overallScore >= 80 ? 'red' : summary.overallScore >= 60 ? 'orange' : summary.overallScore >= 31 ? 'amber' : 'green',
      icon: ShieldAlert,
      tooltip: 'Deterministic weighted score 0–100 across all risk dimensions',
    },
    {
      label: 'Customer HHI',
      value: summary.customerHhi.toFixed(3),
      subLabel: summary.customerHhi >= 0.25 ? 'High concentration' : summary.customerHhi >= 0.15 ? 'Moderate concentration' : 'Diversified',
      color: getColor(summary.customerHhi, 0.15, 0.25),
      icon: Users,
      tooltip: 'Herfindahl-Hirschman Index — sum of squared customer shares',
    },
    {
      label: 'Top Customer Exposure',
      value: pct(summary.topCustomerShare),
      subLabel: summary.topCustomerShare >= 0.25 ? 'Single-point-of-failure risk' : summary.topCustomerShare >= 0.15 ? 'Warning threshold exceeded' : 'Within safe range',
      color: getColor(summary.topCustomerShare, 0.15, 0.25),
      icon: Users,
      tooltip: 'Largest single customer as % of total contract exposure',
    },
    {
      label: 'Largest Project Exposure',
      value: pct(summary.largestProjectShare),
      subLabel: summary.largestProjectShare >= 0.25 ? 'Overexposed to single project' : summary.largestProjectShare >= 0.15 ? 'Monitor closely' : 'Diversified portfolio',
      color: getColor(summary.largestProjectShare, 0.15, 0.25),
      icon: FolderKanban,
      tooltip: 'Largest single project as % of total contract value',
    },
    {
      label: 'Top Supplier Spend',
      value: summary.topSupplierShare > 0 ? pct(summary.topSupplierShare) : '—',
      subLabel: summary.topSupplierShare >= 0.40 ? 'Critical supplier dependency' : summary.topSupplierShare >= 0.25 ? 'Moderate supplier risk' : summary.topSupplierShare === 0 ? 'No procurement data' : 'Acceptable range',
      color: summary.topSupplierShare === 0 ? 'neutral' : getColor(summary.topSupplierShare, 0.25, 0.40),
      icon: Truck,
      tooltip: 'Top supplier as % of total procurement spend (LCR data)',
    },
    {
      label: 'Revenue Volatility (CV)',
      value: summary.revenueVolatilityCv > 0 ? summary.revenueVolatilityCv.toFixed(2) : '—',
      subLabel: summary.revenueVolatilityCv >= 0.60 ? 'Highly irregular cash flow' : summary.revenueVolatilityCv >= 0.30 ? 'Moderate seasonal variance' : summary.revenueVolatilityCv === 0 ? 'No receipt data' : 'Stable monthly flow',
      color: summary.revenueVolatilityCv === 0 ? 'neutral' : getColor(summary.revenueVolatilityCv, 0.30, 0.60),
      icon: TrendingUp,
      tooltip: 'Coefficient of variation of monthly payment receipts',
    },
    {
      label: 'Critical Bottleneck',
      value: summary.criticalBottleneckShare > 0 ? pct(summary.criticalBottleneckShare) : '—',
      subLabel: summary.criticalBottleneckShare >= 0.40 ? 'Single-point-of-failure in operations' : summary.criticalBottleneckShare >= 0.25 ? 'High operational dependency' : summary.criticalBottleneckShare === 0 ? 'No production data' : 'Distributed workload',
      color: summary.criticalBottleneckShare === 0 ? 'neutral' : getColor(summary.criticalBottleneckShare, 0.25, 0.40),
      icon: Wrench,
      tooltip: 'Top resource (team/process) as % of total production output',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} card={card} />
      ))}
    </div>
  );
}
