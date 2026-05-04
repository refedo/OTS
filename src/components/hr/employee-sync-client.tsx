'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RefreshCw, AlertTriangle, Settings2 } from 'lucide-react';

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

const ALL_FIELDS: Array<{ key: string; label: string; group: string }> = [
  { key: 'fullNameEn', label: 'Full Name (English)', group: 'Identity' },
  { key: 'fullNameAr', label: 'Full Name (Arabic)', group: 'Identity' },
  { key: 'nationalId', label: 'National ID', group: 'Identity' },
  { key: 'nationality', label: 'Nationality', group: 'Identity' },
  { key: 'gender', label: 'Gender', group: 'Identity' },
  { key: 'maritalStatus', label: 'Marital Status', group: 'Identity' },
  { key: 'passportNumber', label: 'Passport Number', group: 'Documents' },
  { key: 'iqamaUrl', label: 'Iqama URL', group: 'Documents' },
  { key: 'passportUrl', label: 'Passport URL', group: 'Documents' },
  { key: 'boarderNumber', label: 'Boarder Number', group: 'Documents' },
  { key: 'sponsorNumber', label: 'Sponsor Number', group: 'Documents' },
  { key: 'dateOfJoining', label: 'Date of Joining', group: 'Employment' },
  { key: 'dateOfLeaving', label: 'Date of Leaving', group: 'Employment' },
  { key: 'status', label: 'Employment Status', group: 'Employment' },
  { key: 'occupation', label: 'Occupation (EN)', group: 'Employment' },
  { key: 'occupationAr', label: 'Occupation (AR)', group: 'Employment' },
  { key: 'department', label: 'Department', group: 'Employment' },
  { key: 'employeeNo', label: 'Employee Number', group: 'Employment' },
  { key: 'contractType', label: 'Contract Type', group: 'Employment' },
  { key: 'contractEndDate', label: 'Contract End Date', group: 'Employment' },
  { key: 'contractDuration', label: 'Contract Duration', group: 'Employment' },
  { key: 'workingLocation', label: 'Working Location', group: 'Employment' },
  { key: 'transferType', label: 'Transfer Type', group: 'Employment' },
  { key: 'gosiSubscriptionNo', label: 'GOSI Subscription #', group: 'Employment' },
  { key: 'basicSalary', label: 'Basic Salary', group: 'Compensation' },
  { key: 'bankName', label: 'Bank Name', group: 'Banking' },
  { key: 'bankIban', label: 'IBAN', group: 'Banking' },
];

const GROUPS = ['Identity', 'Documents', 'Employment', 'Compensation', 'Banking'];

export function EmployeeSyncClient({ logs, reconciliationComplete }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () => new Set(ALL_FIELDS.map(f => f.key))
  );

  const toggleField = (key: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    const groupKeys = ALL_FIELDS.filter(f => f.group === group).map(f => f.key);
    const allSelected = groupKeys.every(k => selectedFields.has(k));
    setSelectedFields(prev => {
      const next = new Set(prev);
      for (const k of groupKeys) {
        if (allSelected) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  };

  const onSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    setShowFieldSelector(false);
    try {
      const body = selectedFields.size === ALL_FIELDS.length
        ? {}
        : { selectedFields: Array.from(selectedFields) };
      const res = await fetch('/api/hr/employees/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
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
          <Button onClick={() => setShowFieldSelector(true)} disabled={syncing} size="lg">
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

      {/* Field Selector Dialog */}
      {showFieldSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-slate-500" />
                  Select Fields to Sync
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Choose which fields will be updated from Dolibarr. Unselected fields keep their current OTS values.
                </p>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {GROUPS.map(group => {
                const groupFields = ALL_FIELDS.filter(f => f.group === group);
                const allSelected = groupFields.every(f => selectedFields.has(f.key));
                const someSelected = groupFields.some(f => selectedFields.has(f.key));
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                        onChange={() => toggleGroup(group)}
                        className="h-4 w-4 rounded"
                      />
                      <span className="text-sm font-semibold text-slate-700">{group}</span>
                    </div>
                    <div className="ml-6 grid grid-cols-2 gap-1.5">
                      {groupFields.map(f => (
                        <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFields.has(f.key)}
                            onChange={() => toggleField(f.key)}
                            className="h-3.5 w-3.5 rounded"
                          />
                          <span className="text-sm text-slate-600">{f.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedFields.size} of {ALL_FIELDS.length} fields selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowFieldSelector(false)}>
                  Cancel
                </Button>
                <Button onClick={onSync} disabled={selectedFields.size === 0}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Sync
                </Button>
              </div>
            </div>
          </div>
        </div>
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
                    <td className="p-2">{new Date(l.startedAt).toLocaleString('en-SA-u-ca-gregory')}</td>
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
