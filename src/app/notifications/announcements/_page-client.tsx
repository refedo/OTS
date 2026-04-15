'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Globe,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/contexts/PermissionsContext';
import { cn } from '@/lib/utils';

interface AnnouncementTarget {
  userId: string;
  user: { id: string; name: string; email: string };
}

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
  targets: AnnouncementTarget[];
  _count: { dismissals: number };
}

interface User {
  id: string;
  name: string;
  email: string;
  position?: string;
}

type AnnouncementStatus = 'active' | 'upcoming' | 'expired' | 'inactive';

function getStatus(ann: Announcement): AnnouncementStatus {
  if (!ann.isActive) return 'inactive';
  const now = new Date();
  const start = new Date(ann.startDate);
  const end = new Date(ann.endDate);
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'active';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = (props: { className?: string }) => any;

const STATUS_CONFIG: Record<AnnouncementStatus, { label: string; className: string; icon: IconComponent }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  upcoming: { label: 'Upcoming', className: 'bg-sky-100 text-sky-700 border-sky-200', icon: Clock },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle },
  inactive: { label: 'Inactive', className: 'bg-rose-100 text-rose-700 border-rose-200', icon: EyeOff },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateInput(d: string) {
  return new Date(d).toISOString().slice(0, 16);
}

interface FormState {
  subject: string;
  content: string;
  startDate: string;
  endDate: string;
  bannerEnabled: boolean;
  targetType: 'ALL' | 'SPECIFIC';
  targetUserIds: string[];
}

const EMPTY_FORM: FormState = {
  subject: '',
  content: '',
  startDate: '',
  endDate: '',
  bannerEnabled: false,
  targetType: 'ALL',
  targetUserIds: [],
};

