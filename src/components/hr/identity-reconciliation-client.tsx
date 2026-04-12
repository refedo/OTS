'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

type OtsUser = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  dolibarrUserId: number | null;
  employeeId: string | null;
  reconciledAt: string | null;
  role: { id: string; name: string } | null;
};

type DolibarrUser = {
  id: number;
  firstname: string | null;
  lastname: string | null;
  login: string | null;
  email: string | null;
  job: string | null;
  fullName: string;
};

type Props = { users: OtsUser[]; isComplete: boolean };

export function IdentityReconciliationClient({ users: initialUsers, isComplete }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [dolibarrUsers, setDolibarrUsers] = useState<DolibarrUser[] | null>(null);
  const [loadingDolibarr, setLoadingDolibarr] = useState(true);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/admin/identity-reconciliation/dolibarr-users')
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setDolibarrUsers(data as DolibarrUser[]))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to fetch Dolibarr users'),
      )
      .finally(() => setLoadingDolibarr(false));
  }, []);

  const progress = useMemo(() => {
    const total = users.length;
    const linked = users.filter((u) => u.dolibarrUserId != null).length;
    return { total, linked, remaining: total - linked };
  }, [users]);

  const setLink = async (userId: string, dolibarrUserId: number | null) => {
    if (isComplete) return;
    setSavingRow(userId);
    setRowErrors((e) => ({ ...e, [userId]: '' }));
    try {
      const res = await fetch(`/api/admin/identity-reconciliation/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dolibarrUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, dolibarrUserId: data.dolibarrUserId, reconciledAt: data.reconciledAt }
            : u,
        ),
      );
    } catch (err) {
      setRowErrors((e) => ({
        ...e,
        [userId]: err instanceof Error ? err.message : 'Save failed',
      }));
    } finally {
      setSavingRow(null);
    }
  };

  const complete = async () => {
    if (!confirm('Mark identity reconciliation as complete? This unlocks the Dolibarr employee sync.')) return;
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/identity-reconciliation/complete', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Completion failed');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Identity Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Link each OTS user to their Dolibarr counterpart before running the first
          employee sync. This is a one-time setup — once completed, it becomes read-only.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Progress</div>
            <div className="text-lg font-medium">
              {progress.linked} of {progress.total} users linked
              {progress.remaining > 0 && ` — ${progress.remaining} remaining`}
            </div>
          </div>
          {isComplete ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Completed — page is read-only</span>
            </div>
          ) : (
            <Button
              onClick={complete}
              disabled={progress.remaining > 0 || completing}
            >
              {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete reconciliation
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">OTS User</th>
                  <th className="p-2 font-medium">Email</th>
                  <th className="p-2 font-medium">Role</th>
                  <th className="p-2 font-medium">Dolibarr link</th>
                  <th className="p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b align-top">
                    <td className="p-2 font-medium">{u.name}</td>
                    <td className="p-2 text-muted-foreground">{u.email}</td>
                    <td className="p-2">{u.role?.name ?? '—'}</td>
                    <td className="p-2 min-w-[260px]">
                      <DolibarrPicker
                        users={dolibarrUsers}
                        loading={loadingDolibarr}
                        selectedId={u.dolibarrUserId}
                        disabled={isComplete || savingRow === u.id}
                        onChange={(id) => setLink(u.id, id)}
                      />
                      {rowErrors[u.id] && (
                        <div className="text-xs text-red-600 mt-1">{rowErrors[u.id]}</div>
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {savingRow === u.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {u.dolibarrUserId != null && !savingRow && (
                        <span className="text-green-600">Linked</span>
                      )}
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

function DolibarrPicker({
  users,
  loading,
  selectedId,
  disabled,
  onChange,
}: {
  users: DolibarrUser[] | null;
  loading: boolean;
  selectedId: number | null;
  disabled: boolean;
  onChange: (id: number | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading Dolibarr users…
      </div>
    );
  }
  if (!users) {
    return <div className="text-xs text-red-600">Could not load Dolibarr users</div>;
  }

  const selected = users.find((u) => u.id === selectedId);
  const filtered = users.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      (u.login ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      String(u.id).includes(q)
    );
  });

  return (
    <div className="relative">
      <Input
        value={open ? query : selected ? `${selected.fullName} (#${selected.id})` : query}
        placeholder="Search Dolibarr user…"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded border bg-background shadow">
          {selected && (
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-muted"
              onMouseDown={() => {
                onChange(null);
                setQuery('');
                setOpen(false);
              }}
            >
              Clear link
            </button>
          )}
          {filtered.slice(0, 30).map((u) => (
            <button
              key={u.id}
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={() => {
                onChange(u.id);
                setQuery('');
                setOpen(false);
              }}
            >
              <div className="font-medium">
                {u.fullName}{' '}
                <span className="text-xs text-muted-foreground">#{u.id}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {u.login ?? '—'} · {u.email ?? '—'}
                {u.job ? ` · ${u.job}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
