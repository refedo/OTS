'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Megaphone, Plus, Search, Edit2, Trash2, Eye, EyeOff,
  Bell, BellOff, Calendar, CheckCircle2, XCircle, Clock,
  Globe, Users, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  serialNumber: string;
  subject: string;
  content: string;
  startDate: string;
  endDate: string;
  bannerEnabled: boolean;
  targetType: 'ALL' | 'SPECIFIC';
  isActive: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
  targets: { userId: string; user: { id: string; name: string; email: string } }[];
  _count: { dismissals: number };
}

type AnnStatus = 'active' | 'upcoming' | 'expired' | 'inactive';

function getStatus(a: Announcement): AnnStatus {
  if (!a.isActive) return 'inactive';
  const now = new Date();
  const start = new Date(a.startDate);
  const end = new Date(a.endDate);
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'active';
}

const STATUS_CFG: Record<AnnStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  active:   { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  upcoming: { label: 'Upcoming',  cls: 'bg-sky-100 text-sky-700 border-sky-200',             icon: Clock        },
  expired:  { label: 'Expired',   cls: 'bg-slate-100 text-slate-600 border-slate-200',       icon: XCircle      },
  inactive: { label: 'Inactive',  cls: 'bg-rose-100 text-rose-700 border-rose-200',          icon: EyeOff       },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const BLANK = {
  subject: '', content: '',
  startDate: new Date().toISOString().slice(0, 16),
  endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  bannerEnabled: false,
  targetType: 'ALL' as 'ALL' | 'SPECIFIC',
};

interface Props {
  canManage: boolean;
}

export function AnnouncementsTab({ canManage }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements?limit=100');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ ...BLANK });
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(a: Announcement) {
    setForm({
      subject: a.subject,
      content: a.content,
      startDate: new Date(a.startDate).toISOString().slice(0, 16),
      endDate: new Date(a.endDate).toISOString().slice(0, 16),
      bannerEnabled: a.bannerEnabled,
      targetType: a.targetType,
    });
    setEditTarget(a);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.subject.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const url = editTarget ? `/api/announcements/${editTarget.id}` : '/api/announcements';
      const method = editTarget ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject,
          content: form.content,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          bannerEnabled: form.bannerEnabled,
          targetType: form.targetType,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/announcements/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        load();
      }
    } finally {
      setDeleting(false);
    }
  }

  const filtered = items.filter((a) => {
    if (search && !a.subject.toLowerCase().includes(search.toLowerCase()) &&
        !a.serialNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && getStatus(a) !== statusFilter) return false;
    return true;
  });

  const activeCount   = items.filter((a) => getStatus(a) === 'active').length;
  const upcomingCount = items.filter((a) => getStatus(a) === 'upcoming').length;
  const expiredCount  = items.filter((a) => getStatus(a) === 'expired').length;

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',    value: items.length,   sub: 'all time',  color: 'blue'    },
          { label: 'Active',   value: activeCount,    sub: 'live now',  color: 'emerald' },
          { label: 'Upcoming', value: upcomingCount,  sub: 'scheduled', color: 'sky'     },
          { label: 'Expired',  value: expiredCount,   sub: 'past',      color: 'slate'   },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={`rounded-xl border bg-gradient-to-b from-${color}-50 to-white border-${color}-200 p-4 shadow-sm`}>
            <p className={`text-xs text-${color}-600 font-medium uppercase tracking-wide`}>{label}</p>
            <p className={`text-2xl font-bold text-${color}-700 mt-1`}>{value}</p>
            <p className={`text-xs text-${color}-500 mt-0.5`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by subject or serial number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
        {canManage && (
          <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> New Announcement
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-slate-600 mb-1">No announcements found</p>
          <p className="text-sm text-slate-400">
            {canManage ? 'Click "New Announcement" to create the first one.' : 'No announcements match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const status = getStatus(a);
            const cfg = STATUS_CFG[status];
            const StatusIcon = cfg.icon;
            const isOpen = expandedId === a.id;
            return (
              <div key={a.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : a.id)}
                >
                  {/* Left: icon */}
                  <div className="p-2 rounded-lg bg-violet-100 text-violet-600 shrink-0">
                    <Megaphone className="h-4 w-4" />
                  </div>

                  {/* Middle: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-400">{a.serialNumber}</span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cfg.cls)}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      {a.bannerEnabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
                          <Bell className="h-3 w-3" /> Banner
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        {a.targetType === 'ALL' ? <Globe className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                        {a.targetType === 'ALL' ? 'All employees' : `${a.targets.length} recipients`}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 mt-0.5 truncate">{a.subject}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {fmtDate(a.startDate)} → {fmtDate(a.endDate)}
                      <span className="mx-2">·</span>
                      By {a.createdBy.name}
                    </p>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {canManage && (
                      <>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-blue-600"
                          onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-rose-600"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(a); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t px-5 py-4 bg-slate-50/50">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                      <span>{a._count.dismissals} dismissal{a._count.dismissals !== 1 ? 's' : ''}</span>
                      <span>Created {fmtDate(a.createdAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                placeholder="Announcement subject…"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                rows={5}
                placeholder="Write the announcement content…"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Select value={form.targetType} onValueChange={(v) => setForm((f) => ({ ...f, targetType: v as 'ALL' | 'SPECIFIC' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All employees</SelectItem>
                  <SelectItem value="SPECIFIC">Specific employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="banner"
                checked={form.bannerEnabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, bannerEnabled: v }))}
              />
              <Label htmlFor="banner">Show as floating banner on all pages</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.subject.trim() || !form.content.trim()}>
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{deleteTarget?.subject}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
