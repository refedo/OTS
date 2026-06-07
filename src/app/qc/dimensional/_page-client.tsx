'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ruler, Search, Plus, CheckCircle, XCircle, Clock, Loader2, FileDown } from 'lucide-react';
import { generateDimensionalReport, type DimReportItem, type DimReportMeta } from '@/lib/dimensional-pdf-generator';

type Inspection = {
  id: string;
  inspectionNumber: string;
  partDesignation: string;
  result: string;
  toleranceCheck: string;
  inspectionDate: string;
  measuredLength: number | null;
  measuredWidth: number | null;
  measuredHeight: number | null;
  requiredLength: number | null;
  lengthTolerance: number | null;
  projectId: string;
  rfiRequestId: string | null;
  project: { id: string; projectNumber: string; name: string } | null;
  productionLog: {
    assemblyPart: {
      partDesignation: string;
      name: string;
      assemblyMark: string;
      profile: string | null;
      lengthMm: string | null;
      quantity: number;
    };
  } | null;
  inspector: { id: string; name: string } | null;
  rfiRequest: { id: string; rfiNumber: string | null } | null;
};

export default function DimensionalInspectionPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<{ id: string; projectNumber: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  useEffect(() => {
    fetchInspections();
    fetchProjects();
  }, []);

  const fetchInspections = async () => {
    try {
      const response = await fetch('/api/qc/dimensional');
      if (response.ok) {
        const data = await response.json();
        setInspections(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently ignore
    }
  };

  const filteredInspections = inspections.filter((i) => {
    const matchesSearch =
      i.inspectionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.partDesignation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = projectFilter === 'all' || i.projectId === projectFilter;
    const matchesResult = resultFilter === 'all' || i.result === resultFilter;
    return matchesSearch && matchesProject && matchesResult;
  });

  const stats = {
    total: inspections.length,
    accepted: inspections.filter((i) => i.result === 'Accepted').length,
    rejected: inspections.filter((i) => i.result === 'Rejected').length,
    pending: inspections.filter((i) => i.result === 'Pending').length,
  };

  function getResultBadge(result: string) {
    const map: Record<string, React.ReactElement> = {
      Accepted: (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" /> Accepted
        </span>
      ),
      Rejected: (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3" /> Rejected
        </span>
      ),
      Pending: (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3" /> Pending
        </span>
      ),
    };
    return map[result] ?? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{result}</span>
    );
  }

  function downloadGroupPdf(rfiId: string) {
    const group = inspections.filter((i) => i.rfiRequestId === rfiId);
    if (group.length === 0) return;

    const proj = projects.find((p) => p.id === group[0].projectId);
    const rfiNumber = group[0].rfiRequest?.rfiNumber ?? '—';

    const items: DimReportItem[] = group.map((insp, idx) => ({
      sn: idx + 1,
      pid: String(idx + 1).padStart(5, '0'),
      assemblyMark: insp.productionLog?.assemblyPart.assemblyMark ?? '—',
      revision: '',
      profile: insp.productionLog?.assemblyPart.profile ?? 'BEAM',
      designation: insp.partDesignation,
      checkedQty: 1,
      dwgLengthMm: insp.requiredLength,
      actualLengthMm: insp.measuredLength,
      differenceMm:
        insp.measuredLength !== null && insp.requiredLength !== null
          ? parseFloat((insp.measuredLength - insp.requiredLength).toFixed(1))
          : null,
      toleranceMm: insp.lengthTolerance ?? 2,
      finalResult: insp.result === 'Accepted' ? 'Pass' : insp.result === 'Rejected' ? 'Fail' : 'Pending',
      totalQty: insp.productionLog?.assemblyPart.quantity ?? 1,
    }));

    const now = new Date(group[0].inspectionDate);
    const meta: DimReportMeta = {
      date: now.toLocaleDateString('en-SA-u-ca-gregory', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      reportNumber: group[0].inspectionNumber.replace('DIM-', 'RPT-'),
      projectNumber: proj?.projectNumber ?? '',
      buildingName: '—',
      projectName: proj?.name ?? '',
      preparedBy: group[0].inspector?.name ?? '—',
      inspectorName: group[0].inspector?.name ?? 'Hexa QC Inspector',
      rfiNumber: rfiNumber.replace('RFI-', ''),
      qtyBuilding: String(group.length),
      inspectionDate: now.toLocaleDateString('en-SA-u-ca-gregory'),
      inspectionTime: now.toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' }),
    };

    generateDimensionalReport(meta, items);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Ruler className="h-8 w-8" /> Dimensional QC Inspection
          </h1>
          <p className="text-muted-foreground mt-1">Dimensional accuracy and tolerance verification</p>
          <p className="text-muted-foreground/60 text-xs font-mono mt-0.5">
            Form: HEXA-FRM-021 · Procedure: Hexa-ISP-013 · ISO §8.5.1, §8.6
          </p>
        </div>
        <Button onClick={() => router.push('/qc/dimensional/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Inspection
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 relative min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by inspection # or part…"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectNumber}</option>
              ))}
            </select>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="all">All Results</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inspection records table */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Records ({filteredInspections.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium">Inspection #</th>
                  <th className="text-left px-4 py-3 font-medium">Project</th>
                  <th className="text-left px-4 py-3 font-medium">Part / Mark</th>
                  <th className="text-right px-4 py-3 font-medium">DWG (mm)</th>
                  <th className="text-right px-4 py-3 font-medium">Actual (mm)</th>
                  <th className="text-right px-4 py-3 font-medium">Diff (mm)</th>
                  <th className="text-left px-4 py-3 font-medium">RFI</th>
                  <th className="text-left px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      No inspection records found
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((insp) => {
                    const diff =
                      insp.measuredLength !== null && insp.requiredLength !== null
                        ? parseFloat((insp.measuredLength - insp.requiredLength).toFixed(1))
                        : null;
                    const tol = insp.lengthTolerance ?? 2;
                    return (
                      <tr key={insp.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{insp.inspectionNumber}</td>
                        <td className="px-4 py-3">{insp.project?.projectNumber ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div>{insp.partDesignation}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {insp.productionLog?.assemblyPart.assemblyMark}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {insp.requiredLength !== null ? insp.requiredLength : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {insp.measuredLength !== null ? insp.measuredLength : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {diff !== null ? (
                            <span className={Math.abs(diff) > tol ? 'text-red-600 font-semibold' : 'text-green-700'}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {insp.rfiRequest?.rfiNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3">{getResultBadge(insp.result)}</td>
                        <td className="px-4 py-3">
                          {insp.rfiRequestId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Download PDF report"
                              onClick={() => downloadGroupPdf(insp.rfiRequestId!)}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
