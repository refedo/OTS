'use client';

import { useState } from 'react';
import { Eye, Tag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModeSwitcherProps {
  currentMode: string;
  onModeChange: () => void;
}

const MODES = [
  { id: 'READ_ONLY', label: 'Read Only', icon: Eye, desc: 'Observes and reports. No writes.' },
  { id: 'ANNOTATE', label: 'Annotate', icon: Tag, desc: 'Flags records and adds risk notes.' },
  { id: 'FULL_ACTOR', label: 'Full Actor', icon: Zap, desc: 'Triggers escalations and tasks.' },
];

export function ModeSwitcher({ currentMode, onModeChange }: ModeSwitcherProps) {
  const [saving, setSaving] = useState(false);
  const [confirmMode, setConfirmMode] = useState<string | null>(null);

  const handleSelect = (modeId: string) => {
    if (modeId === currentMode) return;
    if (modeId === 'FULL_ACTOR') {
      setConfirmMode(modeId);
    } else {
      applyMode(modeId);
    }
  };

  const applyMode = async (modeId: string) => {
    setSaving(true);
    setConfirmMode(null);
    try {
      await fetch('/api/ops-agent/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeId }),
      });
      onModeChange();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-semibold text-slate-700">Agent Mode</p>
      </div>
      <div className="p-4 space-y-2">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const active = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleSelect(mode.id)}
              disabled={saving}
              className={`w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
              }`}
            >
              <Icon className={`h-4 w-4 mt-0.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              <div>
                <p className={`text-xs font-medium ${active ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {mode.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{mode.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {confirmMode && (
        <div className="mx-4 mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs text-rose-700 font-medium mb-2">
            Switch to FULL ACTOR? The agent can trigger escalations and create tasks.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => applyMode(confirmMode)}>
              Confirm
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setConfirmMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
