'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Ruler, ChevronLeft, Loader2, CheckCircle, XCircle, Clock,
  FileDown, Plus, Trash2, Search, UserCheck,
} from 'lucide-react';
import { generateDimensionalReport, type DimReportItem, type DimReportMeta } from '@/lib/dimensional-pdf-generator';

// ── Types ─────────────────────────────────────────────────────────────────────

type Project = { id: string; projectNumber: string; name: string };

type Building = { id: string; designation: string; name: string };

type Employee = { id: string; name: string; position: string | null };

type RFIOption = {
  id: string;
  rfiNumber: string | null;
  processType: string | null;
  requestDate: string;
  status: string;
  building: { designation: string; name: string } | null;
  productionLogs: {
    productionLog: {
      id: string;
      processedQty: number;
      assemblyPart: {
        partDesignation: string;
        name: string;
        assemblyMark: string;
        profile: string | null;
        lengthMm: string | null;
        quantity: number;
      };
    };
  }[];
};

type ProductionLogOption = {
  id: string;
  processType: string;
  processedQty: number;
  assemblyPart: {
    partDesignation: string;
    name: string;
    assemblyMark: string;
    profile: string | null;
    lengthMm: string | null;
    quantity: number;
  };
};

type MeasurementRow = {
  productionLogId: string;
  assemblyMark: string;
  profile: string;
  partDesignation: string;
  checkedQty: number;
  totalQty: number;
  dwgLengthMm: number | null;
  actualLengthMm: string;
  toleranceMm: string;
  differenceMm: number | null;
  result: 'Pass' | 'Fail' | 'Pending';
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcRow(row: MeasurementRow): MeasurementRow {
  const actual = parseFloat(row.actualLengthMm);
  const tol = parseFloat(row.toleranceMm);
  if (!isNaN(actual) && row.dwgLengthMm !== null && !isNaN(tol)) {
    const diff = actual - row.dwgLengthMm;
    const pass = Math.abs(diff) <= tol;
    return { ...row, differenceMm: parseFloat(diff.toFixed(1)), result: pass ? 'Pass' : 'Fail' };
  }
  return { ...row, differenceMm: null, result: 'Pending' };
}

function ResultBadge({ result }: { result: string }) {
  if (result === 'Pass' || result === 'Accepted') {
    return (
      <Badge className="bg-green-500/10 text-green-700 border border-green-200 whitespace-nowrap">
        <CheckCircle className="h-3 w-3 mr-1" /> Pass
      </Badge>
    );
  }
  if (result === 'Fail' || result === 'Rejected') {
    return (
      <Badge className="bg-red-500/10 text-red-700 border border-red-200 whitespace-nowrap">
        <XCircle className="h-3 w-3 mr-1" /> Fail
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-500/10 text-gray-500 whitespace-nowrap">
      <Clock className="h-3 w-3 mr-1" /> —
    </Badge>
  );
}

function logToRow(log: ProductionLogOption): MeasurementRow {
  return {
    productionLogId: log.id,
    assemblyMark: log.assemblyPart.assemblyMark,
    profile: log.assemblyPart.profile || '',
    partDesignation: log.assemblyPart.partDesignation,
    checkedQty: log.processedQty,
    totalQty: log.assemblyPart.quantity,
    dwgLengthMm: log.assemblyPart.lengthMm ? parseFloat(log.assemblyPart.lengthMm) : null,
    actualLengthMm: '',
    toleranceMm: '2',
    differenceMm: null,
    result: 'Pending',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewDimensionalInspectionPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'rfi' | 'direct'>('rfi');

  // shared
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportNumber, setReportNumber] = useState('');
  const [rows, setRows] = useState<MeasurementRow[]>([]);

  // Checked by
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [checkedById, setCheckedById] = useState('');

  // RFI mode
  const [rfis, setRfis] = useState<RFIOption[]>([]);
  const [selectedRfi, setSelectedRfi] = useState('');
  const [loadingRfis, setLoadingRfis] = useState(false);

  // Direct mode
  const [prodLogs, setProdLogs] = useState<ProductionLogOption[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: Project[]) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/users?forAssignment=true')
      .then((r) => r.json())
      .then((data: Employee[]) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setBuildings([]);
      setSelectedBuilding('');
      return;
    }
    fetch(`/api/projects/${selectedProject}/buildings`)
      .then((r) => r.json())
      .then((data: Building[]) => setBuildings(Array.isArray(data) ? data : []))
      .catch(() => setBuildings([]));
  }, [selectedProject]);

  const loadRfis = useCallback(async () => {
    if (!selectedProject) return;
    setLoadingRfis(true);
    try {
      const params = new URLSearchParams({
        projectId: selectedProject,
        inspectionType: 'Dimension Check',
      });
      if (selectedBuilding) params.set('buildingId', selectedBuilding);
      const r = await fetch(`/api/qc/rfi?${params}`);
      const data: RFIOption[] = await r.json();
      setRfis(Array.isArray(data) ? data : []);
    } catch {
      setRfis([]);
    } finally {
      setLoadingRfis(false);
    }
  }, [selectedProject, selectedBuilding]);

  const loadProdLogs = useCallback(async () => {
    if (!selectedProject) return;
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        projectId: selectedProject,
        process: 'Fit-up',
        limit: '200',
      });
      if (selectedBuilding) params.set('buildingId', selectedBuilding);
      const r = await fetch(`/api/production/logs?${params}`);
      const data = await r.json();
      setProdLogs(Array.isArray(data.data) ? data.data : []);
    } catch {
      setProdLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedProject, selectedBuilding]);

  useEffect(() => {
    if (mode === 'rfi') loadRfis();
    else loadProdLogs();
    setRows([]);
    setSelectedRfi('');
    setSelectedLogIds(new Set());
  }, [mode, loadRfis, loadProdLogs]);

  // When an RFI is chosen, populate rows
  useEffect(() => {
    if (!selectedRfi) { setRows([]); return; }
    const rfi = rfis.find((r) => r.id === selectedRfi);
    if (!rfi) return;
    const newRows = rfi.productionLogs.map((pl) => logToRow(pl.productionLog as ProductionLogOption));
    setRows(newRows);
  }, [selectedRfi, rfis]);

  // When direct selection changes, update rows
  useEffect(() => {
    if (mode !== 'direct') return;
    const selected = prodLogs.filter((l) => selectedLogIds.has(l.id));
    setRows(selected.map(logToRow));
  }, [selectedLogIds, prodLogs, mode]);

  // ── Row edits ────────────────────────────────────────────────────────────────

  function updateRow(idx: number, field: 'actualLengthMm' | 'toleranceMm', value: string) {
    setRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[idx], [field]: value };
      updated[idx] = calcRow(row);
      return updated;
    });
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedProject || rows.length === 0) return;
    setSubmitting(true);
    setSubmitError('');

    const rfi = rfis.find((r) => r.id === selectedRfi);
    const items = rows.map((row) => ({
      productionLogId: row.productionLogId,
      partDesignation: row.partDesignation,
      drawingLength: row.dwgLengthMm,
      actualLength: row.actualLengthMm ? parseFloat(row.actualLengthMm) : undefined,
      toleranceMm: parseFloat(row.toleranceMm) || 2,
      remarks: '',
    }));

    try {
      const resp = await fetch('/api/qc/dimensional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          buildingId: selectedBuilding || undefined,
          rfiRequestId: selectedRfi || undefined,
          inspectionDate,
          checkedById: checkedById || undefined,
          items,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        setSubmitError(err.error || 'Failed to create inspection');
        return;
      }

      const created = await resp.json();

      // Build PDF report
      const proj = projects.find((p) => p.id === selectedProject);
      const bld = buildings.find((b) => b.id === selectedBuilding);
      const checkedByEmployee = employees.find((e) => e.id === checkedById);

      const pdfItems: DimReportItem[] = rows.map((row, idx) => ({
        sn: idx + 1,
        pid: String(idx + 1).padStart(5, '0'),
        assemblyMark: row.assemblyMark,
        revision: '',
        profile: row.profile,
        designation: row.partDesignation,
        checkedQty: row.checkedQty,
        dwgLengthMm: row.dwgLengthMm,
        actualLengthMm: row.actualLengthMm ? parseFloat(row.actualLengthMm) : null,
        differenceMm: row.differenceMm,
        toleranceMm: parseFloat(row.toleranceMm) || 2,
        finalResult: row.result === 'Pass' ? 'Pass' : row.result === 'Fail' ? 'Fail' : 'Pending',
        totalQty: row.totalQty,
      }));

      const now = new Date(inspectionDate);
      const pdfMeta: DimReportMeta = {
        date: now.toLocaleDateString('en-SA-u-ca-gregory', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        reportNumber: reportNumber || (created[0]?.inspectionNumber?.replace('DIM-', 'RPT-') ?? 'RPT-001'),
        projectNumber: proj?.projectNumber ?? '',
        buildingName: bld ? `${bld.designation} – ${bld.name}` : '—',
        projectName: proj?.name ?? '',
        preparedBy: checkedByEmployee?.name ?? 'Hexa QC Inspector',
        checkedBy: checkedByEmployee?.name ?? '—',
        inspectorName: 'Hexa QC Inspector',
        rfiNumber: rfi?.rfiNumber?.replace('RFI-', '') ?? '—',
        qtyBuilding: String(rows.reduce((s, r) => s + r.checkedQty, 0)),
        inspectionDate: now.toLocaleDateString('en-SA-u-ca-gregory'),
        inspectionTime: new Date().toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };

      generateDimensionalReport(pdfMeta, pdfItems);

      router.push('/qc/dimensional');
    } catch {
      setSubmitError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Filtered prod logs ───────────────────────────────────────────────────────

  const filteredLogs = prodLogs.filter(
    (l) =>
      !searchQuery ||
      l.assemblyPart.partDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.assemblyPart.assemblyMark.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = filteredLogs.length > 0 && filteredLogs.every((l) => selectedLogIds.has(l.id));

  function toggleLog(id: string) {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(filteredLogs.map((l) => l.id)));
    }
  }

  const passCount = rows.filter((r) => r.result === 'Pass').length;
  const failCount = rows.filter((r) => r.result === 'Fail').length;
  const pendingCount = rows.filter((r) => r.result === 'Pending').length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/qc/dimensional">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ruler className="h-6 w-6" /> New Dimensional Inspection
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Form: HEXA-FRM-021 · Procedure: Hexa-ISP-013 · ISO §8.5.1, §8.6
          </p>
        </div>
      </div>

      {/* Step 1 – Project & Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Project & Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Project *</Label>
              <select
                value={selectedProject}
                onChange={(e) => { setSelectedProject(e.target.value); setRows([]); }}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectNumber} — {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Building</Label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                disabled={!selectedProject}
              >
                <option value="">All Buildings</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.designation} – {b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Inspection Date</Label>
              <Input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Report Number (optional)</Label>
              <Input
                placeholder="e.g. 270-PIC-PI-01"
                value={reportNumber}
                onChange={(e) => setReportNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" /> Checked By
              </Label>
              <select
                value={checkedById}
                onChange={(e) => setCheckedById(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">— Select employee —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}{e.position ? ` · ${e.position}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMode('rfi')}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                mode === 'rfi'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              From RFI (fit-up items)
            </button>
            <button
              type="button"
              onClick={() => setMode('direct')}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                mode === 'direct'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              Direct (non-inspected items)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 – Select source */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {mode === 'rfi' ? '2. Select RFI' : '2. Select Production Logs'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === 'rfi' ? (
              loadingRfis ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading RFIs…
                </div>
              ) : rfis.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open Dimension Check RFIs found for this project.
                </p>
              ) : (
                <div className="space-y-2">
                  {rfis.map((rfi) => (
                    <label
                      key={rfi.id}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedRfi === rfi.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rfi"
                        value={rfi.id}
                        checked={selectedRfi === rfi.id}
                        onChange={() => setSelectedRfi(rfi.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">{rfi.rfiNumber}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            {rfi.processType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {rfi.productionLogs.length} part(s)
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {rfi.building
                            ? `${rfi.building.designation} – ${rfi.building.name} · `
                            : ''}
                          Requested{' '}
                          {new Date(rfi.requestDate).toLocaleDateString('en-SA-u-ca-gregory')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )
            ) : (
              /* Direct mode — multi-select checklist */
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by mark or designation…"
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedLogIds.size} selected
                  </span>
                </div>

                {loadingLogs ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading production logs…
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Fit-up logs found.</p>
                ) : (
                  <div className="border rounded-md overflow-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 sticky top-0">
                        <tr>
                          <th className="p-2 text-left w-8">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleAll}
                              className="cursor-pointer"
                            />
                          </th>
                          <th className="p-2 text-left font-medium">Assembly Mark</th>
                          <th className="p-2 text-left font-medium">Designation</th>
                          <th className="p-2 text-left font-medium">Profile</th>
                          <th className="p-2 text-right font-medium">DWG Length (mm)</th>
                          <th className="p-2 text-right font-medium">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log) => (
                          <tr
                            key={log.id}
                            className={`border-t cursor-pointer hover:bg-muted/30 ${
                              selectedLogIds.has(log.id) ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => toggleLog(log.id)}
                          >
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedLogIds.has(log.id)}
                                onChange={() => toggleLog(log.id)}
                                className="cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="p-2 font-mono text-xs">{log.assemblyPart.assemblyMark}</td>
                            <td className="p-2">{log.assemblyPart.partDesignation}</td>
                            <td className="p-2 text-muted-foreground">{log.assemblyPart.profile || '—'}</td>
                            <td className="p-2 text-right font-mono">
                              {log.assemblyPart.lengthMm
                                ? parseFloat(log.assemblyPart.lengthMm).toFixed(0)
                                : '—'}
                            </td>
                            <td className="p-2 text-right">{log.processedQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 – Measurement table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">3. Enter Actual Dimensions</CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle className="h-4 w-4" /> {passCount} Pass
                </span>
                <span className="flex items-center gap-1 text-red-700">
                  <XCircle className="h-4 w-4" /> {failCount} Fail
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" /> {pendingCount} Pending
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Assembly Mark</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Profile</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Designation</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Checked Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">DWG Length (mm)</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Actual Length (mm)</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Difference (mm)</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Tolerance (±mm)</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Result</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.productionLogId}
                      className={`border-t ${
                        row.result === 'Pass'
                          ? 'bg-green-50/40'
                          : row.result === 'Fail'
                          ? 'bg-red-50/40'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.assemblyMark}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.profile || '—'}</td>
                      <td className="px-3 py-2">{row.partDesignation}</td>
                      <td className="px-3 py-2 text-right">{row.checkedQty}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.dwgLengthMm !== null ? row.dwgLengthMm.toFixed(0) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="—"
                          value={row.actualLengthMm}
                          onChange={(e) => updateRow(idx, 'actualLengthMm', e.target.value)}
                          className="h-8 w-24 text-right font-mono mx-auto"
                        />
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {row.differenceMm !== null ? (
                          <span className={Math.abs(row.differenceMm) > (parseFloat(row.toleranceMm) || 2) ? 'text-red-600 font-semibold' : 'text-green-700'}>
                            {row.differenceMm > 0 ? '+' : ''}{row.differenceMm}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.5"
                          value={row.toleranceMm}
                          onChange={(e) => updateRow(idx, 'toleranceMm', e.target.value)}
                          className="h-8 w-16 text-right font-mono mx-auto"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <ResultBadge result={row.result} />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {rows.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {submitError && (
            <p className="text-sm text-red-600 w-full">{submitError}</p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedProject}
            className="gap-2"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Plus className="h-4 w-4" /> Save &amp; Download Report</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const proj = projects.find((p) => p.id === selectedProject);
              const bld = buildings.find((b) => b.id === selectedBuilding);
              const rfi = rfis.find((r) => r.id === selectedRfi);
              const checkedByEmployee = employees.find((e) => e.id === checkedById);
              const now = new Date(inspectionDate);
              const pdfItems: DimReportItem[] = rows.map((row, idx) => ({
                sn: idx + 1,
                pid: String(idx + 1).padStart(5, '0'),
                assemblyMark: row.assemblyMark,
                revision: '',
                profile: row.profile,
                designation: row.partDesignation,
                checkedQty: row.checkedQty,
                dwgLengthMm: row.dwgLengthMm,
                actualLengthMm: row.actualLengthMm ? parseFloat(row.actualLengthMm) : null,
                differenceMm: row.differenceMm,
                toleranceMm: parseFloat(row.toleranceMm) || 2,
                finalResult: row.result === 'Pass' ? 'Pass' : row.result === 'Fail' ? 'Fail' : 'Pending',
                totalQty: row.totalQty,
              }));
              generateDimensionalReport(
                {
                  date: now.toLocaleDateString('en-SA-u-ca-gregory', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
                  reportNumber: reportNumber || 'DRAFT',
                  projectNumber: proj?.projectNumber ?? '',
                  buildingName: bld ? `${bld.designation} – ${bld.name}` : '—',
                  projectName: proj?.name ?? '',
                  preparedBy: checkedByEmployee?.name ?? 'Hexa QC Inspector',
                  checkedBy: checkedByEmployee?.name ?? '—',
                  inspectorName: 'Hexa QC Inspector',
                  rfiNumber: rfi?.rfiNumber?.replace('RFI-', '') ?? '—',
                  qtyBuilding: String(rows.reduce((s, r) => s + r.checkedQty, 0)),
                  inspectionDate: now.toLocaleDateString('en-SA-u-ca-gregory'),
                  inspectionTime: new Date().toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit', hour12: true }),
                },
                pdfItems
              );
            }}
            className="gap-2"
            disabled={!selectedProject}
          >
            <FileDown className="h-4 w-4" /> Preview PDF
          </Button>
          <Link href="/qc/dimensional">
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
