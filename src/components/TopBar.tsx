'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { LogOut, Star, Plus, Loader2, ClipboardList, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import RecentLinksPanel from '@/components/RecentLinksPanel';
import Link from 'next/link';

interface UserPoints {
  totalPoints: number;
  rank: number | null;
}

type UserOption = { id: string; name: string | null; email: string | null };

function QuickTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?limit=200');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : (data.users ?? []));
      }
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { if (open) loadUsers(); }, [open, loadUsers]);

  function reset() {
    setTitle(''); setPriority('Medium'); setDueDate(''); setAssignedToId(''); setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          dueDate: dueDate || null,
          assignedToId: assignedToId || null,
          status: 'Pending',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create task');
      }
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  function handleContinueInFullForm() {
    const params = new URLSearchParams();
    if (title.trim()) params.set('title', title.trim());
    if (priority) params.set('priority', priority);
    if (dueDate) params.set('dueDate', dueDate);
    if (assignedToId) params.set('assignedToId', assignedToId);
    reset();
    onClose();
    router.push(`/tasks/new?${params.toString()}`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          Quick Task
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          Create a task quickly or continue in the full form.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="qt-title">Title</Label>
            <Input
              id="qt-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qt-priority">Priority</Label>
              <select
                id="qt-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border rounded-md h-10 px-3 text-sm bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <Label htmlFor="qt-due">Due date</Label>
              <Input
                id="qt-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="qt-assigned">Assigned to <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <select
              id="qt-assigned"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full border rounded-md h-10 px-3 text-sm bg-white"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-xs text-red-600 rounded border border-red-200 bg-red-50 px-3 py-2">{error}</p>
          )}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleContinueInFullForm}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              Continue in full form
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Create Task
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TopBar() {
  const router = useRouter();
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);

  useEffect(() => {
    fetch('/api/points/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setPoints(data); })
      .catch(() => {});
  }, []);

  // Global keyboard shortcut: Ctrl+Shift+T / Cmd+Shift+T for quick task
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setQuickTaskOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      const tracker = (window as any).__sessionActivityTracker;
      if (tracker) {
        tracker.stop();
        delete (window as any).__sessionActivityTracker;
      }

      // Preserve bookmarks across logout — they're user-device preferences, not session data
      const savedBookmarks = localStorage.getItem('ots_bookmarks');
      localStorage.clear();
      if (savedBookmarks) localStorage.setItem('ots_bookmarks', savedBookmarks);
      sessionStorage.clear();

      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});

      const loginUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://ots.hexasteel.sa/login?t=' + Date.now()
          : '/login?t=' + Date.now();

      window.location.href = loginUrl;
    } catch {
      const loginUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://ots.hexasteel.sa/login?t=' + Date.now()
          : '/login?t=' + Date.now();
      window.location.href = loginUrl;
    }
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex items-center gap-1 p-2 lg:p-3 print:hidden bg-background/80 backdrop-blur-sm border-b border-border/40">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setQuickTaskOpen(true)}
        title="Quick task (Ctrl+Shift+T)"
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <GlobalSearch />
      <RecentLinksPanel />
      {points !== null && (
        <Link
          href="/points"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
          title={points.rank ? `Rank #${points.rank}` : 'Your points'}
        >
          <Star className="h-3.5 w-3.5 fill-amber-500" />
          <span>{points.totalPoints.toLocaleString()}</span>
          {points.rank && (
            <span className="text-amber-500/70">#{points.rank}</span>
          )}
        </Link>
      )}
      <NotificationBell />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="Logout"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-5 w-5" />
      </Button>

      <QuickTaskDialog open={quickTaskOpen} onClose={() => { setQuickTaskOpen(false); router.refresh(); }} />
    </div>
  );
}
