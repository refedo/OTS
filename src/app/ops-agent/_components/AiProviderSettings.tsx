'use client';

import { useState } from 'react';
import { Bot, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProviderConfig {
  label: string;
  baseUrl: string;
  defaultModel: string;
  modelPlaceholder: string;
  keyPlaceholder: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    baseUrl: '',
    defaultModel: 'claude-sonnet-4-6',
    modelPlaceholder: 'claude-sonnet-4-6 · claude-opus-4-7',
    keyPlaceholder: 'sk-ant-api03-...',
  },
  openai: {
    label: 'OpenAI (GPT)',
    baseUrl: '',
    defaultModel: 'gpt-4o',
    modelPlaceholder: 'gpt-4o · gpt-4o-mini · o3-mini',
    keyPlaceholder: 'sk-...',
  },
  google: {
    label: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-2.0-flash',
    modelPlaceholder: 'gemini-2.0-flash · gemini-1.5-pro',
    keyPlaceholder: 'AIza...',
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-8b-instant',
    modelPlaceholder: 'llama-3.1-8b-instant · llama-3.3-70b-versatile · mixtral-8x7b-32768',
    keyPlaceholder: 'gsk_...',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    modelPlaceholder: 'deepseek-chat · deepseek-reasoner',
    keyPlaceholder: 'sk-...',
  },
  mistral: {
    label: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    modelPlaceholder: 'mistral-large-latest · mistral-small-latest',
    keyPlaceholder: '...',
  },
  qwen: {
    label: 'Alibaba Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    modelPlaceholder: 'qwen-plus · qwen-max · qwen-turbo',
    keyPlaceholder: 'sk-...',
  },
  minimax: {
    label: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'MiniMax-Text-01',
    modelPlaceholder: 'MiniMax-Text-01',
    keyPlaceholder: 'eyJ...',
  },
  together: {
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    modelPlaceholder: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    keyPlaceholder: '...',
  },
  ollama: {
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    modelPlaceholder: 'llama3.2 · mistral · phi4',
    keyPlaceholder: 'ollama  (or leave blank)',
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    modelPlaceholder: 'model-name',
    keyPlaceholder: 'your-api-key',
  },
};

const PROVIDER_GROUPS = [
  { label: 'Native', keys: ['anthropic', 'openai'] },
  { label: 'Hosted Models', keys: ['google', 'groq', 'deepseek', 'mistral', 'together'] },
  { label: 'Asian Providers', keys: ['qwen', 'minimax'] },
  { label: 'Other', keys: ['ollama', 'custom'] },
];

interface AiProviderSettingsProps {
  config: Record<string, unknown>;
  onSaved: () => void;
}

export function AiProviderSettings({ config, onSaved }: AiProviderSettingsProps) {
  const [provider, setProvider] = useState<string>((config.aiProvider as string) ?? 'anthropic');
  const [model, setModel] = useState<string>((config.aiModel as string) ?? 'claude-sonnet-4-6');
  const [baseUrl, setBaseUrl] = useState<string>((config.aiBaseUrl as string) ?? '');
  const [apiKey, setApiKey] = useState<string>((config.aiApiKey as string) ?? '');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleProviderChange = (val: string) => {
    const cfg = PROVIDERS[val];
    setProvider(val);
    setModel(cfg?.defaultModel ?? '');
    setBaseUrl(cfg?.baseUrl ?? '');
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/ops-agent/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider: provider,
          aiModel: model,
          aiApiKey: apiKey || null,
          aiBaseUrl: baseUrl || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const cfg = PROVIDERS[provider] ?? PROVIDERS.custom;
  const showBaseUrl = provider !== 'anthropic' && provider !== 'openai';

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Bot className="h-4 w-4 text-indigo-500" />
        <p className="text-sm font-semibold text-slate-700">AI Provider</p>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Provider */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_GROUPS.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel className="text-xs text-slate-400">{group.label}</SelectLabel>
                  {group.keys.map((key) => (
                    <SelectItem key={key} value={key}>{PROVIDERS[key].label}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Base URL — shown for non-native providers */}
        {showBaseUrl && (
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.provider.com/v1"
              className="h-9 text-sm font-mono text-xs"
            />
          </div>
        )}

        {/* Model */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">Model</Label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={cfg.modelPlaceholder}
            className="h-9 text-sm"
          />
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">API Key</Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={cfg.keyPlaceholder}
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
          <p className="text-xs text-slate-400">
            Saved in DB. Leave blank to fall back to the server&apos;s environment variable.
          </p>
        </div>

        {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>}

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
