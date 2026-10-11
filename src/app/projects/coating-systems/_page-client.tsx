'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FolderKanban, Layers, Paintbrush, Palette, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { formatRal, getRalHex, getRalName, isKnownRal } from '@/lib/ral-colors';

type CoatingSource = 'system' | 'legacy' | 'scope';

interface ReportProject {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
}

interface ReportSystem {
  key: string;
  source: CoatingSource;
  project: ReportProject;
  systemName: string;
  appliesTo: string;
  isGalvanized: boolean;
  galvanizationMicrons: number | null;
  coats: { coatName: string; microns: number | null; ralNumber: string | null }[];
  totalMicrons: number;
}

interface ReportRow {
  key: string;
  system: ReportSystem;
  coatIndex: number | null;
  coatName: string;
  microns: number | null;
  ralNumber: string | null;
}

type SortDir = 'asc' | 'desc' | null;
interface SortState { key: string; dir: SortDir }

const ALL = 'ALL';

const SOURCE_LABEL: Record<CoatingSource, string> = {
  system: 'Coating system',
  legacy: 'Legacy project fields',
  scope: 'Scope override',
};

function RalSwatch({ ral }: { ral: string | null }) {
  if (!ral) return <span className="text-muted-foreground">—</span>;
  const known = isKnownRal(ral);
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-6 w-10 flex-shrink-0 rounded border border-black/15 shadow-sm"
        style={
          known
            ? { backgroundColor: getRalHex(ral) }
            : { backgroundImage: 'repeating-linear-gradient(45deg,#e5e7eb 0 4px,#f9fafb 4px 8px)' }
        }
        title={known ? `${formatRal(ral)} – ${getRalName(ral)}` : 'Colour not in RAL Classic palette'}
      />
      <div className="leading-tight">
        <div className="text-sm font-medium whitespace-nowrap">{formatRal(ral)}</div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">{known ? getRalName(ral) : 'Unknown colour'}</div>
      </div>
    </div>
  );
}

