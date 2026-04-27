'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  AlertTriangle,
  Download,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Clause = {
  id: string;
  standard: string;
  clause: string;
  title: string;
  level: number;
  parentId: string | null;
};

type MatrixDocument = {
  id: string;
  documentNumber: string;
  title: string;
  status: string;
  clauseIds: string[];
};

type Coverage = {
  standard: string;
  totalClauses: number;
  mappedClauses: number;
  percentage: number;
};

type MatrixData = {
  clauses: Record<string, Clause[]>;
  documents: MatrixDocument[];
  coverage: Coverage[];
};

type Standard = 'ISO_9001' | 'ISO_14001' | 'ISO_45001';

// ─── Constants ────────────────────────────────────────────────────────────────

const STANDARDS: { key: Standard; label: string; color: string }[] = [
  { key: 'ISO_9001',  label: 'ISO 9001',  color: 'text-green-700' },
  { key: 'ISO_14001', label: 'ISO 14001', color: 'text-blue-700' },
  { key: 'ISO_45001', label: 'ISO 45001', color: 'text-purple-700' },
];

const STANDARD_LABELS: Record<Standard, string> = {
  ISO_9001:  'ISO 9001:2015',
  ISO_14001: 'ISO 14001:2015',
  ISO_45001: 'ISO 45001:2018',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function topLevelClause(clauseStr: string): string {
  return clauseStr.split('.')[0];
}

function getCoverageBarClass(standard: Standard): string {
  if (standard === 'ISO_9001')  return '[&>div]:bg-green-500';
  if (standard === 'ISO_14001') return '[&>div]:bg-blue-500';
  return '[&>div]:bg-purple-500';
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function MatrixSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded" />
        ))}
      </div>
      <Skeleton className="h-6 w-64" />
      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: 'minmax(180px,auto) repeat(5, 60px)' }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cell Component ───────────────────────────────────────────────────────────

interface CellProps {
  mapped: boolean;
  toggling: boolean;
  onToggle: () => void;
}

function MatrixCell({ mapped, toggling, onToggle }: CellProps) {
  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      className={cn(
        'w-full h-8 flex items-center justify-center rounded transition-colors text-sm border',
        mapped
          ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
          : 'bg-muted/30 border-transparent text-transparent hover:bg-muted/60 hover:text-muted-foreground',
        toggling && 'opacity-50 cursor-wait',
      )}
      title={mapped ? 'Click to remove mapping' : 'Click to add mapping'}
    >
      {mapped ? '✓' : '·'}
    </button>
  );
}

// ─── Standard Grid ────────────────────────────────────────────────────────────

interface StandardGridProps {
  standardKey: Standard;
  clauses: Clause[];
  documents: MatrixDocument[];
  onToggle: (docId: string, clauseId: string, mapped: boolean) => Promise<void>;
  togglingKey: string | null;
}

