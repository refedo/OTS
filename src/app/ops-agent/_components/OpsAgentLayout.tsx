'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radar } from 'lucide-react';
import { ComparisonBanner } from './ComparisonBanner';
import { RunTriggerCard } from './RunTriggerCard';
import { OpsBriefView } from './OpsBriefView';
import { RiskFlagList } from './RiskFlagList';
import { RunHistoryList } from './RunHistoryList';
import { ModeSwitcher } from './ModeSwitcher';
import { ThresholdEditor } from './ThresholdEditor';
import { AiProviderSettings } from './AiProviderSettings';

interface OpsAgentLayoutProps {
  canRun: boolean;
  canConfigure: boolean;
  canResolveFlags: boolean;
}

export function OpsAgentLayout({ canRun, canConfigure, canResolveFlags }: OpsAgentLayoutProps) {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<Record<string, unknown> | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const loadLatestRun = useCallback(async () => {
    const res = await fetch('/api/ops-agent/runs?limit=1');
    if (!res.ok) return;
    const data = await res.json();
    if (data.runs?.[0]) {
      const runRes = await fetch(`/api/ops-agent/run/${data.runs[0].id}`);
      if (runRes.ok) setLatestRun(await runRes.json());
    }
  }, []);

  const loadConfig = useCallback(async () => {
    const res = await fetch('/api/ops-agent/config');
    if (res.ok) setConfig(await res.json());
  }, []);

  useEffect(() => {
    loadLatestRun();
    loadConfig();
  }, [loadLatestRun, loadConfig]);

  useEffect(() => {
    if (!activeRunId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/ops-agent/run/${activeRunId}`);
      if (!res.ok) return;
      const run = await res.json();
      if (run.status !== 'RUNNING') {
        setActiveRunId(null);
        setLatestRun(run);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeRunId]);

  const handleRunComplete = useCallback(async () => {
    await loadLatestRun();
  }, [loadLatestRun]);

  const totalRed = (latestRun?.riskFlags as Array<{ severity: string }> | undefined)?.filter((f) => f.severity === 'RED').length ?? 0;
  const totalAmber = (latestRun?.riskFlags as Array<{ severity: string }> | undefined)?.filter((f) => f.severity === 'AMBER').length ?? 0;
  const totalGreen = (latestRun?.riskFlags as Array<{ severity: string }> | undefined)?.filter((f) => f.severity === 'GREEN').length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <ComparisonBanner />

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Radar className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">OTS™ Operations Agent</h1>
            </div>
            <p className="text-indigo-100 text-sm">
              Claude-powered autonomous sweep across Tasks, Projects, HR, and Pipeline — RED/AMBER/GREEN early warning signals.
            </p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">RED Flags</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{totalRed}</p>
            <p className="text-xs text-rose-500 mt-0.5">Critical attention needed</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">AMBER Flags</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{totalAmber}</p>
            <p className="text-xs text-amber-500 mt-0.5">Monitor closely</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">GREEN</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{totalGreen}</p>
            <p className="text-xs text-emerald-500 mt-0.5">On track</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-indigo-50 to-white border-indigo-200 p-4 shadow-sm">
            <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Mode</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1 text-sm">
              {(config?.mode as string | undefined) ?? '—'}
            </p>
            <p className="text-xs text-indigo-500 mt-0.5">Current agent mode</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <RunTriggerCard
              canRun={canRun}
              latestRun={latestRun}
              activeRunId={activeRunId}
              onRunStarted={setActiveRunId}
              onRunComplete={handleRunComplete}
            />

            {latestRun && (
              <OpsBriefView run={latestRun} />
            )}

            {latestRun && (
              <RiskFlagList
                flags={(latestRun.riskFlags as Record<string, unknown>[] | undefined) ?? []}
                canResolve={canResolveFlags}
                onResolved={loadLatestRun}
              />
            )}

            <RunHistoryList
              onSelectRun={(run) => setLatestRun(run)}
              activeRunId={latestRun?.id as string | undefined}
            />
          </div>

          {/* Config sidebar */}
          <div className="space-y-4">
            {canConfigure && config && (
              <>
                <AiProviderSettings
                  config={config}
                  onSaved={loadConfig}
                />
                <ModeSwitcher
                  currentMode={(config.mode as string) ?? 'READ_ONLY'}
                  onModeChange={loadConfig}
                />
                <ThresholdEditor
                  config={config}
                  onSaved={loadConfig}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
