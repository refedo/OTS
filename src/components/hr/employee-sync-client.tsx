'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

type LogRow = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  fieldsPreserved: number;
  linksEstablished: number;
  hardErrors: unknown;
  softWarnings: unknown;
  apiResponseMs: number | null;
  triggeredBy: { id: string; name: string; email: string } | null;
};

type Props = {
  logs: LogRow[];
  reconciliationComplete: boolean;
};

const STATUS_COLOURS: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  RUNNING: 'bg-blue-100 text-blue-800',
};

export function EmployeeSyncClient({ logs, reconciliationComplete }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/hr/employees/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || `Sync failed (HTTP ${res.status})`);
      }
      setResult(
        `Sync ${data.status}: ${data.rowsRead} read · ${data.rowsCreated} created · ${data.rowsUpdated} updated · ${data.rowsSkipped} skipped · ${data.fieldsPreserved} fields preserved · ${data.linksEstablished} user links established`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dolibarr Employee Sync</h1>
          <p className="text-sm text-muted-foreground">
            One-way read-only mirror from Dolibarr. Manual edits are preserved.
          </p>
        </div>
        {reconciliationComplete ? (
          <Button onClick={onSync} disabled={syncing} size="lg">
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync from Dolibarr
          </Button>
        ) : null}
      </div>

      {!reconciliationComplete && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-amber-900">Identity reconciliation required</p>
              <p className="text-sm text-amber-800">
                Before the first sync can run, every OTS user must be linked to their
                Dolibarr counterpart. Complete the one-time reconciliation wizard first.
              </p>
              <Link href="/admin/identity-reconciliation">
                <Button variant="outline" size="sm">
                  Open reconciliation wizard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          {result}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium mb-3">Recent sync runs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">When</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Read</th>
                  <th className="p-2 font-medium">Created</th>
                  <th className="p-2 font-medium">Updated</th>
                  <th className="p-2 font-medium">Skipped</th>
                  <th className="p-2 font-medium">Preserved</th>
                  <th className="p-2 font-medium">Links</th>
                  <th className="p-2 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                      No sync runs yet.
                    </td>
                  </tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="p-2">{new Date(l.startedAt).toLocaleString()}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOURS[l.status] ?? ''}`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-2">{l.rowsRead}</td>
                    <td className="p-2">{l.rowsCreated}</td>
                    <td className="p-2">{l.rowsUpdated}</td>
                    <td className="p-2">{l.rowsSkipped}</td>
                    <td className="p-2">{l.fieldsPreserved}</td>
                    <td className="p-2">{l.linksEstablished}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {l.triggeredBy?.name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
