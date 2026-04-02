'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  AlertTriangle,
} from 'lucide-react';

interface VarStatus { [key: string]: boolean; }
interface IntegrationStatus { enabled: boolean; configured: boolean; vars: VarStatus; }
interface IntegrationsConfig { openAudit: IntegrationStatus; nextcloud: IntegrationStatus; libreMes: IntegrationStatus; }
interface EventBusStatus { active: boolean; totalListeners: number; maxListeners: number; listeners: Record<string, number>; }
interface HealthResult {
  ok?: boolean;
  influx?: { ok: boolean; latencyMs: number; error?: string };
  postgres?: { ok: boolean; latencyMs: number; error?: string };
  latencyMs?: number;
  error?: string;
}

function VarRow({ name, configured }: { name: string; configured: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(name); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <div className="flex items-center gap-2">
        {configured ? <CheckCircle className="size-4 text-green-500" /> : <XCircle className="size-4 text-muted-foreground" />}
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{name}</code>
      </div>
      <div className="flex items-center gap-2">
        <span className={configured ? 'text-green-600 text-xs' : 'text-muted-foreground text-xs'}>{configured ? 'Set' : 'Missing'}</span>
        <Button variant="ghost" size="icon" className="size-6" onClick={copy} title="Copy variable name">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
      </div>
    </div>
  );
}

