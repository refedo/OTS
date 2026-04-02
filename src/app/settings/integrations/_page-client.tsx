'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Plug,
  Cloud,
  Factory,
  Shield,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface VarStatus {
  [key: string]: boolean;
}

interface IntegrationStatus {
  enabled: boolean;
  configured: boolean;
  vars: VarStatus;
}

interface IntegrationsConfig {
  openAudit: IntegrationStatus;
  nextcloud: IntegrationStatus;
  libreMes: IntegrationStatus;
}

interface EventBusStatus {
  active: boolean;
  totalListeners: number;
  maxListeners: number;
  listeners: Record<string, number>;
}

interface HealthResult {
  ok?: boolean;
  influx?: { ok: boolean; latencyMs: number; error?: string };
  postgres?: { ok: boolean; latencyMs: number; error?: string };
  latencyMs?: number;
  error?: string;
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge variant="default" className="bg-green-500 text-white gap-1">
      <CheckCircle className="size-3" /> Active
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="size-3" /> Inactive
    </Badge>
  );
}

function VarRow({ name, configured }: { name: string; configured: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <div className="flex items-center gap-2">
        {configured ? (
          <CheckCircle className="size-4 text-green-500" />
        ) : (
          <XCircle className="size-4 text-muted-foreground" />
        )}
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{name}</code>
      </div>
      <div className="flex items-center gap-2">
        <span className={configured ? 'text-green-600 text-xs' : 'text-muted-foreground text-xs'}>
          {configured ? 'Set' : 'Missing'}
        </span>
        <Button variant="ghost" size="icon" className="size-6" onClick={copy} title="Copy variable name">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
      </div>
    </div>
  );
}

