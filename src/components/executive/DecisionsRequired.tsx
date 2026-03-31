'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  CheckSquare,
  CreditCard,
  Package,
  AlertOctagon,
  Timer,
  ChevronRight,
} from 'lucide-react';

type DecisionCategory =
  | 'task_approval'
  | 'payment_action'
  | 'procurement_urgent'
  | 'ncr_critical'
  | 'project_overrun';

interface DecisionItem {
  id: string;
  category: DecisionCategory;
  description: string;
  projectRef: string | null;
  daysOverdue: number;
  actionLink: string;
  urgency: 'critical' | 'high' | 'medium';
}

const categoryConfig: Record<
  DecisionCategory,
  { icon: React.ElementType; label: string; color: string }
> = {
  task_approval:       { icon: CheckSquare,   label: 'Approval',    color: 'text-blue-400' },
  payment_action:      { icon: CreditCard,    label: 'Payment',     color: 'text-amber-400' },
  procurement_urgent:  { icon: Package,       label: 'Procurement', color: 'text-orange-400' },
  ncr_critical:        { icon: AlertOctagon,  label: 'NCR',         color: 'text-red-400' },
  project_overrun:     { icon: Timer,         label: 'Overrun',     color: 'text-red-500' },
};

const urgencyConfig: Record<
  DecisionItem['urgency'],
  { bg: string; border: string; dot: string }
> = {
  critical: { bg: 'bg-red-500/5',    border: 'border-l-red-500',    dot: 'bg-red-500' },
  high:     { bg: 'bg-amber-500/5',  border: 'border-l-amber-500',  dot: 'bg-amber-500' },
  medium:   { bg: 'bg-blue-500/5',   border: 'border-l-blue-500',   dot: 'bg-blue-400' },
};

function DecisionCard({ item }: { item: DecisionItem }) {
  const cat = categoryConfig[item.category];
  const urg = urgencyConfig[item.urgency];
  const Icon = cat.icon;

  return (
    <Link href={item.actionLink}>
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg p-3 border-l-2 cursor-pointer',
          'transition-colors duration-100 hover:bg-slate-800/60',
          urg.bg,
          urg.border,
        )}
      >
        <div className={cn('mt-0.5 shrink-0', cat.color)}>
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-xs font-semibold uppercase tracking-wide', cat.color)}>
              {cat.label}
            </span>
            {item.projectRef && (
              <span className="text-xs text-slate-500 font-mono">{item.projectRef}</span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-snug line-clamp-2">{item.description}</p>
          {item.daysOverdue > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              <span className={cn('font-medium', item.urgency === 'critical' ? 'text-red-400' : 'text-amber-400')}>
                {item.daysOverdue}d
              </span>{' '}
              overdue
            </p>
          )}
        </div>
        <ChevronRight className="size-4 text-slate-600 shrink-0 mt-0.5" />
      </div>
    </Link>
  );
}

export function DecisionsRequired({ items }: { items: DecisionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="size-10 rounded-full bg-emerald-400/10 flex items-center justify-center mb-3">
          <CheckSquare className="size-5 text-emerald-400" />
        </div>
        <p className="text-emerald-400 font-medium text-sm">All clear</p>
        <p className="text-slate-500 text-xs mt-1">No decisions required right now</p>
      </div>
    );
  }

  const critical = items.filter(i => i.urgency === 'critical');
  const rest = items.filter(i => i.urgency !== 'critical');

  return (
    <div className="space-y-2">
      {critical.length > 0 && (
        <>
          <p className="text-xs text-red-400 uppercase tracking-wider font-semibold mb-1">
            Critical ({critical.length})
          </p>
          {critical.map(item => (
            <DecisionCard key={item.id} item={item} />
          ))}
        </>
      )}
      {rest.length > 0 && (
        <>
          {critical.length > 0 && (
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold pt-1">
              Other ({rest.length})
            </p>
          )}
          {rest.map(item => (
            <DecisionCard key={item.id} item={item} />
          ))}
        </>
      )}
    </div>
  );
}
