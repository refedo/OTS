'use client';

import { useState } from 'react';
import { Bot, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PROVIDER_DEFAULTS: Record<string, { model: string; placeholder: string; keyPlaceholder: string }> = {
  anthropic: {
    model: 'claude-sonnet-4-6',
    placeholder: 'e.g. claude-sonnet-4-6 or claude-opus-4-7',
    keyPlaceholder: 'sk-ant-api...',
  },
  openai: {
    model: 'gpt-4o',
    placeholder: 'e.g. gpt-4o or gpt-4o-mini',
    keyPlaceholder: 'sk-...',
  },
};

interface AiProviderSettingsProps {
  config: Record<string, unknown>;
  onSaved: () => void;
}

export function AiProviderSettings({ config, onSaved }: AiProviderSettingsProps) {
  const [provider, setProvider] = useState<string>((config.aiProvider as string) ?? 'anthropic');
  const [model, setModel] = useState<string>((config.aiModel as string) ?? 'claude-sonnet-4-6');
  const [apiKey, setApiKey] = useState<string>((config.aiApiKey as string) ?? '');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleProviderChange = (val: string) => {
    setProvider(val);
    setModel(PROVIDER_DEFAULTS[val]?.model ?? '');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ops-agent/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider: provider,
          aiModel: model,
          aiApiKey: apiKey || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.anthropic;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Bot className="h-4 w-4 text-indigo-500" />
        <p className="text-sm font-semibold text-slate-700">AI Provider</p>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="openai">OpenAI (GPT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">Model</Label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={defaults.placeholder}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">API Key</Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={defaults.keyPlaceholder}
              className="h-9 text-sm pr-9 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">Stored securely in the database. Leave blank to use the server environment variable.</p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm"
        >
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
          ) : saved ? (
            'Saved!'
          ) : (
            <><Save className="h-3.5 w-3.5 mr-1.5" />Save AI Settings</>
          )}
        </Button>
      </div>
    </div>
  );
}
