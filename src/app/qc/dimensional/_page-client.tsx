'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Ruler, Search, Plus, CheckCircle, XCircle, Clock, Loader2,
  FileDown, SendHorizonal, ShieldCheck, ShieldX, ClipboardList,
  MoreHorizontal, AlertCircle,
} from 'lucide-react';
import { generateDimensionalReport, type DimReportItem, type DimReportMeta } from '@/lib/dimensional-pdf-generator';

type Inspection = {
  id: string;
  inspectionNumber: string;
  partDesignation: string;
  result: string;
  toleranceCheck: string;
  approvalStatus: string;
  inspectionDate: string;
  measuredLength: number | null;
  requiredLength: number | null;
  lengthTolerance: number | null;
  projectId: string;
  rfiRequestId: string | null;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; designation: string; name: string } | null;
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
  checkedBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  rfiRequest: { id: string; rfiNumber: string | null } | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function WorkflowBadge({ status }: { status: string }) {
  switch (status) {
    case 'Approved':
      return (
        <Badge className="bg-green-500/15 text-green-700 border border-green-300 font-semibold whitespace-nowrap">
          <ShieldCheck className="h-3 w-3 mr-1" /> Approved
        </Badge>
      );
    case 'Rejected':
      return (
        <Badge className="bg-red-500/15 text-red-700 border border-red-300 font-semibold whitespace-nowrap">
          <ShieldX className="h-3 w-3 mr-1" /> Rejected
        </Badge>
      );
    case 'PendingApproval':
      return (
        <Badge className="bg-amber-500/15 text-amber-700 border border-amber-300 whitespace-nowrap">
          <ClipboardList className="h-3 w-3 mr-1" /> Pending Approval
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-500/10 text-gray-600 whitespace-nowrap">
          <Clock className="h-3 w-3 mr-1" /> Draft
        </Badge>
      );
  }
}

