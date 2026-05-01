'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Eye,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  level: number;
};

type Department = {
  id: string;
  name: string;
};

type Document = {
  id: string;
  documentNumber: string;
  title: string;
  titleAr: string | null;
  status: string;
  currentVersion: string;
  nextReviewDate: string | null;
  lastReviewDate: string | null;
  reviewFrequencyDays: number;
  applicableStandards: string | null;
  overdueDays: number | null;
  category: { id: string; code: string; name: string; nameAr: string | null } | null;
  department: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  reviewer: { id: string; name: string } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'OBSOLETE', label: 'Obsolete' },
  { value: 'SUPERSEDED', label: 'Superseded' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT:        'bg-gray-100 text-gray-700 border-gray-200',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700 border-blue-200',
    APPROVED:     'bg-green-100 text-green-700 border-green-200',
    OBSOLETE:     'bg-red-100 text-red-700 border-red-200',
    SUPERSEDED:   'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT:        'Draft',
    UNDER_REVIEW: 'Under Review',
    APPROVED:     'Approved',
    OBSOLETE:     'Obsolete',
    SUPERSEDED:   'Superseded',
  };
  return map[status] ?? status;
}

function categoryBadgeClass(level: number): string {
  const map: Record<number, string> = {
    1: 'bg-purple-100 text-purple-700 border-purple-200',
    2: 'bg-blue-100 text-blue-700 border-blue-200',
    3: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    4: 'bg-green-100 text-green-700 border-green-200',
    5: 'bg-orange-100 text-orange-700 border-orange-200',
    6: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return map[level] ?? 'bg-gray-100 text-gray-600 border-gray-200';
}

function parseStandards(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function standardBadgeClass(std: string): string {
  if (std.includes('9001')) return 'bg-green-100 text-green-700 border-green-200';
  if (std.includes('14001')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (std.includes('45001')) return 'bg-purple-100 text-purple-700 border-purple-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function standardShortLabel(std: string): string {
  if (std.includes('9001')) return '9001';
  if (std.includes('14001')) return '14001';
  if (std.includes('45001')) return '45001';
  return std;
}

function reviewDateCell(nextReviewDate: string | null, overdueDays: number | null) {
  if (!nextReviewDate) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const date = new Date(nextReviewDate);
  const formatted = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (overdueDays != null && overdueDays > 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-red-600 font-semibold text-xs">{formatted}</span>
        <span className="text-red-500 text-xs font-medium">{overdueDays}d overdue</span>
      </div>
    );
  }

  const now = new Date();
  const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 30) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-amber-600 font-medium text-xs">{formatted}</span>
        <span className="text-amber-500 text-xs">in {daysUntil}d</span>
      </div>
    );
  }

  return <span className="text-xs text-muted-foreground">{formatted}</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded" />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
        <FileText className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No documents found</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Try adjusting your filters or search query, or create a new document.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImsDocumentsClient() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [departmentId, setDepartmentId] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // ─── Fetch filters ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/ims/categories').then((r) => r.json()),
      fetch('/api/departments').then((r) => r.json()),
    ]).then(([cats, deps]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setDepartments(Array.isArray(deps) ? deps : []);
    }).catch(() => {
      // Non-critical; filters will be empty
    });
  }, []);

  // ─── Fetch documents ────────────────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId && categoryId !== 'ALL') params.set('categoryId', categoryId);
      if (status && status !== 'ALL') params.set('status', status);
      if (departmentId && departmentId !== 'ALL') params.set('departmentId', departmentId);
      if (overdueOnly) params.set('overdue', 'true');

      const res = await fetch(`/api/ims/documents?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json() as Document[];
      setDocuments(Array.isArray(data) ? data : []);
      setPage(1);
    } catch {
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, status, departmentId, overdueOnly]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ─── Clear filters ──────────────────────────────────────────────────────────

  function clearFilters() {
    setSearch('');
    setCategoryId('ALL');
    setStatus('ALL');
    setDepartmentId('ALL');
    setOverdueOnly(false);
  }

  const hasActiveFilters =
    search !== '' ||
    categoryId !== 'ALL' ||
    status !== 'ALL' ||
    departmentId !== 'ALL' ||
    overdueOnly;

  // ─── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
  const paginatedDocs = useMemo(
    () => documents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [documents, page],
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

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
                <FileText className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Document Registry
                  </h1>
                  {!loading && (
                    <Badge className="bg-white/10 text-white border border-white/20 text-xs font-semibold px-2 py-0.5">
                      {documents.length} doc{documents.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  IMS · Controlled Document Register
                </p>
                <p className="text-slate-500 text-xs font-mono mt-0.5">Form: HEXA-FRM-002, HEXA-FRM-004 · Procedure: Hexa-ISP-001 · ISO §4.4, §7.5.3</p>
              </div>
            </div>
            <Link href="/ims/documents/new">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                New Document
              </Button>
            </Link>
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
                  placeholder="Search title or doc number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Category */}
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 text-sm w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="font-mono text-xs mr-1.5 text-muted-foreground">{cat.code}</span>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm w-[160px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department */}
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-9 text-sm w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {dep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Overdue Only toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverdueOnly((v) => !v)}
                className={cn(
                  'h-9 gap-1.5 text-sm font-medium border',
                  overdueOnly
                    ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Overdue Only
              </Button>

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
            ) : documents.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap pl-4">
                        Doc #
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Title
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden md:table-cell">
                        Category
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">
                        Ver.
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">
                        Owner
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden md:table-cell">
                        Next Review
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">
                        Standards
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDocs.map((doc) => {
                      const isOverdue = doc.overdueDays != null && doc.overdueDays > 0;
                      const standards = parseStandards(doc.applicableStandards);

                      return (
                        <TableRow
                          key={doc.id}
                          className={cn(
                            'hover:bg-muted/40 transition-colors',
                            isOverdue && [
                              'bg-red-50 dark:bg-red-950/20',
                              'border-l-4 border-l-red-500',
                            ],
                          )}
                        >
                          {/* Doc Number */}
                          <TableCell className="pl-4 whitespace-nowrap">
                            <Link
                              href={`/ims/documents/${doc.id}`}
                              className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                            >
                              {doc.documentNumber}
                            </Link>
                          </TableCell>

                          {/* Title */}
                          <TableCell className="max-w-[240px]">
                            <div>
                              <Link
                                href={`/ims/documents/${doc.id}`}
                                className="text-sm font-medium text-foreground hover:underline hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
                              >
                                {doc.title}
                              </Link>
                              {doc.titleAr && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 text-right" dir="rtl">
                                  {doc.titleAr}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell className="hidden md:table-cell whitespace-nowrap">
                            {doc.category ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs font-medium',
                                  categoryBadgeClass(
                                    // We need the level — fetch from categories list
                                    categories.find((c) => c.id === doc.category?.id)?.level ?? 1,
                                  ),
                                )}
                              >
                                {doc.category.code}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={cn('text-xs font-medium', statusBadgeClass(doc.status))}
                            >
                              {statusLabel(doc.status)}
                            </Badge>
                          </TableCell>

                          {/* Version */}
                          <TableCell className="hidden lg:table-cell whitespace-nowrap">
                            <span className="text-xs text-muted-foreground font-mono">
                              v{doc.currentVersion}
                            </span>
                          </TableCell>

                          {/* Owner */}
                          <TableCell className="hidden lg:table-cell whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">
                              {doc.owner?.name ?? '—'}
                            </span>
                          </TableCell>

                          {/* Next Review */}
                          <TableCell className="hidden md:table-cell whitespace-nowrap">
                            {reviewDateCell(doc.nextReviewDate, doc.overdueDays)}
                          </TableCell>

                          {/* Standards */}
                          <TableCell className="hidden xl:table-cell">
                            <div className="flex gap-1 flex-wrap">
                              {standards.length === 0 ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                standards.map((std) => (
                                  <Badge
                                    key={std}
                                    variant="outline"
                                    className={cn('text-xs font-semibold px-1.5 py-0', standardBadgeClass(std))}
                                  >
                                    {standardShortLabel(std)}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-right pr-4">
                            <Link href={`/ims/documents/${doc.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="sr-only">View</span>
                              </Button>
                            </Link>
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

        {/* ── Pagination ── */}
        {!loading && documents.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground py-2">
            <span>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, documents.length)}–
              {Math.min(page * PAGE_SIZE, documents.length)} of {documents.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
              <span className="text-xs font-medium px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
