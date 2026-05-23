'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShieldAlert,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Loader2,
  Lock,
  User,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';

// ─── Types ─────────────────────────────────────────────────────────────────

type IntegrityReport = {
  id: string;
  reportNumber: string;
  category: string;
  title: string;
  isAnonymous: boolean;
  severity: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  reporter?: { id: string; name: string; email: string } | null;
  resolution?: string | null;
  resolvedBy?: { id: string; name: string } | null;
};

type ReportDetail = IntegrityReport & {
  description: string;
  attachments?: Array<{
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
  }>;
};

const CATEGORIES: Record<string, string> = {
  MISCONDUCT: 'Misconduct',
  FINANCIAL_MISUSE: 'Financial Misuse',
  ASSET_MISUSE: 'Asset Misuse',
  OPERATIONAL_RISK: 'Operational Risk',
  SAFETY_VIOLATION: 'Safety Violation',
  POLICY_BREACH: 'Policy Breach',
  OTHER: 'Other',
};

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  OPEN: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: Clock },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-amber-100 text-amber-700', icon: Search },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  DISMISSED: { label: 'Dismissed', color: 'bg-slate-100 text-slate-600', icon: XCircle },
};

const SEVERITY_CFG: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  canViewAll: boolean;
  canResolve: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function IntegrityPageClient({ canViewAll, canResolve }: Props) {
  const [reports, setReports] = useState<IntegrityReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Submit form state
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ reportNumber: string } | null>(null);
  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    isAnonymous: false,
    severity: 'MEDIUM',
  });

  // Detail/resolve dialog state
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolveForm, setResolveForm] = useState({ status: '', resolution: '' });
  const [resolving, setResolving] = useState(false);

  // ─── Fetch reports ────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/integrity?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ─── Submit new report ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.category || !form.title || !form.description) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setSubmitSuccess({ reportNumber: data.report.reportNumber });
        setForm({ category: '', title: '', description: '', isAnonymous: false, severity: 'MEDIUM' });
        fetchReports();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDialog = () => {
    setSubmitSuccess(null);
    setShowSubmitDialog(true);
  };

  // ─── Load report detail ───────────────────────────────────────────────
  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/integrity/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data.report);
        setResolveForm({ status: data.report.status, resolution: data.report.resolution ?? '' });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Resolve / update report ──────────────────────────────────────────
  const handleResolve = async () => {
    if (!selectedReport) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/integrity/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolveForm),
      });
      if (res.ok) {
        setSelectedReport(null);
        fetchReports();
      }
    } finally {
      setResolving(false);
    }
  };

  // ─── Filtered display ─────────────────────────────────────────────────
  const filtered = search
    ? reports.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.reportNumber.toLowerCase().includes(search.toLowerCase()) ||
        CATEGORIES[r.category]?.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  // ─── KPI counts ───────────────────────────────────────────────────────
  const kpiCounts = {
    total,
    open: reports.filter(r => r.status === 'OPEN').length,
    underReview: reports.filter(r => r.status === 'UNDER_REVIEW').length,
    resolved: reports.filter(r => r.status === 'RESOLVED').length,
  };

  return (
    <ResponsiveLayout>
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-100 rounded-xl">
            <ShieldAlert className="size-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Report a Violation</h1>
            <p className="text-sm text-muted-foreground">
              Submit a confidential report about misconduct, misuse, or operational risks
            </p>
          </div>
        </div>
        <Button onClick={handleOpenDialog} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
          <Plus className="size-4" />
          Submit Report
        </Button>
      </div>

      {/* ─── KPI strip (admin/CEO only) ─────────────────────────────────── */}
      {canViewAll && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Reports', value: kpiCounts.total, color: 'text-foreground' },
            { label: 'Open', value: kpiCounts.open, color: 'text-blue-600' },
            { label: 'Under Review', value: kpiCounts.underReview, color: 'text-amber-600' },
            { label: 'Resolved', value: kpiCounts.resolved, color: 'text-green-600' },
          ].map(k => (
            <Card key={k.label} className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Reports table ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <CardTitle className="text-base">
              {canViewAll ? 'All Violation Reports' : 'My Reports'}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 w-48 h-9"
                />
              </div>
              {canViewAll && (
                <>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      {Object.entries(STATUS_CFG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-44 h-9">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      {Object.entries(CATEGORIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchReports}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldAlert className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reports found</p>
              {!canViewAll && (
                <p className="text-xs mt-1">Reports you submit will appear here (unless anonymous)</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report #</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    {canViewAll && <TableHead>Reporter</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const statusCfg = STATUS_CFG[r.status];
                    const StatusIcon = statusCfg?.icon ?? Clock;
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{r.reportNumber}</TableCell>
                        <TableCell className="text-xs">{CATEGORIES[r.category] ?? r.category}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{r.title}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_CFG[r.severity]}`}>
                            {r.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg?.color ?? ''}`}>
                            <StatusIcon className="size-3" />
                            {statusCfg?.label ?? r.status}
                          </span>
                        </TableCell>
                        {canViewAll && (
                          <TableCell className="text-xs">
                            {r.isAnonymous ? (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Lock className="size-3" /> Anonymous
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <User className="size-3" /> {r.reporter?.name ?? 'Unknown'}
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString('en-SA-u-ca-gregory')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => loadDetail(r.id)}
                          >
                            <Eye className="size-4" />
                          </Button>
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

      {/* ─── Submit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-red-600" />
              Submit a Violation Report
            </DialogTitle>
            <DialogDescription>
              Your report will be treated with strict confidentiality. You may choose to remain anonymous.
            </DialogDescription>
          </DialogHeader>

          {submitSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle className="size-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-foreground">Report Submitted</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your report number is <span className="font-mono font-bold">{submitSuccess.reportNumber}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                The administration will review your report confidentially.
              </p>
              <Button className="mt-6" onClick={() => { setShowSubmitDialog(false); setSubmitSuccess(null); }}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Anonymity toggle */}
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Report Anonymously</p>
                    <p className="text-xs text-muted-foreground">
                      Your identity will not be disclosed to reviewers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isAnonymous: !f.isAnonymous }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      form.isAnonymous ? 'bg-red-600' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.isAnonymous ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {form.isAnonymous && (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <Lock className="size-3.5 shrink-0" />
                    Your identity will be kept anonymous. You will not be able to track this report.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Category *</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORIES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Severity *</Label>
                    <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Brief subject of the report"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    maxLength={255}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Description *</Label>
                  <Textarea
                    placeholder="Describe the violation in detail — include dates, people involved, and any evidence you have..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{form.description.length} chars (min 20)</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={submitting || !form.category || !form.title || form.description.length < 20}
                  onClick={handleSubmit}
                >
                  {submitting ? <><Loader2 className="size-4 animate-spin mr-2" />Submitting…</> : 'Submit Report'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Detail / Resolve Dialog ────────────────────────────────────── */}
      {selectedReport && (
        <Dialog open onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                {selectedReport.reportNumber}
              </DialogTitle>
              <DialogDescription>
                {CATEGORIES[selectedReport.category]} · Submitted {new Date(selectedReport.createdAt).toLocaleDateString('en-SA-u-ca-gregory')}
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Meta badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_CFG[selectedReport.severity]}`}>
                    {selectedReport.severity}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CFG[selectedReport.status]?.color}`}>
                    {STATUS_CFG[selectedReport.status]?.label}
                  </span>
                  {selectedReport.isAnonymous && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      <Lock className="size-3" /> Anonymous
                    </span>
                  )}
                  {!selectedReport.isAnonymous && selectedReport.reporter && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      <User className="size-3" /> {selectedReport.reporter.name}
                    </span>
                  )}
                </div>

                {/* Title and description */}
                <div>
                  <p className="font-semibold text-foreground">{selectedReport.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.description}</p>
                </div>

                {/* Resolution (if resolved) */}
                {selectedReport.resolution && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-medium text-green-700 mb-1">Resolution</p>
                    <p className="text-sm text-green-800">{selectedReport.resolution}</p>
                    {selectedReport.resolvedBy && (
                      <p className="text-xs text-green-600 mt-1">
                        — {selectedReport.resolvedBy.name} on {selectedReport.resolvedAt
                          ? new Date(selectedReport.resolvedAt).toLocaleDateString('en-SA-u-ca-gregory')
                          : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* Resolve form (admin/CEO only) */}
                {canResolve && selectedReport.status !== 'RESOLVED' && selectedReport.status !== 'DISMISSED' && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-medium">Update Report</p>
                    <Select value={resolveForm.status} onValueChange={v => setResolveForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CFG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Resolution notes (optional)"
                      value={resolveForm.resolution}
                      onChange={e => setResolveForm(f => ({ ...f, resolution: e.target.value }))}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReport(null)}>Close</Button>
              {canResolve && !detailLoading && (
                <Button
                  onClick={handleResolve}
                  disabled={resolving || !resolveForm.status}
                  className="bg-primary text-primary-foreground"
                >
                  {resolving ? <><Loader2 className="size-4 animate-spin mr-2" />Saving…</> : 'Save Changes'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ResponsiveLayout>
  );
}
