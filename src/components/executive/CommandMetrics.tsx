'use client';

import { TrendingUp, TrendingDown, Minus, Building2, Factory, Wallet, Package, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CommandMetric {
  label: string;
  value: string;
  subLabel: string;
  trend: number;
  color: 'green' | 'amber' | 'red' | 'neutral';
  icon: React.ElementType;
  href: string;
}

interface SummaryData {
  activeProjects: { count: number; buildings: number; tonnes: number; trend: number };
  productionVelocity: { tonnesThisMonth: number; monthlyTarget: number; percentage: number; trend: number };
  collectionRate: { percentage: number; pendingSAR: number; trend: number };
  procurementExposure: { count: number; estimatedValue: number; trend: number };
  openRiskFlags: { count: number; critical: number; warnings: number; trend: number };
}

function formatSAR(value: number): string {
  return new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(value);
}

function getProductionColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 90) return 'green';
  if (pct >= 70) return 'amber';
  return 'red';
}

function getCollectionColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 85) return 'green';
  if (pct >= 70) return 'amber';
  return 'red';
}

function getProcurementColor(count: number): 'green' | 'amber' | 'red' {
  if (count === 0) return 'green';
  if (count <= 5) return 'amber';
  return 'red';
}

function getRiskColor(critical: number): 'green' | 'amber' | 'red' {
  if (critical === 0) return 'green';
  if (critical <= 3) return 'amber';
  return 'red';
}

const colorMap: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  green:   { text: 'text-emerald-400',  bg: 'bg-emerald-400/10',  border: 'border-emerald-400/20', glow: 'shadow-emerald-400/10' },
  amber:   { text: 'text-amber-400',    bg: 'bg-amber-400/10',    border: 'border-amber-400/20',   glow: 'shadow-amber-400/10' },
  red:     { text: 'text-red-400',      bg: 'bg-red-400/10',      border: 'border-red-400/20',     glow: 'shadow-red-400/10' },
  neutral: { text: 'text-slate-300',    bg: 'bg-slate-400/10',    border: 'border-slate-400/20',   glow: 'shadow-slate-400/10' },
};

function MetricCard({ metric }: { metric: CommandMetric }) {
  const colors = colorMap[metric.color];
  const Icon = metric.icon;

  return (
    <Link href={metric.href}>
      <div
        className={cn(
          'relative rounded-xl border p-5 cursor-pointer transition-all duration-200',
          'hover:scale-[1.02] hover:shadow-lg',
          'bg-slate-900/80 backdrop-blur-sm',
          colors.border,
          colors.glow,
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <Icon className={cn('size-5', colors.text)} />
          </div>
          <TrendBadge trend={metric.trend} />
        </div>
        <div className={cn('text-3xl font-bold tracking-tight mb-1', colors.text)}>
          {metric.value}
        </div>
        <div className="text-xs text-slate-400 font-medium truncate">{metric.label}</div>
        <div className="text-xs text-slate-500 mt-1 truncate">{metric.subLabel}</div>
      </div>
    </Link>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  if (Math.abs(trend) < 0.5) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-slate-500">
        <Minus className="size-3" />
        0%
      </span>
    );
  }
  const positive = trend > 0;
  return (
    <span
      className={cn(
        'flex items-center gap-0.5 text-xs font-medium',
        positive ? 'text-emerald-400' : 'text-red-400',
      )}
    >
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {Math.abs(Math.round(trend * 10) / 10)}%
    </span>
  );
}

export function CommandMetrics({ data }: { data: SummaryData }) {
  const metrics: CommandMetric[] = [
    {
      label: 'Active Projects',
      value: String(data.activeProjects.count),
      subLabel: `${data.activeProjects.buildings} buildings · ${data.activeProjects.tonnes.toLocaleString()} t contracted`,
      trend: data.activeProjects.trend,
      color: 'neutral',
      icon: Building2,
      href: '/projects',
    },
    {
      label: 'Production Velocity',
      value: `${data.productionVelocity.tonnesThisMonth.toLocaleString()} t`,
      subLabel: `${data.productionVelocity.percentage.toFixed(1)}% of monthly target`,
      trend: data.productionVelocity.trend,
      color: getProductionColor(data.productionVelocity.percentage),
      icon: Factory,
      href: '/production',
    },
    {
      label: 'Collection Rate',
      value: `${data.collectionRate.percentage.toFixed(1)}%`,
      subLabel: `SAR ${formatSAR(data.collectionRate.pendingSAR)} pending`,
      trend: data.collectionRate.trend,
      color: getCollectionColor(data.collectionRate.percentage),
      icon: Wallet,
      href: '/financial/reports/payment-schedule',
    },
    {
      label: 'Procurement Exposure',
      value: String(data.procurementExposure.count),
      subLabel: `SAR ${formatSAR(data.procurementExposure.estimatedValue)} est. value`,
      trend: -data.procurementExposure.trend,
      color: getProcurementColor(data.procurementExposure.count),
      icon: Package,
      href: '/supply-chain/lcr',
    },
    {
      label: 'Open Risk Flags',
      value: String(data.openRiskFlags.count),
      subLabel: `${data.openRiskFlags.critical} critical · ${data.openRiskFlags.warnings} warnings`,
      trend: -data.openRiskFlags.trend,
      color: getRiskColor(data.openRiskFlags.critical),
      icon: AlertTriangle,
      href: '/risk-dashboard',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map(m => (
        <MetricCard key={m.label} metric={m} />
      ))}
    </div>
  );
}
