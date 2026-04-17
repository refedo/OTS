'use client';

import { useState } from 'react';
import { Play, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RunTriggerCardProps {
  canRun: boolean;
  latestRun: Record<string, unknown> | null;
  activeRunId: string | null;
  onRunStarted: (runId: string) => void;
  onRunComplete: () => void;
}

const STATUS_MESSAGES = [
  'Sweeping tasks…',
  'Analyzing projects…',
  'Checking HR flags…',
  'Scanning pipeline…',
  'Reviewing system events…',
  'Synthesizing ops brief…',
];

export function RunTriggerCard({ canRun, latestRun, activeRunId, onRunStarted, onRunComplete }: RunTriggerCardProps) {
  const [loading, setLoading] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);

  const isRunning = !!activeRunId;

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ops-agent/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start run');

      const interval = setInterval(() => {
        setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
      }, 4000);

      onRunStarted(data.runId ?? 'pending');

      setTimeout(() => {
        clearInterval(interval);
        setStatusIdx(0);
        onRunComplete();
        setLoading(false);
      }, 60000);
    } catch {
      setLoading(false);
    }
  };

  const status = latestRun?.status as string | undefined;
  const createdAt = latestRun?.createdAt as string | undefined;
  const durationMs = latestRun?.durationMs as number | undefined;
  const inputTokens = latestRun?.inputTokens as number | undefined;
  const outputTokens = latestRun?.outputTokens as number | undefined;
  const errorMessage = latestRun?.errorMessage as string | undefined;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <p className="text-sm font-semibold text-slate-700">Run Ops Agent</p>
          {createdAt && !isRunning && (
            <p className="text-xs text-slate-400 mt-0.5">
              Last run: {new Date(createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === 'COMPLETED' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
          {status === 'FAILED' && <XCircle className="h-4 w-4 text-rose-500" />}
          {status === 'RUNNING' && <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />}
          {canRun && (
            <Button
              size="sm"
              onClick={handleRun}
              disabled={loading || isRunning}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Run Now
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="px-6 py-4 flex items-center gap-2 text-indigo-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm animate-pulse">{STATUS_MESSAGES[statusIdx]}</span>
        </div>
      )}

      {!isRunning && durationMs && (
        <div className="px-6 py-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {(durationMs / 1000).toFixed(1)}s
            </span>
            {inputTokens !== undefined && (
              <span>{((inputTokens ?? 0) + (outputTokens ?? 0)).toLocaleString()} tokens</span>
            )}
            <span className={`font-medium ${status === 'COMPLETED' ? 'text-emerald-600' : status === 'FAILED' ? 'text-rose-600' : 'text-slate-500'}`}>
              {status}
            </span>
          </div>
          {status === 'FAILED' && errorMessage && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2 break-words">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