function ResultBadge({ result }: { result: string }) {
  switch (result) {
    case 'Accepted':
      return (
        <Badge className="bg-green-500/10 text-green-600 whitespace-nowrap">
          <CheckCircle className="h-3 w-3 mr-1" /> Accepted
        </Badge>
      );
    case 'Rejected':
      return (
        <Badge className="bg-red-500/10 text-red-600 whitespace-nowrap">
          <XCircle className="h-3 w-3 mr-1" /> Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-blue-500/10 text-blue-600 whitespace-nowrap">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
  }
}

export default function DimensionalInspectionPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<{ id: string; projectNumber: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [workflowBusy, setWorkflowBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchInspections();
    fetchProjects();
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/qc/dimensional');
      if (r.ok) setInspections(await r.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const r = await fetch('/api/projects');
      if (r.ok) setProjects(await r.json());
    } catch { /* ignore */ }
  };

  const filtered = inspections.filter((i) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      i.inspectionNumber?.toLowerCase().includes(q) ||
      i.partDesignation?.toLowerCase().includes(q) ||
      i.productionLog?.assemblyPart.assemblyMark?.toLowerCase().includes(q);
    const matchProject = projectFilter === 'all' || i.projectId === projectFilter;
    const matchResult  = resultFilter === 'all' || i.result === resultFilter;
    const matchApproval = approvalFilter === 'all' || (i.approvalStatus ?? 'Draft') === approvalFilter;
    return matchSearch && matchProject && matchResult && matchApproval;
  });

  const stats = {
    total:   inspections.length,
    draft:   inspections.filter(i => !i.approvalStatus || i.approvalStatus === 'Draft').length,
    pending: inspections.filter(i => i.approvalStatus === 'PendingApproval').length,
    approved: inspections.filter(i => i.approvalStatus === 'Approved').length,
    rejected: inspections.filter(i => i.approvalStatus === 'Rejected').length,
  };

  async function runWorkflow(id: string, action: 'submit' | 'approve' | 'reject') {
    setWorkflowBusy(id);
    try {
      const r = await fetch('/api/qc/dimensional/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionIds: [id], action }),
      });
      if (r.ok) fetchInspections();
    } finally {
      setWorkflowBusy(null);
    }
  }

  function downloadGroupPdf(rfiId: string) {
    const group = inspections.filter(i => i.rfiRequestId === rfiId);
    if (!group.length) return;
    const proj = projects.find(p => p.id === group[0].projectId);
    const rfiNumber = group[0].rfiRequest?.rfiNumber ?? '—';

    const items: DimReportItem[] = group.map((insp, idx) => ({
      sn: idx + 1,
      pid: String(idx + 1).padStart(5, '0'),
      assemblyMark: insp.productionLog?.assemblyPart.assemblyMark ?? '—',
      revision: '',
      profile: insp.productionLog?.assemblyPart.profile ?? '',
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
      buildingName: group[0].building ? `${group[0].building.designation} – ${group[0].building.name}` : '—',
      projectName: proj?.name ?? '',
      preparedBy: group[0].checkedBy?.name ?? group[0].inspector?.name ?? '—',
      checkedBy: group[0].checkedBy?.name ?? '—',
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
      {/* Header */}
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

      {/* KPI tiles — clickable filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${approvalFilter === 'all' ? 'ring-2 ring-primary/50 shadow-md' : 'hover:ring-1 hover:ring-muted-foreground/20'}`}
          onClick={() => setApprovalFilter('all')}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${approvalFilter === 'Draft' ? 'ring-2 ring-gray-400/50 shadow-md' : 'hover:ring-1 hover:ring-muted-foreground/20'}`}
          onClick={() => setApprovalFilter('Draft')}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Draft</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${approvalFilter === 'PendingApproval' ? 'ring-2 ring-amber-400/50 shadow-md' : 'hover:ring-1 hover:ring-muted-foreground/20'}`}
          onClick={() => setApprovalFilter('PendingApproval')}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${approvalFilter === 'Approved' ? 'ring-2 ring-green-400/50 shadow-md' : 'hover:ring-1 hover:ring-muted-foreground/20'}`}
          onClick={() => setApprovalFilter('Approved')}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${approvalFilter === 'Rejected' ? 'ring-2 ring-red-400/50 shadow-md' : 'hover:ring-1 hover:ring-muted-foreground/20'}`}
          onClick={() => setApprovalFilter('Rejected')}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected</p>
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
                placeholder="Search by inspection #, designation, or mark…"
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
                <option key={p.id} value={p.id}>{p.projectNumber} — {p.name}</option>
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Records ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium">Inspection #</th>
                  <th className="text-left px-4 py-3 font-medium">Project</th>
                  <th className="text-left px-4 py-3 font-medium">Assembly Mark</th>
                  <th className="text-left px-4 py-3 font-medium">Profile</th>
                  <th className="text-right px-4 py-3 font-medium">DWG (mm)</th>
                  <th className="text-right px-4 py-3 font-medium">Actual (mm)</th>
                  <th className="text-right px-4 py-3 font-medium">Diff</th>
                  <th className="text-left px-4 py-3 font-medium">RFI</th>
                  <th className="text-left px-4 py-3 font-medium">Result</th>
                  <th className="text-left px-4 py-3 font-medium">Approval</th>
                  <th className="text-left px-4 py-3 font-medium">Checked By</th>
                  <th className="text-center px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No inspection records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((insp) => {
                    const diff =
                      insp.measuredLength !== null && insp.requiredLength !== null
                        ? parseFloat((insp.measuredLength - insp.requiredLength).toFixed(1))
                        : null;
                    const tol = insp.lengthTolerance ?? 2;
                    const busy = workflowBusy === insp.id;
                    const approvalStatus = insp.approvalStatus ?? 'Draft';
                    return (
                      <tr key={insp.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{insp.inspectionNumber}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{insp.project?.projectNumber ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-semibold">{insp.productionLog?.assemblyPart.assemblyMark ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{insp.partDesignation}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {insp.productionLog?.assemblyPart.profile ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {insp.requiredLength !== null ? insp.requiredLength.toFixed(0) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {insp.measuredLength !== null ? insp.measuredLength.toFixed(0) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {diff !== null ? (
                            <span className={Math.abs(diff) > tol ? 'text-red-600 font-semibold' : 'text-green-700'}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {insp.rfiRequest?.rfiNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3"><ResultBadge result={insp.result} /></td>
                        <td className="px-4 py-3"><WorkflowBadge status={approvalStatus} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {insp.checkedBy?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(insp.inspectionDate)}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {insp.rfiRequestId && (
                                <DropdownMenuItem onClick={() => downloadGroupPdf(insp.rfiRequestId!)}>
                                  <FileDown className="h-4 w-4 mr-2" /> Download PDF
                                </DropdownMenuItem>
                              )}
                              {(approvalStatus === 'Draft' || approvalStatus === 'Rejected') && (
                                <>
                                  {insp.rfiRequestId && <DropdownMenuSeparator />}
                                  <DropdownMenuItem onClick={() => runWorkflow(insp.id, 'submit')} disabled={busy}>
                                    <SendHorizonal className="h-4 w-4 mr-2" /> Submit for Approval
                                  </DropdownMenuItem>
                                </>
                              )}
                              {approvalStatus === 'PendingApproval' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => runWorkflow(insp.id, 'approve')}
                                    disabled={busy}
                                    className="text-green-700 focus:text-green-700"
                                  >
                                    <ShieldCheck className="h-4 w-4 mr-2" /> Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => runWorkflow(insp.id, 'reject')}
                                    disabled={busy}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <ShieldX className="h-4 w-4 mr-2" /> Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
