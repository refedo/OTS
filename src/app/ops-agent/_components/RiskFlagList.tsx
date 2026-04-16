'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RiskFlag {
  id: string;
  entityType: string;
  entityLabel: string;
  severity: 'RED' | 'AMBER' | 'GREEN';
  agentNote: string;
  module: string;
  resolvedAt: string | null;
}

interface RiskFlagListProps {
  flags: Record<string, unknown>[];
  canResolve: boolean;
  onResolved: () => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  RED: 'bg-rose-100 text-rose-700 border-rose-200',
  AMBER: 'bg-amber-100 text-amber-700 border-amber-200',
  GREEN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const SEVERITY_ICON: Record<string, typeof AlertCircle> = {
  RED: AlertCircle,
  AMBER: AlertTriangle,
  GREEN: CheckCircle,
};

export function RiskFlagList({ flags, canResolve, onResolved }: RiskFlagListProps) {
  const [resolving, setResolving] = useState<string | null>(null);

  if (flags.length === 0) return null;

  const typedFlags = flags as unknown as RiskFlag[];
  const unresolved = typedFlags.filter((f) => !f.resolvedAt);
  const resolved = typedFlags.filter((f) => !!f.resolvedAt);

  const handleResolve = async (flagId: string) => {
    setResolving(flagId);
    try {
      await fetch(`/api/ops-agent/flags/${flagId}/resolve`, { method: 'PATCH' });
      onResolved();
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <p className="text-sm font-semibold text-slate-700">Risk Flags</p>
        <span className="text-xs text-slate-500">{unresolved.length} open · {resolved.length} resolved</span>
      </div>
      <div className="divide-y">
        {unresolved.map((flag) => {
          const Icon = SEVERITY_ICON[flag.severity] ?? AlertCircle;
          return (
            <div key={flag.id} className="px-6 py-4 flex items-start gap-3">
              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${flag.severity === 'RED' ? 'text-rose-500' : flag.severity === 'AMBER' ? 'text-amber-500' : 'text-emerald-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${SEVERITY_STYLES[flag.severity]}`}>
                    {flag.severity}
                  </span>
                  <span className="text-xs text-slate-500">{flag.module}</span>
                  <span className="text-xs font-medium text-slate-700 truncate">{flag.entityLabel}</span>
                </div>
                <p className="text-xs text-slate-500">{flag.agentNote}</p>
              </div>
              {canResolve && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 h-7 text-xs"
                  disabled={resolving === flag.id}
                  onClick={() => handleResolve(flag.id)}
                >
                  {resolving === flag.id ? '…' : 'Resolve'}
                </Button>
              )}
            </div>
          );
        })}
        {resolved.length > 0 && (
          <div className="px-6 py-3 text-xs text-slate-400">
            {resolved.length} resolved flag{resolved.length !== 1 ? 's' : ''} (hidden)
          </div>
        )}
      </div>
    </div>
  );
}
