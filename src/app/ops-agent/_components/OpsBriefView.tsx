'use client';

import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import type { OpsBrief } from '@/lib/ops-agent/parsers';

interface OpsBriefViewProps {
  run: Record<string, unknown>;
}

function SeverityCard({ items, severity }: { items: OpsBrief['earlyWarning']['red']; severity: 'RED' | 'AMBER' | 'GREEN' }) {
  const colors = {
    RED: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: AlertCircle, iconColor: 'text-rose-500' },
    AMBER: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: AlertTriangle, iconColor: 'text-amber-500' },
    GREEN: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, iconColor: 'text-emerald-500' },
  };
  const c = colors[severity];
  const Icon = c.icon;

  if (items.length === 0) return null;

  return (
    <div className={`rounded-xl border ${c.bg} p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${c.text} mb-2`}>{severity}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${c.iconColor}`} />
            <div>
              <p className={`text-xs font-medium ${c.text}`}>{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModuleSection({ title, count, items }: { title: string; count: number; items: Record<string, unknown>[] }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{count}</span>
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      {open && items.length > 0 && (
        <div className="divide-y">
          {items.slice(0, 10).map((item, i) => (
            <div key={i} className="px-4 py-2.5 text-xs text-slate-600">
              {Object.entries(item).slice(0, 4).map(([k, v]) => (
                <span key={k} className="mr-3">
                  <span className="text-slate-400">{k}: </span>
                  <span>{String(v)}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OpsBriefView({ run }: OpsBriefViewProps) {
  const brief = run.brief as OpsBrief | null;
  if (!brief) return null;

  const { earlyWarning, modules, recommendedActions, summary } = brief;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-6 py-4 border-b">
        <p className="text-sm font-semibold text-slate-700">Ops Brief</p>
        <p className="text-xs text-slate-500 mt-0.5">{summary}</p>
      </div>
      <div className="p-6 space-y-4">
        {/* Early Warning */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Early Warning Signals</p>
          <SeverityCard items={earlyWarning?.red ?? []} severity="RED" />
          <SeverityCard items={earlyWarning?.amber ?? []} severity="AMBER" />
          <SeverityCard items={earlyWarning?.green ?? []} severity="GREEN" />
          {!earlyWarning?.red?.length && !earlyWarning?.amber?.length && !earlyWarning?.green?.length && (
            <p className="text-xs text-slate-400 text-center py-4">No signals in this run.</p>
          )}
        </div>

        {/* Modules */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Module Breakdown</p>
          <ModuleSection title="Tasks" count={(modules?.tasks?.critical ?? 0) + (modules?.tasks?.stale ?? 0)} items={modules?.tasks?.items ?? []} />
          <ModuleSection title="Projects" count={modules?.projects?.atRisk ?? 0} items={modules?.projects?.items ?? []} />
          <ModuleSection title="HR" count={(modules?.hr?.otPending ?? 0) + (modules?.hr?.agencyUnreconciled ?? 0)} items={modules?.hr?.items ?? []} />
          <ModuleSection title="Pipeline" count={modules?.pipeline?.stalled ?? 0} items={modules?.pipeline?.items ?? []} />
        </div>

        {/* Recommended actions */}
        {recommendedActions && recommendedActions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Recommended Actions</p>
            <ul className="space-y-2">
              {recommendedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                    action.priority === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                    action.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{action.priority}</span>
                  <div>
                    <p className="text-slate-700">{action.action}</p>
                    {action.relatedEntity && <p className="text-slate-400 mt-0.5">{action.relatedEntity}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