export default function IntegrationsSettingsPage() {
  const [config, setConfig] = useState<IntegrationsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, HealthResult | null>>({});
  const [healthLoading, setHealthLoading] = useState<Record<string, boolean>>({});
  const [eventBus, setEventBus] = useState<EventBusStatus | null>(null);
  const [eventBusLoading, setEventBusLoading] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/integrations');
      if (res.ok) setConfig(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchEventBus = async () => {
    setEventBusLoading(true);
    try {
      const res = await fetch('/api/integrations/event-bus');
      if (res.ok) setEventBus(await res.json());
    } finally {
      setEventBusLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); fetchEventBus(); }, []);

  const testHealth = async (integration: 'open-audit' | 'nextcloud' | 'libre-mes') => {
    setHealthLoading(prev => ({ ...prev, [integration]: true }));
    try {
      const res = await fetch(`/api/integrations/${integration}/health`);
      const data = await res.json();
      setHealth(prev => ({ ...prev, [integration]: data }));
    } catch {
      setHealth(prev => ({ ...prev, [integration]: { ok: false, error: 'Request failed' } }));
    } finally {
      setHealthLoading(prev => ({ ...prev, [integration]: false }));
    }
  };

  const renderHealth = (key: string) => {
    const h = health[key];
    if (!h) return null;
    if (key === 'libre-mes') {
      const lh = h as { influx?: { ok: boolean; latencyMs: number }; postgres?: { ok: boolean; latencyMs: number } };
      return (
        <div className="mt-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">InfluxDB:</span>
            {lh.influx?.ok ? (
              <span className="text-green-600">✓ {lh.influx.latencyMs}ms</span>
            ) : (
              <span className="text-red-500">✗ Unreachable</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">PostgreSQL:</span>
            {lh.postgres?.ok ? (
              <span className="text-green-600">✓ {lh.postgres.latencyMs}ms</span>
            ) : (
              <span className="text-red-500">✗ Unreachable</span>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="mt-2 text-xs">
        {h.ok ? (
          <span className="text-green-600">✓ Reachable ({h.latencyMs}ms)</span>
        ) : (
          <span className="text-red-500">✗ {h.error ?? 'Unreachable'}</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Configure external service integrations. Set the corresponding variables in your <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file on the server, then restart OTS.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConfig} className="gap-2">
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      {/* open-audit */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="size-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">open-audit</CardTitle>
                <CardDescription>External compliance audit mirror for ISO documentation trail</CardDescription>
              </div>
            </div>
            <StatusBadge ok={config?.openAudit.enabled && config?.openAudit.configured ? true : false} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Forwards critical governance events (WPS, ITP, NCR, RFI, Document, Project, WorkOrder) to an external open-audit HTTP endpoint as an independent compliance record.
          </p>
          <div className="border rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Environment Variables</p>
            {config && Object.entries(config.openAudit.vars).map(([k, v]) => (
              <VarRow key={k} name={k} configured={v} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={healthLoading['open-audit'] || !config?.openAudit.configured}
              onClick={() => testHealth('open-audit')}
            >
              <Plug className="size-4" />
              {healthLoading['open-audit'] ? 'Testing…' : 'Test Connection'}
            </Button>
            {renderHealth('open-audit')}
          </div>
          <p className="text-xs text-muted-foreground">
            Example: <code className="bg-muted px-1 py-0.5 rounded">OPEN_AUDIT_API_URL=https://audit.example.com</code>
          </p>
        </CardContent>
      </Card>

      {/* Nextcloud */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <Cloud className="size-5 text-sky-600" />
              </div>
              <div>
                <CardTitle className="text-base">Nextcloud</CardTitle>
                <CardDescription>Document & file management — ISO 9001 Clause 7.5 controlled documents</CardDescription>
              </div>
            </div>
            <StatusBadge ok={config?.nextcloud.enabled && config?.nextcloud.configured ? true : false} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Replaces local file storage with Nextcloud WebDAV. Uploaded documents are stored under <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXTCLOUD_ROOT_PATH</code> (default: <code className="text-xs bg-muted px-1 py-0.5 rounded">/OTS</code>) with share-link generation for controlled access.
          </p>
          <div className="border rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Environment Variables</p>
            {config && Object.entries(config.nextcloud.vars).map(([k, v]) => (
              <VarRow key={k} name={k} configured={v} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={healthLoading['nextcloud'] || !config?.nextcloud.configured}
              onClick={() => testHealth('nextcloud')}
            >
              <Plug className="size-4" />
              {healthLoading['nextcloud'] ? 'Testing…' : 'Test Connection'}
            </Button>
            {renderHealth('nextcloud')}
          </div>
          <p className="text-xs text-muted-foreground">
            Use an <strong>App Password</strong> (Nextcloud → Settings → Security → App passwords) instead of your main password.
          </p>
        </CardContent>
      </Card>

      {/* Libre MES */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Factory className="size-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-base">Libre MES</CardTitle>
                <CardDescription>Manufacturing Execution System — OEE, production performance & downtime tracking</CardDescription>
              </div>
            </div>
            <StatusBadge ok={config?.libreMes.enabled && config?.libreMes.configured ? true : false} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pushes Work Orders to Libre MES PostgreSQL and pulls OEE metrics back from InfluxDB. Requires a running Libre MES stack (InfluxDB + PostgreSQL + Grafana).
          </p>
          <div className="border rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Environment Variables</p>
            {config && Object.entries(config.libreMes.vars).map(([k, v]) => (
              <VarRow key={k} name={k} configured={v} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={healthLoading['libre-mes'] || !config?.libreMes.configured}
              onClick={() => testHealth('libre-mes')}
            >
              <Plug className="size-4" />
              {healthLoading['libre-mes'] ? 'Testing…' : 'Test Connection'}
            </Button>
            {renderHealth('libre-mes')}
          </div>
          <p className="text-xs text-muted-foreground">
            InfluxDB buckets: availability, performance, quality, orderPerformance — must match your Libre MES configuration.
          </p>
        </CardContent>
      </Card>

      {/* Event Bus */}
      <Card id="event-bus">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Zap className="size-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-base">Internal Event Bus</CardTitle>
                <CardDescription>Typed Node.js EventEmitter that decouples core services from integration side-effects</CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-green-500 text-white gap-1">
              <CheckCircle className="size-3" /> Always Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Fires events after audit logs, work order creation, and document uploads. Integration listeners (open-audit, Libre MES) attach here at server startup — no env vars required for the bus itself.
          </p>

          {eventBus && (
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">Registered Listeners</p>
                <span className="text-xs text-muted-foreground">
                  {eventBus.totalListeners} / {eventBus.maxListeners} max
                </span>
              </div>
              {Object.entries(eventBus.listeners).map(([event, count]) => (
                <div key={event} className="flex items-center justify-between py-1 text-sm">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{event}</code>
                  <span className={count > 0 ? 'text-green-600 text-xs font-medium' : 'text-muted-foreground text-xs'}>
                    {count} {count === 1 ? 'listener' : 'listeners'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={eventBusLoading}
              onClick={fetchEventBus}
            >
              <RefreshCw className={`size-4 ${eventBusLoading ? 'animate-spin' : ''}`} />
              {eventBusLoading ? 'Checking…' : 'Refresh Listeners'}
            </Button>
            {eventBus && (
              <span className="text-xs text-muted-foreground">
                {eventBus.totalListeners === 0
                  ? 'No listeners — integrations disabled or server not yet initialised'
                  : `${eventBus.totalListeners} listener${eventBus.totalListeners > 1 ? 's' : ''} active`}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Listener count reflects what is registered on the running server process. Zero listeners means all integrations are disabled in <code className="bg-muted px-1 py-0.5 rounded">.env</code>.
          </p>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            After updating <code className="bg-muted px-1 py-0.5 rounded">.env</code>, restart OTS with <code className="bg-muted px-1 py-0.5 rounded">pm2 restart ots</code> (or your process manager) for the new values to take effect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