export function CoatingSystemsReportClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<ReportProject[]>([]);
  const [systems, setSystems] = useState<ReportSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [galvanizedOnly, setGalvanizedOnly] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: '', dir: null });

  const projectFilter = searchParams.get('projectId') ?? ALL;

  const setProjectFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete('projectId');
    else params.set('projectId', value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/coating-systems');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load coating systems');
      setProjects(data.projects ?? []);
      setSystems(data.systems ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load coating systems');
      setProjects([]);
      setSystems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const filteredSystems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return systems.filter((s) => {
      if (projectFilter !== ALL && s.project.id !== projectFilter) return false;
      if (galvanizedOnly && !s.isGalvanized) return false;
      if (!q) return true;
      return (
        s.project.projectNumber.toLowerCase().includes(q) ||
        s.project.name.toLowerCase().includes(q) ||
        s.systemName.toLowerCase().includes(q) ||
        s.appliesTo.toLowerCase().includes(q) ||
        s.coats.some((c) =>
          c.coatName.toLowerCase().includes(q) ||
          (c.ralNumber ?? '').toLowerCase().includes(q) ||
          (c.ralNumber ? getRalName(c.ralNumber).toLowerCase().includes(q) : false)
        )
      );
    });
  }, [systems, projectFilter, galvanizedOnly, search]);

  const rows = useMemo<ReportRow[]>(() => {
    const out: ReportRow[] = [];
    for (const s of filteredSystems) {
      if (s.coats.length === 0) {
        out.push({ key: `${s.key}:none`, system: s, coatIndex: null, coatName: '', microns: null, ralNumber: null });
        continue;
      }
      s.coats.forEach((c, i) => {
        out.push({ key: `${s.key}:${i}`, system: s, coatIndex: i + 1, coatName: c.coatName, microns: c.microns, ralNumber: c.ralNumber });
      });
    }
    return out;
  }, [filteredSystems]);

  const sortedRows = useMemo(() => {
    if (!sort.key || !sort.dir) return rows;
    const val = (r: ReportRow): string | number => {
      switch (sort.key) {
        case 'projectNumber': return r.system.project.projectNumber;
        case 'projectName': return r.system.project.name;
        case 'system': return r.system.systemName;
        case 'appliesTo': return r.system.appliesTo;
        case 'coat': return r.coatName;
        case 'microns': return r.microns ?? -1;
        case 'ral': return r.ralNumber ?? '';
        case 'total': return r.system.totalMicrons;
        default: return '';
      }
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [rows, sort]);

  const toggleSort = (key: string) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc') : 'asc',
    }));
  };

  const SortableHeader = ({ col, label, className }: { col: string; label: string; className?: string }) => (
    <TableHead
      className={`text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-muted/60 ${className ?? ''}`}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sort.key === col ? (sort.dir === 'asc' ? '↑' : sort.dir === 'desc' ? '↓' : '') : <span className="opacity-30">↕</span>}
      </span>
    </TableHead>
  );

  const kpis = useMemo(() => {
    const projectIds = new Set(filteredSystems.map((s) => s.project.id));
    const rals = new Set(
      filteredSystems.flatMap((s) => s.coats.map((c) => c.ralNumber).filter((r): r is string => !!r))
    );
    return {
      projects: projectIds.size,
      systems: filteredSystems.length,
      rals: rals.size,
      galvanized: filteredSystems.filter((s) => s.isGalvanized).length,
    };
  }, [filteredSystems]);

  const resetFilters = () => {
    setSearch('');
    setGalvanizedOnly(false);
    setSort({ key: '', dir: null });
    setProjectFilter(ALL);
  };

  const exportToExcel = () => {
    const data = sortedRows.map((r) => ({
      'Project No': r.system.project.projectNumber,
      'Project Name': r.system.project.name,
      'Coating System': r.system.systemName,
      'Applies To': r.system.appliesTo,
      'Galvanized': r.system.isGalvanized ? `Yes${r.system.galvanizationMicrons ? ` (${r.system.galvanizationMicrons} µm)` : ''}` : '',
      'Coat #': r.coatIndex ?? '',
      'Coat': r.coatName,
      'Microns (µm)': r.microns ?? '',
      'RAL': r.ralNumber ? formatRal(r.ralNumber) : '',
      'RAL Colour': r.ralNumber && isKnownRal(r.ralNumber) ? getRalName(r.ralNumber) : '',
      'System Total DFT (µm)': r.system.totalMicrons || '',
      'Source': SOURCE_LABEL[r.system.source],
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Coating Systems');
    const date = new Date().toLocaleDateString('en-CA');
    XLSX.writeFile(wb, `coating-systems-${date}.xlsx`);
  };

  const kpiTiles = [
    { label: 'Projects', value: kpis.projects, icon: FolderKanban, color: 'text-blue-600', onClick: resetFilters, hint: 'Show all projects' },
    { label: 'Coating Systems', value: kpis.systems, icon: Layers, color: 'text-violet-600', onClick: () => toggleSort('system'), hint: 'Sort by coating system' },
    { label: 'RAL Colours', value: kpis.rals, icon: Palette, color: 'text-pink-600', onClick: () => toggleSort('ral'), hint: 'Sort by RAL' },
    { label: 'Galvanized', value: kpis.galvanized, icon: ShieldCheck, color: 'text-zinc-600', onClick: () => setGalvanizedOnly((v) => !v), hint: galvanizedOnly ? 'Show all systems' : 'Show galvanized only', active: galvanizedOnly },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white">
        <div className="px-6 py-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Paintbrush className="h-5 w-5 opacity-70" />
                <span className="text-slate-300 text-xs font-medium uppercase tracking-wider">Projects › Coating Systems</span>
              </div>
              <h1 className="text-2xl font-bold">Coating Systems</h1>
              <p className="text-slate-300 text-sm mt-1">
                Coating systems, dry film thickness and RAL colours across all projects
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={fetchReport}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={exportToExcel}
                disabled={loading || sortedRows.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpiTiles.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={k.onClick}
              title={k.hint}
              className={`rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 ${k.active ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</span>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className="mt-2 text-2xl font-bold">{loading ? '…' : k.value}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[320px] bg-white dark:bg-background">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.projectNumber} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by system, coat, building or RAL…"
              className="pl-9 bg-white dark:bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(projectFilter !== ALL || search || galvanizedOnly) && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Table */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <SortableHeader col="projectNumber" label="Project No" />
                  <SortableHeader col="projectName" label="Project Name" />
                  <SortableHeader col="system" label="Coating System" />
                  <SortableHeader col="appliesTo" label="Applies To" />
                  <SortableHeader col="coat" label="Coat" />
                  <SortableHeader col="microns" label="Microns" className="text-right" />
                  <SortableHeader col="ral" label="RAL" />
                  <SortableHeader col="total" label="System DFT" className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin opacity-50" />
                        <span className="text-sm">Loading coating systems…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Paintbrush className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No coating systems found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.map((r) => (
                    <TableRow key={r.key} className="hover:bg-muted/40">
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/projects/${r.system.project.id}`} className="text-blue-600 hover:underline">
                          {r.system.project.projectNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-[180px]">{r.system.project.name}</TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="font-medium">{r.system.systemName}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {r.system.isGalvanized && (
                            <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-700 border-zinc-300">
                              Galvanized{r.system.galvanizationMicrons ? ` · ${r.system.galvanizationMicrons} µm` : ''}
                            </Badge>
                          )}
                          {r.system.source !== 'system' && (
                            <Badge variant="outline" className="text-[10px]">{SOURCE_LABEL[r.system.source]}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.system.appliesTo}</TableCell>
                      <TableCell className="min-w-[160px]">
                        {r.coatIndex !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {r.coatIndex}
                            </span>
                            <span className="text-sm">{r.coatName || '—'}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.microns !== null ? `${r.microns} µm` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><RalSwatch ral={r.ralNumber} /></TableCell>
                      <TableCell className="text-right whitespace-nowrap font-semibold text-blue-700">
                        {r.system.totalMicrons > 0 ? `${r.system.totalMicrons} µm` : <span className="text-muted-foreground font-normal">—</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {!loading && sortedRows.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {sortedRows.length} coat{sortedRows.length === 1 ? '' : 's'} across {kpis.systems} system{kpis.systems === 1 ? '' : 's'}. RAL swatches are approximate screen colours.
          </p>
        )}
      </div>
    </div>
  );
}