function StandardGrid({ standardKey, clauses, documents, onToggle, togglingKey }: StandardGridProps) {
  // Hooks must be called unconditionally before any early returns
  const clausesByTop = useMemo(() => {
    const map: Record<string, Clause[]> = {};
    for (const c of clauses) {
      const top = topLevelClause(c.clause);
      if (!map[top]) map[top] = [];
      map[top].push(c);
    }
    return map;
  }, [clauses]);

  const docClauseIds = useMemo(() => {
    return new Map<string, Set<string>>(
      documents.map((d: MatrixDocument) => [d.id, new Set(d.clauseIds)])
    );
  }, [documents]);

  const topLevelKeys = useMemo(() => {
    return Array.from(new Set(clauses.map((c: Clause) => topLevelClause(c.clause)))).sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [clauses]);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
          <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No documents in the registry yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add documents first, then map them to standard clauses here.
        </p>
      </div>
    );
  }

  if (clauses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No clauses found for this standard.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth: `${180 + documents.length * 68}px` }}>
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 min-w-[180px] sticky left-0 bg-muted/30 z-10">
              Clause
            </th>
            {documents.map((doc) => (
              <th
                key={doc.id}
                className="text-center px-1 py-2 min-w-[60px] max-w-[80px]"
                title={`${doc.documentNumber} — ${doc.title}`}
              >
                <span className="font-mono text-xs text-muted-foreground truncate block max-w-[72px] mx-auto">
                  {doc.documentNumber}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {topLevelKeys.map((topKey) => {
            const group = clausesByTop[topKey] ?? [];

            // Check if this top-level section has zero mapped documents across ALL its clauses
            const hasAnyMapping = documents.some((doc) => {
              const docSet = docClauseIds.get(doc.id);
              if (!docSet) return false;
              return group.some((c) => docSet.has(c.id));
            });

            return group.map((clause, idx) => {
              const isFirstInGroup = idx === 0;
              const isGap = isFirstInGroup && !hasAnyMapping;

              return (
                <tr
                  key={clause.id}
                  className={cn(
                    'border-b last:border-b-0 hover:bg-muted/20 transition-colors',
                    clause.level === 1 && 'bg-muted/10',
                  )}
                >
                  {/* Clause label */}
                  <td
                    className={cn(
                      'px-3 py-1.5 sticky left-0 z-10 bg-background',
                      clause.level === 1 && 'bg-muted/10',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isGap && isFirstInGroup && (
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
                          title="Gap: no documents mapped to this clause section"
                        />
                      )}
                      <span
                        className={cn(
                          'font-mono text-xs',
                          clause.level === 1 ? 'font-bold text-foreground' : 'text-muted-foreground',
                          isGap && isFirstInGroup && 'text-red-700',
                          clause.level > 1 && `pl-${Math.min((clause.level - 1) * 3, 12)}`,
                        )}
                        style={{ paddingLeft: clause.level > 1 ? `${(clause.level - 1) * 12}px` : undefined }}
                      >
                        {clause.clause}
                      </span>
                      <span
                        className={cn(
                          'text-xs truncate max-w-[200px]',
                          clause.level === 1 ? 'font-semibold text-foreground' : 'text-muted-foreground',
                          isGap && isFirstInGroup && 'text-red-700',
                        )}
                        title={clause.title}
                      >
                        {clause.title}
                      </span>
                    </div>
                  </td>

                  {/* Document cells */}
                  {documents.map((doc) => {
                    const docSet = docClauseIds.get(doc.id);
                    const mapped = docSet ? docSet.has(clause.id) : false;
                    const key = `${doc.id}-${clause.id}`;
                    return (
                      <td key={doc.id} className="px-1 py-1">
                        <MatrixCell
                          mapped={mapped}
                          toggling={togglingKey === key}
                          onToggle={() => onToggle(doc.id, clause.id, mapped)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImsClauseMatrixClient() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Standard>('ISO_9001');
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ims/clause-matrix');
      if (!res.ok) throw new Error('Failed to fetch clause matrix');
      const json = await res.json() as MatrixData;
      setData(json);
    } catch {
      setError('Failed to load clause matrix. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleToggle(docId: string, clauseId: string, mapped: boolean) {
    const key = `${docId}-${clauseId}`;
    setTogglingKey(key);
    try {
      if (mapped) {
        const res = await fetch(`/api/ims/clause-matrix/${docId}/${clauseId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to remove mapping');
      } else {
        const res = await fetch(`/api/ims/clause-matrix/${docId}/${clauseId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok && res.status !== 409) throw new Error('Failed to add mapping');
      }
      // Optimistic update
      setData((prev: MatrixData | null) => {
        if (!prev) return prev;
        const updated = prev.documents.map((doc: MatrixDocument) => {
          if (doc.id !== docId) return doc;
          const newClauseIds = mapped
            ? doc.clauseIds.filter((id: string) => id !== clauseId)
            : [...doc.clauseIds, clauseId];
          return { ...doc, clauseIds: newClauseIds };
        });
        // Recalculate coverage
        const coverage = prev.coverage.map((cov: Coverage) => {
          const stdClauses: Clause[] = prev.clauses[cov.standard] ?? [];
          const clauseIdSet = new Set(stdClauses.map((c: Clause) => c.id));
          const mappedSet = new Set<string>();
          for (const doc of updated) {
            for (const cid of doc.clauseIds) {
              if (clauseIdSet.has(cid)) mappedSet.add(cid);
            }
          }
          const mappedClauses = mappedSet.size;
          const percentage = cov.totalClauses > 0 ? Math.round((mappedClauses / cov.totalClauses) * 100) : 0;
          return { ...cov, mappedClauses, percentage };
        });
        return { ...prev, documents: updated, coverage };
      });
    } catch {
      // On error, refetch to get accurate state
      await fetchData();
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleExport() {
    if (!data) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const clauses = data.clauses[activeTab] ?? [];
      const documents = data.documents;

      const docClauseIds = new Map<string, Set<string>>(
        documents.map((d: MatrixDocument) => [d.id, new Set(d.clauseIds)])
      );

      // Header row: Clause | Title | doc1 | doc2 ...
      const header = ['Clause', 'Title', ...documents.map((d: MatrixDocument) => d.documentNumber)];

      const rows = clauses.map((clause: Clause) => {
        const cells = documents.map((doc: MatrixDocument) => {
          const docSet = docClauseIds.get(doc.id);
          return docSet?.has(clause.id) ? '✓' : '';
        });
        return [clause.clause, clause.title, ...cells];
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, STANDARD_LABELS[activeTab]);
      XLSX.writeFile(wb, `clause-matrix-${activeTab.toLowerCase().replace('_', '-')}.xlsx`);
    } catch {
      // Silent — export failure non-critical
    } finally {
      setExporting(false);
    }
  }

  // Coverage for active tab
  const activeCoverage = data?.coverage.find((c: Coverage) => c.standard === activeTab);
  const activeCoverageBarClass = getCoverageBarClass(activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.1),_transparent_60%)]" />
        <div className="relative px-6 py-10 md:px-10 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                <BookOpen className="h-7 w-7 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Clause Matrix
                  </h1>
                  <Badge className="bg-white/10 text-white border border-white/20 text-xs font-semibold px-2 py-0.5">
                    ISO Coverage
                  </Badge>
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  IMS · Standard Clause to Document Mapping
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={exporting || loading || !data}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting…' : 'Export to Excel'}
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

        {loading ? (
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <MatrixSkeleton />
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as Standard)}>
            {/* ── Tabs ── */}
            <TabsList className="mb-5">
              {STANDARDS.map((std) => {
                const cov = data?.coverage.find((c: Coverage) => c.standard === std.key);
                return (
                  <TabsTrigger key={std.key} value={std.key} className="gap-2">
                    {std.label}
                    {cov && (
                      <span className="text-xs font-medium opacity-70">
                        {cov.percentage}%
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {STANDARDS.map((std) => {
              const clauses = data?.clauses[std.key] ?? [];
              const documents = data?.documents ?? [];
              const cov = data?.coverage.find((c) => c.standard === std.key);

              return (
                <TabsContent key={std.key} value={std.key} className="space-y-4">

                  {/* ── Summary bar ── */}
                  {cov && (
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">
                                {cov.mappedClauses} of {cov.totalClauses} clauses covered
                              </span>
                              <span className={cn(
                                'font-bold text-base',
                                cov.percentage >= 80 ? 'text-green-600' :
                                cov.percentage >= 50 ? 'text-amber-600' : 'text-red-600',
                              )}>
                                {cov.percentage}%
                              </span>
                            </div>
                            <Progress
                              value={cov.percentage}
                              className={cn('h-2.5 bg-gray-100', std.key === activeTab ? activeCoverageBarClass : '')}
                            />
                          </div>
                          {cov.percentage < 100 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-4 flex-shrink-0">
                              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                              {cov.totalClauses - cov.mappedClauses} gap{cov.totalClauses - cov.mappedClauses !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Gap legend ── */}
                  {(data?.documents.length ?? 0) > 0 && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-green-100 border border-green-300 flex items-center justify-center text-green-700 font-bold text-[10px]">✓</span>
                        Mapped
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-muted/30 border border-transparent" />
                        Not mapped
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        Gap — no documents mapped to this clause section
                      </span>
                    </div>
                  )}

                  {/* ── Grid ── */}
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-sm font-semibold text-muted-foreground">
                        {STANDARD_LABELS[std.key]} — {clauses.length} clauses · {documents.length} documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <StandardGrid
                        standardKey={std.key}
                        clauses={clauses}
                        documents={documents}
                        onToggle={handleToggle}
                        togglingKey={togglingKey}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
}
