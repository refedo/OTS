'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface ProjectHealthRow {
  projectId: string;
  projectNumber: string;
  name: string;
  clientName: string;
  deadline: string | null;
  daysRemaining: number | null;
  engineeringPct: number | null;
  productionPct: number;
  procurementOverdue: number;
  collectionPct: number | null;
  riskCount: number;
  ragStatus: 'green' | 'amber' | 'red';
}

function RAGDot({ status }: { status: 'green' | 'amber' | 'red' }) {
  return (
    <span
      className={cn(
        'inline-block size-3 rounded-full ring-1',
        status === 'green' && 'bg-emerald-400 ring-emerald-400/30',
        status === 'amber' && 'bg-amber-400 ring-amber-400/30',
        status === 'red' && 'bg-red-500 ring-red-500/30',
      )}
    />
  );
}

function PctCell({ value, thresholds }: { value: number | null; thresholds: [number, number] }) {
  if (value === null) return <span className="text-slate-500 text-xs">N/A</span>;
  const color =
    value >= thresholds[0]
      ? 'text-emerald-400'
      : value >= thresholds[1]
        ? 'text-amber-400'
        : 'text-red-400';
  return <span className={cn('font-mono text-sm', color)}>{value.toFixed(1)}%</span>;
}

function DeadlineCell({ daysRemaining }: { daysRemaining: number | null }) {
  if (daysRemaining === null) return <span className="text-slate-500 text-xs">—</span>;
  const color =
    daysRemaining > 60
      ? 'text-emerald-400'
      : daysRemaining > 30
        ? 'text-amber-400'
        : 'text-red-400';
  return (
    <span className={cn('font-mono text-sm', color)}>
      {daysRemaining > 0 ? `${daysRemaining}d` : `${Math.abs(daysRemaining)}d over`}
    </span>
  );
}

function ProcurementBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-slate-500 text-xs">—</span>;
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        count > 3
          ? 'border-red-400/50 text-red-400'
          : 'border-amber-400/50 text-amber-400',
      )}
    >
      {count}
    </Badge>
  );
}

function ProjectDetailSlideOver({
  project,
  open,
  onClose,
}: {
  project: ProjectHealthRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!project) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="bg-slate-900 border-slate-700 text-white w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-white flex items-center gap-2">
            <RAGDot status={project.ragStatus} />
            {project.projectNumber} — {project.name}
          </SheetTitle>
          <p className="text-slate-400 text-sm">{project.clientName}</p>
        </SheetHeader>

        <div className="space-y-4">
          <MetricRow label="RAG Status">
            <span
              className={cn(
                'font-semibold capitalize',
                project.ragStatus === 'green' && 'text-emerald-400',
                project.ragStatus === 'amber' && 'text-amber-400',
                project.ragStatus === 'red' && 'text-red-400',
              )}
            >
              {project.ragStatus}
            </span>
          </MetricRow>
          <MetricRow label="Deadline">
            {project.deadline ? (
              <span className="text-slate-200">
                {new Date(project.deadline).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {' '}
                <DeadlineCell daysRemaining={project.daysRemaining} />
              </span>
            ) : (
              <span className="text-slate-500">Not set</span>
            )}
          </MetricRow>
          <MetricRow label="Engineering Progress">
            <PctCell value={project.engineeringPct} thresholds={[80, 60]} />
          </MetricRow>
          <MetricRow label="Production Progress">
            <PctCell value={project.productionPct} thresholds={[70, 50]} />
          </MetricRow>
          <MetricRow label="Procurement Overdue">
            <ProcurementBadge count={project.procurementOverdue} />
          </MetricRow>
          <MetricRow label="Collection Rate">
            <PctCell value={project.collectionPct} thresholds={[70, 50]} />
          </MetricRow>
          <MetricRow label="Open Risk Events">
            {project.riskCount > 0 ? (
              <span className="text-amber-400 font-semibold">{project.riskCount}</span>
            ) : (
              <span className="text-emerald-400">0</span>
            )}
          </MetricRow>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Link
            href={`/projects/${project.projectId}`}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="size-4" />
            Open full project
          </Link>
          <Link
            href={`/production?project=${project.projectId}`}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="size-4" />
            View production logs
          </Link>
          <Link
            href={`/supply-chain/lcr?project=${project.projectNumber}`}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="size-4" />
            View procurement
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetricRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800">
      <span className="text-slate-400 text-sm">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function ProjectHealthMatrix({ rows }: { rows: ProjectHealthRow[] }) {
  const [selected, setSelected] = useState<ProjectHealthRow | null>(null);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No active projects found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {['', 'Project', 'Client', 'Deadline', 'Eng %', 'Prod %', 'LCR Overdue', 'Collected', 'Risks', 'RAG'].map(h => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.projectId}
                onClick={() => setSelected(row)}
                className={cn(
                  'border-b border-slate-800/50 cursor-pointer transition-colors duration-100',
                  'hover:bg-slate-800/40',
                  i % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent',
                )}
              >
                <td className="px-3 py-3">
                  <RAGDot status={row.ragStatus} />
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-200 whitespace-nowrap">
                    {row.projectNumber}
                  </div>
                  <div className="text-slate-500 text-xs max-w-[140px] truncate">{row.name}</div>
                </td>
                <td className="px-3 py-3 text-slate-400 text-xs max-w-[100px] truncate whitespace-nowrap">
                  {row.clientName}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <DeadlineCell daysRemaining={row.daysRemaining} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <PctCell value={row.engineeringPct} thresholds={[80, 60]} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <PctCell value={row.productionPct} thresholds={[70, 50]} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <ProcurementBadge count={row.procurementOverdue} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <PctCell value={row.collectionPct} thresholds={[70, 50]} />
                </td>
                <td className="px-3 py-3 text-center whitespace-nowrap">
                  {row.riskCount > 0 ? (
                    <span className="text-amber-400 font-semibold">{row.riskCount}</span>
                  ) : (
                    <span className="text-slate-600">0</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase',
                      row.ragStatus === 'green' && 'text-emerald-400',
                      row.ragStatus === 'amber' && 'text-amber-400',
                      row.ragStatus === 'red' && 'text-red-400',
                    )}
                  >
                    {row.ragStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProjectDetailSlideOver
        project={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
