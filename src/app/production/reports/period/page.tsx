'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, Loader2, BarChart3 } from 'lucide-react';

type PeriodReportRow = {
  projectNumber: string;
  projectName: string;
  buildingDesignation: string | null;
  buildingName: string | null;
  periodTonnage: number;
  'Laser Cutting': number;
  'Fit-up': number;
  'Welding': number;
  'Visualization': number;
};

type PeriodReportData = {
  data: PeriodReportRow[];
  totals: {
    periodTonnage: number;
    'Laser Cutting': number;
    'Fit-up': number;
    'Welding': number;
    'Visualization': number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
};

export default function ProductionPeriodReportPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<PeriodReportData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('all');

  useEffect(() => {
    fetchProjects();
    
    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
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
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (selectedProject !== 'all') {
        params.append('projectId', selectedProject);
      }

      const response = await fetch(`/api/production/reports/period?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        alert('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData || reportData.data.length === 0) return;

    const headers = [
      'Project #',
      'Building Name',
      'Laser Cutting',
      'Fit-up',
      'Welding',
      'Visualization',
      'Period Tonnage',
    ];

    const rows = reportData.data.map((row) => [
      row.projectNumber,
      row.buildingName || 'N/A',
      row['Laser Cutting'].toFixed(2),
      row['Fit-up'].toFixed(2),
      row['Welding'].toFixed(2),
      row['Visualization'].toFixed(2),
      row.periodTonnage.toFixed(2),
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      reportData.totals['Laser Cutting'].toFixed(2),
      reportData.totals['Fit-up'].toFixed(2),
      reportData.totals['Welding'].toFixed(2),
      reportData.totals['Visualization'].toFixed(2),
      reportData.totals.periodTonnage.toFixed(2),
    ]);

    const csvContent = [
      `Production by Period Report`,
      `From: ${startDate} To: ${endDate}`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-period-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Production by Period Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Production summary by project and process for a specific time period
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">To Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <select
                id="project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectNumber} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 flex items-end gap-2">
              <Button onClick={generateReport} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
              {reportData && reportData.data.length > 0 && (
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Header */}
      {reportData && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Production by Period Report</h2>
              <p className="text-sm text-muted-foreground">
                From Date: <span className="font-semibold">{new Date(startDate).toLocaleDateString()}</span>
                {' '} To Date: <span className="font-semibold">{new Date(endDate).toLocaleDateString()}</span>
              </p>
              <p className="text-lg font-bold mt-2">
                Period Tonnage: <span className="text-blue-600">{reportData.totals.periodTonnage.toFixed(2)}</span> tons
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Table */}
      {reportData && reportData.data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold border-r">Project #</th>
                    <th className="px-4 py-3 text-left font-semibold border-r">Building Name</th>
                    <th className="px-4 py-3 text-center font-semibold bg-gray-100 border-r">
                      Laser Cutting
                    </th>
                    <th className="px-4 py-3 text-center font-semibold bg-yellow-100 border-r">
                      Fit-up
                    </th>
                    <th className="px-4 py-3 text-center font-semibold bg-red-100 border-r">
                      Welding
                    </th>
                    <th className="px-4 py-3 text-center font-semibold bg-green-100 border-r">
                      Visualization
                    </th>
                    <th className="px-4 py-3 text-center font-semibold bg-blue-100">
                      Period Tonnage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.map((row, index) => (
                    <tr key={`${row.projectNumber}-${row.buildingDesignation}`} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                      <td className="px-4 py-3 font-medium border-r">{row.projectNumber}</td>
                      <td className="px-4 py-3 border-r">
                        {row.buildingName || 'N/A'}
                        {row.buildingDesignation && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({row.buildingDesignation})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center border-r bg-gray-50">
                        {row['Laser Cutting'].toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center border-r bg-yellow-50">
                        {row['Fit-up'].toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center border-r bg-red-50">
                        {row['Welding'].toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center border-r bg-green-50">
                        {row['Visualization'].toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold bg-blue-50">
                        {row.periodTonnage.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
                    <td className="px-4 py-3 border-r" colSpan={2}>TOTAL</td>
                    <td className="px-4 py-3 text-center border-r">
                      {reportData.totals['Laser Cutting'].toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center border-r">
                      {reportData.totals['Fit-up'].toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center border-r">
                      {reportData.totals['Welding'].toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center border-r">
                      {reportData.totals['Visualization'].toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-blue-700">
                      {reportData.totals.periodTonnage.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !reportData && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Select date range and click "Generate Report" to view production data
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && reportData && reportData.data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              No production data found for the selected period
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
