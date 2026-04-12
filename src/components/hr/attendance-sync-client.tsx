'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, AlertTriangle, Bug } from 'lucide-react';

type OrphanListEntry = { identifier: string; displayName: string; headerColumnIndex: number };

type LogRow = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  spreadsheetId: string;
  tabName: string;
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  employeeOrphans: unknown;
  slotOrphans: unknown;
  hardErrors: unknown;
  softWarnings: unknown;
  durationMs: number | null;
  triggeredBy: { id: string; name: string; email: string } | null;
};

type Props = { logs: LogRow[]; canSync: boolean; canProbe: boolean };

const STATUS_COLOURS: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  RUNNING: 'bg-blue-100 text-blue-800',
};

function asOrphanList(value: unknown): OrphanListEntry[] {
  if (!Array.isArray(value)) return [];
  return value as OrphanListEntry[];
}

export function AttendanceSyncClient({ logs, canSync, canProbe }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [probing, setProbing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probeOutput, setProbeOutput] = useState<string | null>(null);

  const onSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/hr/attendance/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setResult(
        `${data.status}: ${data.rowsRead} read, ${data.rowsCreated} created, ${data.rowsUpdated} updated, ${data.rowsUnchanged} unchanged`,
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const onProbe = async () => {
    setProbing(true);
    setError(null);
    setProbeOutput(null);
    try {
      const res = await fetch('/api/hr/attendance/sync/probe');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Probe failed');
      setProbeOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Probe failed');
    } finally {
      setProbing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance Sync</h1>
        <p className="text-muted-foreground mt-1">
          One-way mirror from the Hexa Google Sheet (Overtime tab) into OTS. The sheet stays the source of truth —
          edits made there land here on the next sync.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center gap-3">
          {canSync && (
            <Button onClick={onSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          )}
          {canProbe && (
            <Button variant="outline" onClick={onProbe} disabled={probing}>
              {probing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
              {probing ? 'Probing…' : 'Probe sheet layout'}
            </Button>
          )}
          {result && <span className="text-sm text-green-700">{result}</span>}
          {error && (
            <span className="text-sm text-red-700 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> {error}
            </span>
          )}
        </CardContent>
      </Card>

      {probeOutput && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Probe output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-[500px] whitespace-pre-wrap">
              {probeOutput}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent syncs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sync runs yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((l) => {
                const empOrphans = asOrphanList(l.employeeOrphans);
                const slotOrphans = asOrphanList(l.slotOrphans);
                return (
                  <div key={l.id} className="border rounded p-3 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLOURS[l.status] ?? ''}`}>
                          {l.status}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(l.startedAt).toLocaleString()}
                        </span>
                        {l.triggeredBy && (
                          <span className="text-muted-foreground">· by {l.triggeredBy.name}</span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {l.durationMs != null ? `${(l.durationMs / 1000).toFixed(1)}s` : '—'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div>Read: <strong>{l.rowsRead}</strong></div>
                      <div>Created: <strong className="text-green-700">{l.rowsCreated}</strong></div>
                      <div>Updated: <strong className="text-blue-700">{l.rowsUpdated}</strong></div>
                      <div>Unchanged: <strong>{l.rowsUnchanged}</strong></div>
                      <div>
                        Orphans: <strong className="text-orange-700">{empOrphans.length + slotOrphans.length}</strong>
                      </div>
                    </div>
                    {(empOrphans.length > 0 || slotOrphans.length > 0) && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-orange-700">
                          Show unresolved identifiers
                        </summary>
                        <div className="mt-2 text-xs space-y-1">
                          {empOrphans.length > 0 && (
                            <div>
                              <strong>Employees:</strong>{' '}
                              {empOrphans.map((o) => o.displayName).join(', ')}
                            </div>
                          )}
                          {slotOrphans.length > 0 && (
                            <div>
                              <strong>Manpower slots:</strong>{' '}
                              {slotOrphans.map((o) => o.displayName).join(', ')}
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
