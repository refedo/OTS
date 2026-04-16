'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface RunHistoryListProps {
  onSelectRun: (run: Record<string, unknown>) => void;
  activeRunId?: string;
}

interface RunSummary {
  id: string;
  createdAt: string;
  status: string;
  triggerType: string;
  mode: string;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  _count: { riskFlags: number };
}

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  COMPLETED: CheckCircle,
  FAILED: XCircle,
  RUNNING: Loader2,
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'text-emerald-500',
  FAILED: 'text-rose-500',
  RUNNING: 'text-indigo-500',
};

export function RunHistoryList({ onSelectRun, activeRunId }: RunHistoryListProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/ops-agent/runs?limit=10');
        if (res.ok) {
          const data = await res.json();
          setRuns(data.runs ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeRunId]);

  const handleClick = async (runId: string) => {
    const res = await fetch(`/api/ops-agent/run/${runId}`);
    if (res.ok) onSelectRun(await res.json());
  };

  if (loading) return null;
  if (runs.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-6 py-4 border-b">
        <p className="text-sm font-semibold text-slate-700">Run History</p>
      </div>
      <div className="divide-y">
        {runs.map((run) => {
          const Icon = STATUS_ICON[run.status] ?? Loader2;
          const isActive = activeRunId === run.id;
          return (
            <button
              key={run.id}
              onClick={() => handleClick(run.id)}
              className={`w-full px-6 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors ${isActive ? 'bg-indigo-50' : ''}`}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${STATUS_COLORS[run.status] ?? 'text-slate-400'} ${run.status === 'RUNNING' ? 'animate-spin' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    {new Date(run.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', hour12: false })}
                  </span>
                  <span className="text-xs text-slate-400">{run.triggerType}</span>
                  <span className="text-xs text-slate-400">{run.mode}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400">
                    {run._count.riskFlags} flag{run._count.riskFlags !== 1 ? 's' : ''}
                  </span>
                  {run.durationMs && (
                    <span className="text-xs text-slate-400">{(run.durationMs / 1000).toFixed(1)}s</span>
                  )}
                  {run.inputTokens !== null && (
                    <span className="text-xs text-slate-400">
                      {((run.inputTokens ?? 0) + (run.outputTokens ?? 0)).toLocaleString()} tokens
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