function EnvTable({ rows }: { rows: { name: string; description: string; example: string }[] }) {
  return (
    <div className="border rounded-lg overflow-hidden text-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-64">Variable</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Example</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
              <td className="px-3 py-2 align-top"><code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{r.name}</code></td>
              <td className="px-3 py-2 text-xs text-muted-foreground align-top">{r.description}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground align-top hidden md:table-cell"><code className="bg-muted px-1 py-0.5 rounded">{r.example}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [toggleLoading, setToggleLoading] = useState<Record<string, boolean>>({});

  const fetchConfig = async () => {
    setLoading(true);
    try { const res = await fetch('/api/settings/integrations'); if (res.ok) setConfig(await res.json()); }
    finally { setLoading(false); }
  };

  const fetchEventBus = async () => {
    setEventBusLoading(true);
    try { const res = await fetch('/api/integrations/event-bus'); if (res.ok) setEventBus(await res.json()); }
    finally { setEventBusLoading(false); }
  };

  useEffect(() => { fetchConfig(); fetchEventBus(); }, []);

  const handleToggle = async (integration: 'openAudit' | 'nextcloud' | 'libreMes', enabled: boolean) => {
    setToggleLoading(prev => ({ ...prev, [integration]: true }));
    setConfig(prev => prev ? { ...prev, [integration]: { ...prev[integration], enabled } } : prev);
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration, enabled }),
      });
      if (!res.ok) setConfig(prev => prev ? { ...prev, [integration]: { ...prev[integration], enabled: !enabled } } : prev);
    } catch {
      setConfig(prev => prev ? { ...prev, [integration]: { ...prev[integration], enabled: !enabled } } : prev);
    } finally {
      setToggleLoading(prev => ({ ...prev, [integration]: false }));
    }
  };

  const testHealth = async (integration: 'open-audit' | 'nextcloud' | 'libre-mes') => {
    setHealthLoading(prev => ({ ...prev, [integration]: true }));
    try {
      const res = await fetch(`/api/integrations/${integration}/health`);
      setHealth(prev => ({ ...prev, [integration]: await res.json() }));
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
          <div className="flex items-center gap-2"><span className="text-muted-foreground">InfluxDB:</span>{lh.influx?.ok ? <span className="text-green-600">✓ {lh.influx.latencyMs}ms</span> : <span className="text-red-500">✗ Unreachable</span>}</div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">PostgreSQL:</span>{lh.postgres?.ok ? <span className="text-green-600">✓ {lh.postgres.latencyMs}ms</span> : <span className="text-red-500">✗ Unreachable</span>}</div>
        </div>
      );
    }
    return <div className="mt-2 text-xs">{h.ok ? <span className="text-green-600">✓ Reachable ({h.latencyMs}ms)</span> : <span className="text-red-500">✗ {h.error ?? 'Unreachable'}</span>}</div>;
  };

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-lg" />)}</div></div>;
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-1">Add credentials to <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> and restart once — then toggle on/off anytime without restarting.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConfig} className="gap-2"><RefreshCw className="size-4" /> Refresh</Button>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2"><Plug className="size-3.5" /> Settings</TabsTrigger>
          <TabsTrigger value="guide" className="gap-2"><BookOpen className="size-3.5" /> Guide</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4 mt-4">

          {/* open-audit */}
          <Card id="open-audit">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center"><Shield className="size-5 text-blue-600" /></div>
                  <div><CardTitle className="text-base">open-audit</CardTitle><CardDescription>External compliance audit mirror for ISO documentation trail</CardDescription></div>
                </div>
                <div className="flex items-center gap-3">
                  {!config?.openAudit.configured && <span className="text-xs text-muted-foreground">Set credentials first</span>}
                  <Label htmlFor="toggle-open-audit" className="sr-only">Enable open-audit</Label>
                  <Switch id="toggle-open-audit" checked={config?.openAudit.enabled ?? false}
                    disabled={!config?.openAudit.configured || toggleLoading['openAudit']}
                    onCheckedChange={(v) => handleToggle('openAudit', v)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Forwards critical governance events (WPS, ITP, NCR, RFI, Document, Project, WorkOrder) to an external open-audit endpoint as an independent compliance record.</p>
              <div className="border rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Environment Variables</p>
                {config && Object.entries(config.openAudit.vars).map(([k, v]) => <VarRow key={k} name={k} configured={v} />)}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" disabled={healthLoading['open-audit'] || !config?.openAudit.configured} onClick={() => testHealth('open-audit')}>
                  <Plug className="size-4" />{healthLoading['open-audit'] ? 'Testing…' : 'Test Connection'}
                </Button>
                {renderHealth('open-audit')}
              </div>
            </CardContent>
          </Card>

          {/* Nextcloud */}
          <Card id="nextcloud">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center"><Cloud className="size-5 text-sky-600" /></div>
                  <div><CardTitle className="text-base">Nextcloud</CardTitle><CardDescription>Document & file management — ISO 9001 Clause 7.5 controlled documents</CardDescription></div>
                </div>
                <div className="flex items-center gap-3">
                  {!config?.nextcloud.configured && <span className="text-xs text-muted-foreground">Set credentials first</span>}
                  <Label htmlFor="toggle-nextcloud" className="sr-only">Enable Nextcloud</Label>
                  <Switch id="toggle-nextcloud" checked={config?.nextcloud.enabled ?? false}
                    disabled={!config?.nextcloud.configured || toggleLoading['nextcloud']}
                    onCheckedChange={(v) => handleToggle('nextcloud', v)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Replaces local file storage with Nextcloud WebDAV. Files organized under <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXTCLOUD_ROOT_PATH</code> with share-link generation.</p>
              <div className="border rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Environment Variables</p>
                {config && Object.entries(config.nextcloud.vars).map(([k, v]) => <VarRow key={k} name={k} configured={v} />)}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" disabled={healthLoading['nextcloud'] || !config?.nextcloud.configured} onClick={() => testHealth('nextcloud')}>
                  <Plug className="size-4" />{healthLoading['nextcloud'] ? 'Testing…' : 'Test Connection'}
                </Button>
                {renderHealth('nextcloud')}
              </div>
              <p className="text-xs text-muted-foreground">Use an <strong>App Password</strong> (Nextcloud → Settings → Security → App passwords) — never your main account password.</p>
            </CardContent>
          </Card>

          {/* Libre MES */}
          <Card id="libre-mes">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center"><Factory className="size-5 text-orange-600" /></div>
                  <div><CardTitle className="text-base">Libre MES</CardTitle><CardDescription>Manufacturing Execution System — OEE, production performance & downtime tracking</CardDescription></div>
                </div>
                <div className="flex items-center gap-3">
                  {!config?.libreMes.configured && <span className="text-xs text-muted-foreground">Set credentials first</span>}
                  <Label htmlFor="toggle-libre-mes" className="sr-only">Enable Libre MES</Label>
                  <Switch id="toggle-libre-mes" checked={config?.libreMes.enabled ?? false}
                    disabled={!config?.libreMes.configured || toggleLoading['libreMes']}
                    onCheckedChange={(v) => handleToggle('libreMes', v)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Pushes Work Orders to Libre MES PostgreSQL and pulls OEE metrics back from InfluxDB. Requires a running Libre MES stack (InfluxDB + PostgreSQL + Grafana).</p>
              <div className="border rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Environment Variables</p>
                {config && Object.entries(config.libreMes.vars).map(([k, v]) => <VarRow key={k} name={k} configured={v} />)}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" disabled={healthLoading['libre-mes'] || !config?.libreMes.configured} onClick={() => testHealth('libre-mes')}>
                  <Plug className="size-4" />{healthLoading['libre-mes'] ? 'Testing…' : 'Test Connection'}
                </Button>
                {renderHealth('libre-mes')}
              </div>
            </CardContent>
          </Card>

          {/* Event Bus */}
          <Card id="event-bus">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-violet-100 flex items-center justify-center"><Zap className="size-5 text-violet-600" /></div>
                  <div><CardTitle className="text-base">Internal Event Bus</CardTitle><CardDescription>Typed Node.js EventEmitter — decouples core services from integration side-effects</CardDescription></div>
                </div>
                <Badge variant="default" className="bg-green-500 text-white gap-1"><CheckCircle className="size-3" /> Always Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Fires events after audit logs, work order creation, and document uploads. Integration listeners attach at server startup — no configuration required.</p>
              {eventBus && (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-muted-foreground">Registered Listeners</p>
                    <span className="text-xs text-muted-foreground">{eventBus.totalListeners} / {eventBus.maxListeners} max</span>
                  </div>
                  {Object.entries(eventBus.listeners).map(([event, count]) => (
                    <div key={event} className="flex items-center justify-between py-1 text-sm">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{event}</code>
                      <span className={count > 0 ? 'text-green-600 text-xs font-medium' : 'text-muted-foreground text-xs'}>{count} {count === 1 ? 'listener' : 'listeners'}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" disabled={eventBusLoading} onClick={fetchEventBus}>
                  <RefreshCw className={`size-4 ${eventBusLoading ? 'animate-spin' : ''}`} />{eventBusLoading ? 'Checking…' : 'Refresh Listeners'}
                </Button>
                {eventBus && <span className="text-xs text-muted-foreground">{eventBus.totalListeners === 0 ? 'No active listeners — enable at least one integration' : `${eventBus.totalListeners} listener${eventBus.totalListeners !== 1 ? 's' : ''} active`}</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                After editing <code className="bg-muted px-1 py-0.5 rounded">.env</code> with new credentials, restart once: <code className="bg-muted px-1 py-0.5 rounded">pm2 restart ots</code>. After that, use the toggles — no further restarts needed.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide" className="space-y-6 mt-4">

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4" /> How Integrations Work</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>OTS connects to three optional external services. Each follows the same two-step setup:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li><strong className="text-foreground">Add credentials to <code className="bg-muted px-1 rounded">.env</code></strong> on the server and run <code className="bg-muted px-1 rounded">pm2 restart ots</code> once. The toggle stays disabled until all required variables are present.</li>
                <li><strong className="text-foreground">Flip the toggle</strong> in the Settings tab. Takes effect immediately — no restart needed.</li>
              </ol>
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">Credentials (URLs, tokens, passwords) always stay in <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env</code> — never stored in the database or shown in the UI.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="size-7 rounded bg-blue-100 flex items-center justify-center"><Shield className="size-4 text-blue-600" /></div>open-audit
              </CardTitle>
              <CardDescription>ISO compliance mirror — tomaslachmann/open-audit compatible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">Whenever a compliance-critical entity changes in OTS, the event is forwarded to your open-audit server — creating a tamper-evident, independently-hosted audit trail for ISO 9001 and ISO 3834.</p>
              <p className="text-xs font-medium text-muted-foreground">Entities forwarded automatically:</p>
              <div className="flex flex-wrap gap-1.5">
                {['WPS', 'ITP', 'NCRReport', 'RFIRequest', 'Document', 'QCInspection', 'Project', 'WorkOrder'].map(e => (
                  <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                ))}
              </div>
              <p className="text-xs font-medium text-muted-foreground mt-2">Required .env variables:</p>
              <EnvTable rows={[
                { name: 'OPEN_AUDIT_API_URL', description: 'Base URL of your open-audit server', example: 'https://audit.example.com' },
                { name: 'OPEN_AUDIT_API_KEY', description: 'Bearer token for authentication', example: 'sk-xxxxxxxxxxxx' },
              ]} />
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2 mt-2">
                <li>Fire-and-forget — a failed forward never blocks the OTS operation</li>
                <li>Each event is saved to DB first (status: pending), then delivered</li>
                <li>Auto-retries up to 3 times; view failures in <strong>Governance → open-audit</strong> tab</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="size-7 rounded bg-sky-100 flex items-center justify-center"><Cloud className="size-4 text-sky-600" /></div>Nextcloud
              </CardTitle>
              <CardDescription>WebDAV document storage — ISO 9001 Clause 7.5</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">Document uploads go to Nextcloud via WebDAV instead of the local server filesystem. Files are organized under <code className="bg-muted px-1 rounded">NEXTCLOUD_ROOT_PATH</code> by entity. Share links can be generated for controlled external access.</p>
              <p className="text-xs font-medium text-muted-foreground">Required .env variables:</p>
              <EnvTable rows={[
                { name: 'NEXTCLOUD_BASE_URL', description: 'Your Nextcloud instance URL', example: 'https://cloud.example.com' },
                { name: 'NEXTCLOUD_USERNAME', description: 'Nextcloud account username', example: 'admin' },
                { name: 'NEXTCLOUD_APP_PASSWORD', description: 'App Password (not your login password)', example: 'xxxxx-xxxxx-xxxxx' },
                { name: 'NEXTCLOUD_ROOT_PATH', description: 'Base folder for OTS files (optional)', example: '/OTS' },
              ]} />
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <CheckCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-300">Generate an <strong>App Password</strong> in Nextcloud: Settings → Security → Devices &amp; Sessions → App passwords. Using your main password will not work.</p>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                <li>Directories are created automatically on first upload</li>
                <li>Existing local files are not migrated — only new uploads go to Nextcloud</li>
                <li>If disabled, OTS falls back to local filesystem automatically</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="size-7 rounded bg-orange-100 flex items-center justify-center"><Factory className="size-4 text-orange-600" /></div>Libre MES
              </CardTitle>
              <CardDescription>Bidirectional manufacturing execution sync — Spruik/Libre compatible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">Work Orders created in OTS are automatically pushed to Libre MES PostgreSQL. OEE metrics (availability, performance, quality) are pulled back from InfluxDB v2 on demand.</p>
              <p className="text-xs font-medium text-muted-foreground">Required .env variables:</p>
              <EnvTable rows={[
                { name: 'LIBRE_MES_PG_URL', description: 'PostgreSQL connection URL for Libre MES', example: 'postgresql://user:pass@host:5432/libre' },
                { name: 'LIBRE_MES_INFLUX_URL', description: 'InfluxDB v2 base URL', example: 'http://influx.example.com:8086' },
                { name: 'LIBRE_MES_INFLUX_TOKEN', description: 'InfluxDB v2 API token', example: 'mytoken==' },
                { name: 'LIBRE_MES_INFLUX_ORG', description: 'InfluxDB organisation name', example: 'hexa-steel' },
                { name: 'LIBRE_MES_INFLUX_BUCKET_AVAILABILITY', description: 'Bucket for availability metrics', example: 'availability' },
                { name: 'LIBRE_MES_INFLUX_BUCKET_PERFORMANCE', description: 'Bucket for performance metrics', example: 'performance' },
                { name: 'LIBRE_MES_INFLUX_BUCKET_QUALITY', description: 'Bucket for quality metrics', example: 'quality' },
                { name: 'LIBRE_MES_INFLUX_BUCKET_ORDER_PERF', description: 'Bucket for order performance', example: 'orderPerformance' },
              ]} />
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2 mt-2">
                <li>Work Orders push automatically on creation via the Event Bus</li>
                <li>Manual push: <code className="bg-muted px-1 rounded">POST /api/integrations/libre-mes/push-orders</code></li>
                <li>OEE pull: <code className="bg-muted px-1 rounded">POST /api/integrations/libre-mes/pull-metrics</code></li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-600" /> Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Toggle is grayed out</p>
                <p>One or more required credentials are missing. Rows marked <span className="text-red-500 font-medium">Missing</span> must be added to <code className="bg-muted px-1 rounded">.env</code> and the server restarted before the toggle becomes active.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Test Connection fails</p>
                <p>Verify the service URL is reachable from the OTS server (not just your browser). Check firewall rules, SSL certificates, and that credentials are correct.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">open-audit events stuck as &quot;failed&quot;</p>
                <p>Go to <strong>Governance → open-audit tab</strong> to see the error message. Fix the issue, then click <strong>Retry Failed</strong>.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Event Bus shows 0 listeners</p>
                <p>All integrations are toggled off. Listeners are always registered at startup but act as no-ops until enabled.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">New credentials not detected</p>
                <p>Run <code className="bg-muted px-1 rounded">pm2 restart ots</code> to reload environment variables, then click <strong>Refresh</strong>.</p>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}
