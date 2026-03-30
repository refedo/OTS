'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, ChevronLeft } from 'lucide-react';

interface StatusBreakdownRow {
  status: string;
  totalWeight: number;
  percentage: number;
}

interface Project {
  id: string;
  projectNumber: string;
  name: string;
}

interface Building {
  id: string;
  designation: string;
  name: string;
  projectId: string;
}

const formatTon = (val: number | null) => {
  if (val === null || val === undefined || val === 0) return '—';
  const tons = val / 1000;
  return `${tons.toLocaleString('en-US', { maximumFractionDigits: 1 })} T`;
};

const STATUS_CHART_COLORS: Record<string, string> = {
  'Bought': '#22c55e',
  'Under Request': '#f97316',
  'Available at factory': '#3b82f6',
  'Available at Factory': '#3b82f6',
  'Requested': '#eab308',
  'Ordered': '#6366f1',
  'Received': '#10b981',
  'Cancelled': '#9ca3af',
  'Canceled': '#9ca3af',
  'Suspended': '#ef4444',
  'Closed': '#64748b',
  'Converted to Built-Up': '#a855f7',
  'Merged to other thickness': '#8b5cf6',
  'Not available in the market': '#dc2626',
  'Only Price Request': '#ca8a04',
  'Replaced': '#06b6d4',
  'Unknown': '#6b7280',
};

const getStatusColor = (status: string): string =>
  STATUS_CHART_COLORS[status] ??
  `hsl(${Math.abs(status.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 70%, 50%)`;

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
}

export default function LcrReportsPage() {
  const [statusBreakdownData, setStatusBreakdownData] = useState<{
    data: StatusBreakdownRow[];
    total: number;
  }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');

  // Fetch projects and buildings once
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : (d.projects ?? [])))
      .catch(() => {});
    fetch('/api/buildings')
      .then((r) => r.json())
      .then((d) => setBuildings(Array.isArray(d) ? d : (d.buildings ?? [])))
      .catch(() => {});
  }, []);

  // Reset building filter when project changes
  useEffect(() => {
    setBuildingFilter('all');
  }, [projectFilter]);

  // Fetch status breakdown whenever filters change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (buildingFilter !== 'all') {
      params.set('buildingId', buildingFilter);
    } else if (projectFilter !== 'all') {
      params.set('projectId', projectFilter);
    }
    fetch(`/api/supply-chain/lcr/reports/status-breakdown?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setStatusBreakdownData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectFilter, buildingFilter]);

  const filteredBuildings = useMemo(
    () =>
      projectFilter === 'all'
        ? buildings
        : buildings.filter((b) => b.projectId === projectFilter),
    [buildings, projectFilter]
  );

  const selectedProject = projects.find((p) => p.id === projectFilter);
  const selectedBuilding = buildings.find((b) => b.id === buildingFilter);

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="size-6" />
            LCR Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Procurement analytics and insights</p>
        </div>
        <Link href="/supply-chain/lcr">
          <Button variant="outline" size="sm">
            <ChevronLeft className="size-4 mr-1" /> Back to LCR
          </Button>
        </Link>
      </div>

      {/* Status Breakdown by Tonnage */}
      {loading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" /> Status Breakdown by Tonnage
            </CardTitle>
            <CardDescription>Total weight distribution across procurement statuses</CardDescription>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Project</p>
                <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v)}>
                  <SelectTrigger className="h-8 text-xs w-52">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.projectNumber} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Building</p>
                <Select
                  value={buildingFilter}
                  onValueChange={(v) => setBuildingFilter(v)}
                  disabled={projectFilter === 'all' || filteredBuildings.length === 0}
                >
                  <SelectTrigger className="h-8 text-xs w-52">
                    <SelectValue
                      placeholder={
                        projectFilter === 'all'
                          ? 'Select a project first'
                          : filteredBuildings.length === 0
                            ? 'No buildings'
                            : 'All Buildings'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {filteredBuildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.designation} — {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(projectFilter !== 'all' || buildingFilter !== 'all') && (
                <div className="flex items-end gap-1.5 flex-wrap">
                  {selectedProject && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedProject.projectNumber}
                    </Badge>
                  )}
                  {selectedBuilding && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedBuilding.designation}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                    onClick={() => {
                      setProjectFilter('all');
                      setBuildingFilter('all');
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {statusBreakdownData.data.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <div className="text-xs text-muted-foreground mb-1">Total Weight</div>
                    <div className="text-xl font-bold">{formatTon(statusBreakdownData.total)}</div>
                  </div>
                  {statusBreakdownData.data.slice(0, 3).map((row, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 border">
                      <div className="text-xs text-muted-foreground mb-1">{row.status}</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-xl font-bold">{row.percentage}%</div>
                        <div className="text-xs text-muted-foreground">{formatTon(row.totalWeight)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                        <th className="text-right px-3 py-2 font-medium">Weight (Tons)</th>
                        <th className="text-right px-3 py-2 font-medium">Percentage</th>
                        <th className="px-3 py-2 font-medium">Distribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusBreakdownData.data.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-3 py-2 font-medium">
                            <Badge
                              variant="outline"
                              style={{
                                backgroundColor: `${getStatusColor(row.status)}15`,
                                borderColor: getStatusColor(row.status),
                                color: getStatusColor(row.status),
                              }}
                            >
                              {row.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{formatTon(row.totalWeight)}</td>
                          <td className="px-3 py-2 text-right font-bold">{row.percentage}%</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${row.percentage}%`,
                                    backgroundColor: getStatusColor(row.status),
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
