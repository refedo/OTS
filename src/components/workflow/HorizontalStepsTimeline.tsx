'use client';

import { CheckCircle, XCircle, AlertCircle, SkipForward, Circle } from 'lucide-react';

interface Step {
  id: string;
  sequence: number;
  status: 'PENDING' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  name: string;
  completedAt?: string | null;
  activatedAt?: string | null;
}

interface HorizontalStepsTimelineProps {
  steps: Step[];
  compact?: boolean;
}

function formatStepDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-SA-u-ca-gregory', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function stepConfig(status: Step['status']) {
  switch (status) {
    case 'APPROVED':
      return {
        circle: 'bg-emerald-500 border-emerald-500',
        icon: CheckCircle,
        iconClass: 'text-white',
        label: 'Approved',
        ring: '',
      };
    case 'ACTIVE':
      return {
        circle: 'bg-red-500 border-red-500 ring-2 ring-red-300 ring-offset-1',
        icon: AlertCircle,
        iconClass: 'text-white',
        label: 'In Review',
        ring: 'ring-2 ring-red-300 ring-offset-1',
      };
    case 'REJECTED':
      return {
        circle: 'bg-red-600 border-red-600',
        icon: XCircle,
        iconClass: 'text-white',
        label: 'Rejected',
        ring: '',
      };
    case 'SKIPPED':
      return {
        circle: 'bg-slate-300 border-slate-300',
        icon: SkipForward,
        iconClass: 'text-white',
        label: 'Skipped',
        ring: '',
      };
    default:
      return {
        circle: 'bg-white border-2 border-dashed border-slate-300',
        icon: Circle,
        iconClass: 'text-slate-300',
        label: 'Pending',
        ring: '',
      };
  }
}

function lineColor(left: Step, right: Step): string {
  if (left.status === 'APPROVED' && right.status === 'APPROVED') return 'bg-emerald-400';
  if (left.status === 'APPROVED' && (right.status === 'ACTIVE' || right.status === 'REJECTED')) return 'bg-red-400';
  return 'bg-slate-200';
}

// Deduplicate steps by sequence (keep ACTIVE or latest status over PENDING duplicates from RESTART)
function deduplicateSteps(steps: Step[]): Step[] {
  const map = new Map<number, Step>();
  for (const s of steps) {
    const existing = map.get(s.sequence);
    if (!existing) {
      map.set(s.sequence, s);
    } else if (
      s.status === 'ACTIVE' ||
      (s.status !== 'PENDING' && existing.status === 'PENDING')
    ) {
      map.set(s.sequence, s);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.sequence - b.sequence);
}

export function HorizontalStepsTimeline({ steps, compact = false }: HorizontalStepsTimelineProps) {
  const dedupedSteps = deduplicateSteps(steps);

  if (dedupedSteps.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-0" style={{ minWidth: `${dedupedSteps.length * 80}px` }}>
        {dedupedSteps.map((step, idx) => {
          const cfg = stepConfig(step.status);
          const Icon = cfg.icon;
          const isLast = idx === dedupedSteps.length - 1;
          const dateLabel = step.status === 'APPROVED'
            ? formatStepDate(step.completedAt)
            : step.status === 'ACTIVE'
            ? formatStepDate(step.activatedAt)
            : null;

          return (
            <div key={step.id} className="flex items-start flex-1 min-w-0">
              {/* Step node */}
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Circle */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border ${cfg.circle} shadow-sm`}
                >
                  <Icon className={`w-5 h-5 ${cfg.iconClass}`} />
                </div>

                {!compact && (
                  <>
                    {/* Step name */}
                    <p
                      className="mt-1.5 text-xs font-medium text-slate-700 text-center leading-tight"
                      style={{ maxWidth: '80px', wordBreak: 'break-word' }}
                      title={step.name}
                    >
                      {step.name.length > 18 ? step.name.slice(0, 16) + '…' : step.name}
                    </p>
                    {/* Date */}
                    <p className="mt-0.5 text-xs text-slate-400 text-center" style={{ maxWidth: '80px' }}>
                      {dateLabel ?? '—'}
                    </p>
                  </>
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="flex-1 flex items-center" style={{ paddingTop: '19px' }}>
                  <div className={`h-0.5 w-full ${lineColor(step, dedupedSteps[idx + 1])}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
