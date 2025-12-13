'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Download, Loader2, TrendingUp } from 'lucide-react';

type ProductionPlanRow = {
  projectNumber: string;
  projectName: string;
  buildingDesignation: string;
  buildingName: string;
  buildingWeight: number;
  produced: number;
  plannedProgress: number;
  declaredProgress: number;
  quota: number;
  quotaWithBackLog: number;
  startDate: string;
  endDate: string;
};

type ProductionPlanData = {
  month: string;
  monthlyTarget: number;
  monthlyTargetWithBL: number;
  data: ProductionPlanRow[];
};

export default function ProductionPlanReportPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ProductionPlanData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('all');

  useEffect(() => {
    fetchProjects();
    
    // Set default month to current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedMonth) {
      alert('Please select a month');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
      });

      if (selectedProject !== 'all') {
        params.append('projectId', selectedProject);
      }

      const response = await fetch(`/api/production/reports/production-plan?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    // Create CSV content
    const headers = [
      'Pos.',
      'Project',
      'Building',
      'Building Weight',
      'Produced',
      'Planned Progress',
      'Declared Progress',
      'Quota',
      'Quota w/ Back Log',
      'Start Date',
      'End Date',
    ];

    const rows = reportData.data.map((row, index) => [
      index + 1,
      `${row.projectNumber}`,
      `${row.buildingDesignation} - ${row.buildingName}`,
      row.buildingWeight.toFixed(2),
      row.produced.toFixed(2),
      `${row.plannedProgress.toFixed(1)}%`,
      `${row.declaredProgress.toFixed(1)}%`,
      row.quota.toFixed(2),
      row.quotaWithBackLog.toFixed(2),
      new Date(row.startDate).toLocaleDateString(),
      new Date(row.endDate).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `production-plan-${reportData.month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getProgressColor = (planned: number, declared: number) => {
    const diff = declared - planned;
    if (diff >= 0) return 'text-green-600';
    if (diff >= -10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Monthly Production Plan
          </h1>
          <p className="text-muted-foreground mt-1">
            View production plan with daily tonnage distribution
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background mt-1"
              />
            </div>

            <div>
              <Label htmlFor="project">Project (Optional)</Label>
              <select
                id="project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background mt-1"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generateReport} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Date(reportData.month + '-01').toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Reporting Period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Monthly Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {reportData.monthlyTarget.toFixed(1)} <span className="text-lg">tons</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Planned for this month</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Monthly Target w/ BL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {reportData.monthlyTargetWithBL.toFixed(1)} <span className="text-lg">tons</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Including back log</p>
              </CardContent>
            </Card>
          </div>

          {/* Report Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Production Plan Details</CardTitle>
                <Button onClick={exportToExcel} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reportData.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No production data found for the selected period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Pos.</th>
                        <th className="px-3 py-2 text-left font-semibold">Project</th>
                        <th className="px-3 py-2 text-left font-semibold">Building</th>
                        <th className="px-3 py-2 text-center font-semibold">Building Weight</th>
                        <th className="px-3 py-2 text-center font-semibold">Produced</th>
                        <th className="px-3 py-2 text-center font-semibold">Planned Progress</th>
                        <th className="px-3 py-2 text-center font-semibold">Declared Progress</th>
                        <th className="px-3 py-2 text-center font-semibold">Quota</th>
                        <th className="px-3 py-2 text-center font-semibold">Quota w/ Back Log</th>
                        <th className="px-3 py-2 text-center font-semibold">Start Date</th>
                        <th className="px-3 py-2 text-center font-semibold">End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((row, index) => (
                        <tr 
                          key={`${row.projectNumber}-${row.buildingDesignation}`}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}
                        >
                          <td className="px-3 py-2 text-center">{index + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{row.projectNumber}</div>
                            <div className="text-xs text-muted-foreground">{row.projectName}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{row.buildingDesignation}</div>
                            <div className="text-xs text-muted-foreground">{row.buildingName}</div>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {row.buildingWeight.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-blue-600">
                            {row.produced.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="font-semibold">
                              {row.plannedProgress.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-semibold ${getProgressColor(row.plannedProgress, row.declaredProgress)}`}>
                              {row.declaredProgress.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {row.quota.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-orange-600">
                            {row.quotaWithBackLog.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {formatDate(row.startDate)}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {formatDate(row.endDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted font-bold">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right">TOTAL</td>
                        <td className="px-3 py-2 text-center">
                          {reportData.data.reduce((sum, row) => sum + row.buildingWeight, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-blue-600">
                          {reportData.data.reduce((sum, row) => sum + row.produced, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">-</td>
                        <td className="px-3 py-2 text-center">-</td>
                        <td className="px-3 py-2 text-center">
                          {reportData.monthlyTarget.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-orange-600">
                          {reportData.monthlyTargetWithBL.toFixed(2)}
                        </td>
                        <td colSpan={2} className="px-3 py-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
