'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ThresholdEditorProps {
  config: Record<string, unknown>;
  onSaved: () => void;
}

export function ThresholdEditor({ config, onSaved }: ThresholdEditorProps) {
  const thresholds = (config.thresholds as Record<string, number> | undefined) ?? {};
  const modules = (config.enabledModules as Record<string, boolean> | undefined) ?? {};

  const [taskStaleDays, setTaskStaleDays] = useState(String(thresholds.taskStaleDays ?? 3));
  const [projectStaleDays, setProjectStaleDays] = useState(String(thresholds.projectStaleDays ?? 7));
  const [otApprovalHours, setOtApprovalHours] = useState(String(thresholds.otApprovalHours ?? 24));
  const [enabledModules, setEnabledModules] = useState(modules);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTaskStaleDays(String(thresholds.taskStaleDays ?? 3));
    setProjectStaleDays(String(thresholds.projectStaleDays ?? 7));
    setOtApprovalHours(String(thresholds.otApprovalHours ?? 24));
    setEnabledModules(modules);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/ops-agent/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thresholds: {
            taskStaleDays: parseInt(taskStaleDays, 10),
            projectStaleDays: parseInt(projectStaleDays, 10),
            otApprovalHours: parseInt(otApprovalHours, 10),
          },
          enabledModules,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (key: string) => {
    setEnabledModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-semibold text-slate-700">Thresholds & Modules</p>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Task stale after (days)</Label>
          <Input type="number" min={1} max={30} value={taskStaleDays} onChange={(e) => setTaskStaleDays(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Project stale after (days)</Label>
          <Input type="number" min={1} max={60} value={projectStaleDays} onChange={(e) => setProjectStaleDays(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">OT approval threshold (hours)</Label>
          <Input type="number" min={1} max={168} value={otApprovalHours} onChange={(e) => setOtApprovalHours(e.target.value)} className="h-8 text-sm" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Modules</p>
          {Object.entries(enabledModules).map(([key, val]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!val}
                onChange={() => toggleModule(key)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-700 capitalize">{key}</span>
            </label>
          ))}
        </div>

        <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