export function AnnouncementsClient() {
  const { permissions } = usePermissions();
  const canCreate = permissions.includes('announcements.create') || permissions.includes('announcements.manage');
  const canManage = permissions.includes('announcements.manage');
  const canView = permissions.includes('announcements.view') || canCreate;

  const [items, setItems] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Users list for targeting
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements?limit=50');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?limit=200&status=active');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? data ?? []);
      }
    } catch {
      // users optional
    }
  }, []);

  useEffect(() => {
    load();
    if (canCreate) loadUsers();
  }, [load, loadUsers, canCreate]);

  const filtered = items.filter((ann: Announcement) => {
    const matchSearch =
      !search ||
      ann.subject.toLowerCase().includes(search.toLowerCase()) ||
      ann.serialNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || getStatus(ann) === statusFilter;
    return matchSearch && matchStatus;
  });

  // KPI counts
  const activeCount = items.filter((a: Announcement) => getStatus(a) === 'active').length;
  const upcomingCount = items.filter((a: Announcement) => getStatus(a) === 'upcoming').length;
  const bannerCount = items.filter((a: Announcement) => a.bannerEnabled && getStatus(a) === 'active').length;
  const totalEmployeesTargeted = items
    .filter((a: Announcement) => getStatus(a) === 'active')
    .reduce((acc: number, a: Announcement) => acc + (a.targetType === 'ALL' ? 0 : a.targets.length), 0);

  function openCreate() {
    setEditTarget(null);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setForm({
      ...EMPTY_FORM,
      startDate: now.toISOString().slice(0, 16),
      endDate: tomorrow.toISOString().slice(0, 16),
    });
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(ann: Announcement) {
    setEditTarget(ann);
    setForm({
      subject: ann.subject,
      content: ann.content,
      startDate: formatDateInput(ann.startDate),
      endDate: formatDateInput(ann.endDate),
      bannerEnabled: ann.bannerEnabled,
      targetType: ann.targetType,
      targetUserIds: ann.targets.map((t) => t.userId),
    });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    setFormError('');
    if (!form.subject.trim()) { setFormError('Subject is required'); return; }
    if (!form.content.trim()) { setFormError('Content is required'); return; }
    if (!form.startDate) { setFormError('Start date is required'); return; }
    if (!form.endDate) { setFormError('End date is required'); return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setFormError('End date must be after start date');
      return;
    }
    if (form.targetType === 'SPECIFIC' && form.targetUserIds.length === 0) {
      setFormError('Select at least one employee for targeted announcements');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        subject: form.subject,
        content: form.content,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        bannerEnabled: form.bannerEnabled,
        targetType: form.targetType,
        targetUserIds: form.targetType === 'SPECIFIC' ? form.targetUserIds : [],
      };

      const res = editTarget
        ? await fetch(`/api/announcements/${editTarget.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? 'Failed to save');
        return;
      }

      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(ann: Announcement) {
    await fetch(`/api/announcements/${ann.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !ann.isActive }),
    });
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/announcements/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteReason }),
      });
      setDeleteTarget(null);
      setDeleteReason('');
      load();
    } finally {
      setDeleting(false);
    }
  }

  function toggleUser(userId: string) {
    setForm((f: FormState) => ({
      ...f,
      targetUserIds: f.targetUserIds.includes(userId)
        ? f.targetUserIds.filter((id: string) => id !== userId)
        : [...f.targetUserIds, userId],
    }));
  }

  const filteredUsers = users.filter(
    (u: User) =>
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <p className="text-slate-500">You do not have permission to view announcements.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Hero ── */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Megaphone className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Announcements</h1>
              </div>
              <p className="text-violet-100 text-sm">
                Company-wide and targeted announcements for all employees
              </p>
            </div>
            {canCreate && (
              <Button
                onClick={openCreate}
                className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Announcement
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Live Now</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
            <p className="text-xs text-emerald-500 mt-0.5">active announcements</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Upcoming</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{upcomingCount}</p>
            <p className="text-xs text-sky-500 mt-0.5">scheduled</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Banners</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{bannerCount}</p>
            <p className="text-xs text-violet-500 mt-0.5">showing on screen</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{total}</p>
            <p className="text-xs text-amber-500 mt-0.5">all time</p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                {filtered.length} announcement{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={load} className="text-slate-500">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="px-6 py-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by subject or serial…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── List ── */}
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border bg-white p-12 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border bg-white p-12 text-center">
              <Megaphone className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No announcements found</p>
              {canCreate && (
                <Button onClick={openCreate} className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Announcement
                </Button>
              )}
            </div>
          ) : (
            filtered.map((ann) => {
              const status = getStatus(ann);
              const StatusIcon = STATUS_CONFIG[status].icon;
              const isExpanded = expandedId === ann.id;

              return (
                <div
                  key={ann.id}
                  className={cn(
                    'rounded-2xl border bg-white shadow-sm transition-all',
                    status === 'active' && 'border-l-4 border-l-emerald-400',
                    status === 'upcoming' && 'border-l-4 border-l-sky-400',
                    status === 'expired' && 'border-l-4 border-l-slate-300',
                    status === 'inactive' && 'border-l-4 border-l-rose-300 opacity-70'
                  )}
                >
                  {/* Card header */}
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                          {ann.serialNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', STATUS_CONFIG[status].className)}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[status].label}
                        </Badge>
                        {ann.bannerEnabled && (
                          <Badge variant="outline" className="text-xs bg-violet-100 text-violet-700 border-violet-200">
                            <Bell className="h-3 w-3 mr-1" />
                            Banner
                          </Badge>
                        )}
                        {ann.targetType === 'SPECIFIC' ? (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                            <Users className="h-3 w-3 mr-1" />
                            {ann.targets.length} employee{ann.targets.length !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
                            <Globe className="h-3 w-3 mr-1" />
                            All Employees
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 truncate">{ann.subject}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(ann.startDate)} → {formatDate(ann.endDate)}
                        <span className="ml-2">· by {ann.createdBy.name}</span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 h-8 w-8 p-0"
                        onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 h-8 w-8 p-0"
                            title={ann.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => handleToggleActive(ann)}
                          >
                            {ann.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 h-8 w-8 p-0"
                            onClick={() => openEdit(ann)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500 h-8 w-8 p-0"
                            onClick={() => { setDeleteTarget(ann); setDeleteReason(''); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-6 pb-5 border-t pt-4">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {ann.content}
                      </p>
                      {ann.targetType === 'SPECIFIC' && ann.targets.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Targeted Employees
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ann.targets.map((t) => (
                              <span
                                key={t.userId}
                                className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5"
                              >
                                {t.user.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-4">
                        {ann._count.dismissals} employee{ann._count.dismissals !== 1 ? 's' : ''} dismissed this banner
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-violet-600" />
              {editTarget ? `Edit ${editTarget.serialNumber}` : 'New Announcement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject <span className="text-rose-500">*</span></Label>
              <Input
                id="subject"
                placeholder="e.g. Eid Al-Adha Holiday Notice"
                value={form.subject}
                onChange={(e) => setForm((f: FormState) => ({ ...f, subject: e.target.value }))}
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label htmlFor="content">Content <span className="text-rose-500">*</span></Label>
              <Textarea
                id="content"
                placeholder="Write the full announcement text here…"
                rows={5}
                value={form.content}
                onChange={(e) => setForm((f: FormState) => ({ ...f, content: e.target.value }))}
              />
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date <span className="text-rose-500">*</span></Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm((f: FormState) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date <span className="text-rose-500">*</span></Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm((f: FormState) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Show as Banner</p>
                  <p className="text-xs text-slate-400">Appears floating on every page</p>
                </div>
                <Switch
                  checked={form.bannerEnabled}
                  onCheckedChange={(v) => setForm((f: FormState) => ({ ...f, bannerEnabled: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target Audience</Label>
                <Select
                  value={form.targetType}
                  onValueChange={(v: 'ALL' | 'SPECIFIC') =>
                    setForm((f: FormState) => ({ ...f, targetType: v, targetUserIds: [] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> All Employees
                      </div>
                    </SelectItem>
                    <SelectItem value="SPECIFIC">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Specific Employees
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employee picker */}
            {form.targetType === 'SPECIFIC' && (
              <div className="space-y-2">
                <Label>
                  Select Employees{' '}
                  <span className="text-slate-400 font-normal">
                    ({form.targetUserIds.length} selected)
                  </span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search employees…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="border rounded-xl max-h-48 overflow-y-auto divide-y">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-slate-400 py-4 text-sm">No employees found</p>
                  ) : (
                    filteredUsers.map((u) => {
                      const selected = form.targetUserIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleUser(u.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            selected ? 'bg-violet-50' : 'hover:bg-slate-50'
                          )}
                        >
                          <div
                            className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                              selected
                                ? 'bg-violet-600 border-violet-600'
                                : 'border-slate-300'
                            )}
                          >
                            {selected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {formError && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Publish Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Announcement
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deleteTarget?.subject}</span>? This action is
            irreversible.
          </p>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="Why is this being deleted?"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
