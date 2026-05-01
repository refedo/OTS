'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  GitPullRequest,
  Plus,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type DcrDocument = {
  id: string;
  documentNumber: string;
  title: string;
};

type ChangeRequest = {
  id: string;
  dcrNumber: string;
  title: string;
  description: string | null;
  reason: string | null;
  status: string;
  priority: string;
  createdAt: string;
  document: DcrDocument | null;
  requestedBy: { id: string; name: string } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'IMPLEMENTED', label: 'Implemented' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function statusBadge(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    SUBMITTED:    { label: 'Submitted',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
    UNDER_REVIEW: { label: 'Under Review', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    APPROVED:     { label: 'Approved',     className: 'bg-green-100 text-green-700 border-green-200' },
    REJECTED:     { label: 'Rejected',     className: 'bg-red-100 text-red-700 border-red-200' },
    IMPLEMENTED:  { label: 'Implemented',  className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    WITHDRAWN:    { label: 'Withdrawn',    className: 'bg-gray-100 text-gray-600 border-gray-200' },
  };
  return map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
}

function priorityBadge(priority: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    LOW:      { label: 'Low',      className: 'bg-green-100 text-green-700 border-green-200' },
    MEDIUM:   { label: 'Medium',   className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    HIGH:     { label: 'High',     className: 'bg-orange-100 text-orange-700 border-orange-200' },
    CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  return map[priority] ?? { label: priority, className: 'bg-gray-100 text-gray-600 border-gray-200' };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded" />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
        <GitPullRequest className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No change requests found</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Try adjusting your filters or create a new DCR.
      </p>
    </div>
  );
}

// ─── New DCR Dialog ───────────────────────────────────────────────────────────

interface NewDcrDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function NewDcrDialog({ open, onClose, onCreated }: NewDcrDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [documentId, setDocumentId] = useState('NONE');
  const [documents, setDocuments] = useState<DcrDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/ims/documents')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setDocuments(
            (data as Array<{ id: string; documentNumber: string; title: string }>).map(
              (d: { id: string; documentNumber: string; title: string }) => ({
                id: d.id,
                documentNumber: d.documentNumber,
                title: d.title,
              })
            )
          );
        }
      })
      .catch(() => {});
  }, [open]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setReason('');
    setPriority('MEDIUM');
    setDocumentId('NONE');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/ims/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          reason: reason.trim() || null,
          priority,
          documentId: documentId === 'NONE' ? null : documentId,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to create DCR');
      }
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create DCR');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-amber-500" />
            New Change Request
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="dcr-title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dcr-title"
              placeholder="Brief description of the requested change"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              required
              className="h-9 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="dcr-description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="dcr-description"
              placeholder="Detailed description of the change…"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="dcr-reason" className="text-sm font-medium">Reason / Justification</Label>
            <Textarea
              id="dcr-reason"
              placeholder="Why is this change needed?"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Priority + Document in a row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.filter((o) => o.value !== 'ALL').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Related Document</Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {documents.map((doc: DcrDocument) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      <span className="font-mono text-xs mr-1.5 text-muted-foreground">
                        {doc.documentNumber}
                      </span>
                      {doc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white border-0">
              {submitting ? 'Creating…' : 'Create DCR'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImsDcrClient() {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'ALL') params.set('status', status);
      if (priority !== 'ALL') params.set('priority', priority);

      const res = await fetch(`/api/ims/change-requests?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch change requests');
      const data = await res.json() as ChangeRequest[];
      setChangeRequests(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load change requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, status, priority]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function clearFilters() {
    setSearch('');
    setStatus('ALL');
    setPriority('ALL');
  }

  const hasActiveFilters = search !== '' || status !== 'ALL' || priority !== 'ALL';

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.1),_transparent_60%)]" />
        <div className="relative px-6 py-10 md:px-10 md:py-12">
          <Link href="/ims" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            IMS Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                <GitPullRequest className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Change Requests
                  </h1>
                  {!loading && (
                    <Badge className="bg-white/10 text-white border border-white/20 text-xs font-semibold px-2 py-0.5">
                      {changeRequests.length} DCR{changeRequests.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  IMS · Document Change Requests
                </p>
                <p className="text-slate-500 text-xs font-mono mt-0.5">Form: HEXA-FRM-001 · Procedure: Hexa-ISP-001 · ISO §7.5</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0 gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New DCR
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 md:px-10 space-y-5 max-w-screen-2xl mx-auto">

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Filters ── */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search title or DCR number…"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Status */}
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority */}
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm w-[160px]">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Table ── */}
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <TableSkeleton />
              </div>
            ) : changeRequests.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap pl-4">
                        DCR #
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Title
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">
                        Document
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        Priority
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden md:table-cell">
                        Requested By
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden md:table-cell">
                        Created
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeRequests.map((dcr: ChangeRequest) => {
                      const sBadge = statusBadge(dcr.status);
                      const pBadge = priorityBadge(dcr.priority);
                      return (
                        <TableRow key={dcr.id} className="hover:bg-muted/40 transition-colors">
                          {/* DCR Number */}
                          <TableCell className="pl-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {dcr.dcrNumber}
                            </span>
                          </TableCell>

                          {/* Title */}
                          <TableCell className="max-w-[260px]">
                            <span className="text-sm font-medium text-foreground line-clamp-1">
                              {dcr.title}
                            </span>
                            {dcr.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {dcr.description}
                              </p>
                            )}
                          </TableCell>

                          {/* Document */}
                          <TableCell className="hidden lg:table-cell whitespace-nowrap">
                            {dcr.document ? (
                              <Link
                                href={`/ims/documents/${dcr.document.id}`}
                                className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {dcr.document.documentNumber}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Priority */}
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={cn('text-xs font-semibold', pBadge.className)}
                            >
                              {pBadge.label}
                            </Badge>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={cn('text-xs font-medium', sBadge.className)}
                            >
                              {sBadge.label}
                            </Badge>
                          </TableCell>

                          {/* Requested By */}
                          <TableCell className="hidden md:table-cell whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">
                              {dcr.requestedBy?.name ?? '—'}
                            </span>
                          </TableCell>

                          {/* Created */}
                          <TableCell className="hidden md:table-cell whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(dcr.createdAt)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── New DCR Dialog ── */}
      <NewDcrDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchData}
      />
    </div>
  );
}
