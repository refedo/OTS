'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [config, setConfig] = useState<IntegrationsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, HealthResult | null>>({});
  const [healthLoading, setHealthLoading] = useState<Record<string, boolean>>({});
  const [eventBus, setEventBus] = useState<EventBusStatus | null>(null);
  const [eventBusLoading, setEventBusLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<Record<string, boolean>>({});

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

  const handleToggle = async (integration: string, enabled: boolean) => {
    setToggleLoading(prev => ({ ...prev, [integration]: true }));
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [integration]: { ...prev[integration as keyof IntegrationsConfig], enabled },
      };
    });
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration, enabled }),
      });
      if (!res.ok) {
        setConfig(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [integration]: { ...prev[integration as keyof IntegrationsConfig], enabled: !enabled },
          };
        });
        toast({ title: 'Failed to update toggle', description: 'Server returned an error.', variant: 'destructive' });
      }
    } catch {
      setConfig(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [integration]: { ...prev[integration as keyof IntegrationsConfig], enabled: !enabled },
        };
      });
      toast({ title: 'Failed to update toggle', description: 'Request failed.', variant: 'destructive' });
    } finally {
      setToggleLoading(prev => ({ ...prev, [integration]: false }));
    }
  };

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

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="guide" className="gap-2">
            <BookOpen className="size-4" /> Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-6">
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
                <Switch
                  checked={config?.openAudit.enabled ?? false}
                  disabled={!config?.openAudit.configured || toggleLoading['openAudit']}
                  onCheckedChange={(v) => handleToggle('openAudit', v)}
                />
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
                <Switch
                  checked={config?.nextcloud.enabled ?? false}
                  disabled={!config?.nextcloud.configured || toggleLoading['nextcloud']}
                  onCheckedChange={(v) => handleToggle('nextcloud', v)}
                />
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
                <Switch
                  checked={config?.libreMes.enabled ?? false}
                  disabled={!config?.libreMes.configured || toggleLoading['libreMes']}
                  onCheckedChange={(v) => handleToggle('libreMes', v)}
                />
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
                Listeners are always registered at startup. Each service gates on its DB toggle (Settings → Integrations) at call time — no restart needed when toggling.
              </p>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                After updating <code className="bg-muted px-1 py-0.5 rounded">.env</code>, restart OTS with <code className="bg-muted px-1 py-0.5 rounded">pm2 restart ots</code> (or your process manager) for the new values to take effect. Toggling on/off does not require a restart.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integration Guide</CardTitle>
              <CardDescription>
                Each integration requires credentials in <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> before it can be enabled. The toggle on the Settings tab activates the integration without a server restart.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* open-audit guide */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="size-4 text-blue-600" />
                </div>
                <CardTitle className="text-base">open-audit</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Forwards OTS governance events to an external <a href="https://github.com/tomaslachmann/open-audit" target="_blank" rel="noreferrer" className="underline">open-audit</a> HTTP endpoint as a tamper-evident compliance mirror. Useful for ISO 9001 / ISO 3834 third-party audit trails. Failures are non-blocking — the service logs and moves on.
              </p>
              <div>
                <p className="text-sm font-medium mb-2">Required environment variables</p>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium">Variable</th>
                      <th className="text-left px-3 py-2 text-xs font-medium">Description</th>
                      <th className="text-left px-3 py-2 text-xs font-medium">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">OPEN_AUDIT_API_URL</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">Base URL of the open-audit HTTP API</td>
                      <td className="px-3 py-2"><code className="text-xs">https://audit.example.com</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">OPEN_AUDIT_API_KEY</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">Bearer token for the open-audit API (optional but recommended)</td>
                      <td className="px-3 py-2"><code className="text-xs">sk-xxxxxxxxxxxxxxxx</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Credentials stay in <code className="bg-muted px-1 py-0.5 rounded">.env</code> on the server. They are never stored in the database or exposed to the browser.
              </p>
            </CardContent>
          </Card>

          {/* Nextcloud guide */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Cloud className="size-4 text-sky-600" />
                </div>
                <CardTitle className="text-base">Nextcloud</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Replaces OTS local file storage with Nextcloud WebDAV. Documents (WPS attachments, ITP records, NCR evidence, etc.) are uploaded to <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXTCLOUD_ROOT_PATH/{'{'}entityType{'}'}/{'{'}entityId{'}'}/filename</code>. Share links can be generated for controlled external access.
              </p>
              <div>
                <p className="text-sm font-medium mb-2">Required environment variables</p>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium">Variable</th>
                      <th className="text-left px-3 py-2 text-xs font-medium">Description</th>
                      <th className="text-left px-3 py-2 text-xs font-medium">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">NEXTCLOUD_BASE_URL</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">Public URL of your Nextcloud instance</td>
                      <td className="px-3 py-2"><code className="text-xs">https://cloud.example.com</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">NEXTCLOUD_USERNAME</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">Nextcloud user account for OTS</td>
                      <td className="px-3 py-2"><code className="text-xs">ots-service</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">NEXTCLOUD_APP_PASSWORD</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">App password (not the account password)</td>
                      <td className="px-3 py-2"><code className="text-xs">xxxx-xxxx-xxxx-xxxx</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">NEXTCLOUD_ROOT_PATH</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">Root folder in Nextcloud (optional, defaults to /OTS)</td>
                      <td className="px-3 py-2"><code className="text-xs">/OTS</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate an App Password in Nextcloud → Settings → Security → App passwords. Do not use your main account password. Credentials stay in <code className="bg-muted px-1 py-0.5 rounded">.env</code> on the server.
              </p>
            </CardContent>
          </Card>

          {/* Libre MES guide */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Factory className="size-4 text-orange-600" />
                </div>
                <CardTitle className="text-base">Libre MES</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bidirectional integration with <a href="https://github.com/Spruik/Libre" target="_blank" rel="noreferrer" className="underline">Libre Manufacturing Execution System</a>. OTS Work Orders are pushed to Libre MES PostgreSQL as production orders; OEE and production metrics are pulled back from InfluxDB buckets into OTS for reporting.
              </p>
              <div>
                <p className="text-sm font-medium mb-2">Required environment variables</p>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium">Variable</th>
                      <th className="text-left px-3 py-2 text-xs font-medium">Description</th>
                      <th className="text-left px-3 py-2 text-xs font-medium">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">LIBRE_MES_PG_URL</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">PostgreSQL connection URL for Libre MES</td>
                      <td className="px-3 py-2"><code className="text-xs">postgresql://user:pass@host:5432/libre</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">LIBRE_MES_INFLUX_URL</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">InfluxDB v2 base URL</td>
                      <td className="px-3 py-2"><code className="text-xs">http://influx.example.com:8086</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">LIBRE_MES_INFLUX_TOKEN</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">InfluxDB API token with read access</td>
                      <td className="px-3 py-2"><code className="text-xs">my-influx-token==</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">LIBRE_MES_INFLUX_ORG</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">InfluxDB organisation name</td>
                      <td className="px-3 py-2"><code className="text-xs">hexasteel</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">LIBRE_MES_INFLUX_BUCKET_AVAILABILITY</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">InfluxDB bucket for availability metrics</td>
                      <td className="px-3 py-2"><code className="text-xs">libre-availability</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">LIBRE_MES_INFLUX_BUCKET_PERFORMANCE</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">InfluxDB bucket for performance metrics</td>
                      <td className="px-3 py-2"><code className="text-xs">libre-performance</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">LIBRE_MES_INFLUX_BUCKET_QUALITY</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">InfluxDB bucket for quality metrics</td>
                      <td className="px-3 py-2"><code className="text-xs">libre-quality</code></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2"><code className="text-xs bg-muted px-1 py-0.5 rounded">LIBRE_MES_INFLUX_BUCKET_ORDER_PERF</code></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">InfluxDB bucket for order performance metrics</td>
                      <td className="px-3 py-2"><code className="text-xs">libre-order-perf</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Bucket names must match your Libre MES InfluxDB configuration exactly. Credentials stay in <code className="bg-muted px-1 py-0.5 rounded">.env</code> on the server.
              </p>
            </CardContent>
          </Card>

          {/* Toggling on/off */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Toggling On / Off</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Add the required environment variables to <code className="bg-muted px-1 py-0.5 rounded">.env</code> on the server.</li>
                <li>Restart OTS so the new values are loaded: <code className="bg-muted px-1 py-0.5 rounded">pm2 restart ots</code></li>
                <li>Return to the <strong>Settings</strong> tab — the toggle will become clickable once all required vars are set.</li>
                <li>Flip the toggle to enable or disable the integration. Changes take effect immediately — no restart required.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                The toggle is stored in the database (<code className="bg-muted px-1 py-0.5 rounded">SystemSettings</code>). The <code className="bg-muted px-1 py-0.5 rounded">*_ENABLED</code> env vars that existed in earlier versions are ignored.
              </p>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-medium">Toggle is greyed out</dt>
                  <dd className="text-muted-foreground mt-1">One or more required environment variables are missing. Check the Settings tab — variables marked <span className="text-red-500">Missing</span> must be set and the server restarted before the toggle becomes active.</dd>
                </div>
                <div>
                  <dt className="font-medium">Test Connection fails immediately</dt>
                  <dd className="text-muted-foreground mt-1">Verify the service URL is reachable from the OTS server (not just from your browser). Check firewall rules and that the external service is running.</dd>
                </div>
                <div>
                  <dt className="font-medium">open-audit events are not appearing</dt>
                  <dd className="text-muted-foreground mt-1">Only a subset of entity types are forwarded: WPS, ITP, NCRReport, RFIRequest, Document, QCInspection, Project, WorkOrder. Check the OTS server logs (<code className="bg-muted px-1 py-0.5 rounded">pm2 logs ots</code>) for <code className="bg-muted px-1 py-0.5 rounded">[OpenAudit]</code> entries.</dd>
                </div>
                <div>
                  <dt className="font-medium">Nextcloud uploads fail with 401</dt>
                  <dd className="text-muted-foreground mt-1">The <code className="bg-muted px-1 py-0.5 rounded">NEXTCLOUD_APP_PASSWORD</code> may have expired or been revoked. Generate a new App Password in Nextcloud → Settings → Security → App passwords and update <code className="bg-muted px-1 py-0.5 rounded">.env</code>.</dd>
                </div>
                <div>
                  <dt className="font-medium">Libre MES sync shows partial failures</dt>
                  <dd className="text-muted-foreground mt-1">Partial failures mean some orders synced and some did not. Check the Libre MES sync log in Settings → Integrations for error messages. Common causes: PostgreSQL schema mismatch, InfluxDB bucket name typo, or network timeouts.</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
