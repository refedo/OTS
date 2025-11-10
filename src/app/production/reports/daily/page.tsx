'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, Loader2, FileText } from 'lucide-react';

type DailyReportRow = {
  date: string;
  dailyAverage: number;
  'Cutting': number;
  'Cut Pieces': number;
  'Fit-up Weight': number;
  'Fit-up Qty': number;
  'Welding Weight': number;
  'Welding Qty': number;
  'Visualization Weight': number;
  'Visualization Qty': number;
  'Dispatch to Sandblasting': number;
  'Dispatch to Galvanization': number;
  'Galvanization': number;
  'Dispatch to Painting': number;
  'Painting': number;
  'Dispatch to Customs': number;
  'Dispatch to Site': number;
};

export default function ProductionDailyReportPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<DailyReportRow[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('all');

  useEffect(() => {
    fetchProjects();
    
    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
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

      const response = await fetch(`/api/production/reports/daily?${params}`);
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
    if (reportData.length === 0) return;

    const headers = [
      'Process Date',
      'Production Daily Average',
      'Cutting Weight',
      'Cut Pieces',
      'Fit-up Weight',
      'Fit-up Qty',
      'Welding Weight',
      'Welding Qty',
      'Visualization Weight',
      'Visualization Qty',
      'Dispatch to Sandblasting',
      'Dispatch to Galvanization',
      'Galvanization',
      'Dispatch to Painting',
      'Painting',
      'Dispatch to Customs',
      'Dispatch to Site',
    ];

    const rows = reportData.map((row) => [
      new Date(row.date).toLocaleDateString(),
      row.dailyAverage.toFixed(1),
      row['Cutting'].toFixed(1),
      row['Cut Pieces'].toFixed(0),
      row['Fit-up Weight'].toFixed(1),
      row['Fit-up Qty'].toFixed(0),
      row['Welding Weight'].toFixed(1),
      row['Welding Qty'].toFixed(0),
      row['Visualization Weight'].toFixed(1),
      row['Visualization Qty'].toFixed(0),
      row['Dispatch to Sandblasting'].toFixed(1),
      row['Dispatch to Galvanization'].toFixed(1),
      row['Galvanization'].toFixed(1),
      row['Dispatch to Painting'].toFixed(1),
      row['Painting'].toFixed(1),
      row['Dispatch to Customs'].toFixed(1),
      row['Dispatch to Site'].toFixed(1),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-daily-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    return `${day}-${dateStr}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Production Daily Report (PDR)
          </h1>
          <p className="text-muted-foreground mt-1">
            Daily production progress by process
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
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
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
              {reportData.length > 0 && (
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      {reportData.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold border-r">Process Date</th>
                    <th className="px-3 py-2 text-center font-semibold bg-blue-100 border-r">
                      Production Daily Average
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-gray-100 border-r">
                      Cutting Weight
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-gray-100 border-r">
                      Cut Pieces
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-yellow-100 border-r">
                      Fit-up Weight
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-yellow-100 border-r">
                      Fit-up Qty
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-red-100 border-r">
                      Welding Weight
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-red-100 border-r">
                      Welding Qty
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-green-100 border-r">
                      Visualization Weight
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-green-100 border-r">
                      Visualization Qty
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-purple-100 border-r">
                      Dispatch to Sandblasting
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-purple-100 border-r">
                      Dispatch to Galvanization
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-purple-100 border-r">
                      Galvanization
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-purple-100 border-r">
                      Dispatch to Painting
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-purple-100 border-r">
                      Painting
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-orange-100 border-r">
                      Dispatch to Customs
                    </th>
                    <th className="px-3 py-2 text-center font-semibold bg-orange-100">
                      Dispatch to Site
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={row.date} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                      <td className="px-3 py-2 font-medium border-r">{formatDate(row.date)}</td>
                      <td className="px-3 py-2 text-center font-semibold border-r">
                        {row.dailyAverage.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center border-r">{row['Cutting'].toFixed(1)}</td>
                      <td className="px-3 py-2 text-center border-r">{row['Cut Pieces'].toFixed(0)}</td>
                      <td className="px-3 py-2 text-center border-r">{row['Fit-up Weight'].toFixed(1)}</td>
                      <td className="px-3 py-2 text-center border-r">{row['Fit-up Qty'].toFixed(0)}</td>
                      <td className="px-3 py-2 text-center border-r">{row['Welding Weight'].toFixed(1)}</td>
                      <td className="px-3 py-2 text-center border-r">{row['Welding Qty'].toFixed(0)}</td>
                      <td className="px-3 py-2 text-center border-r">
                        {row['Visualization Weight'].toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center border-r">{row['Visualization Qty'].toFixed(0)}</td>
                      <td className="px-3 py-2 text-center border-r">
                        {row['Dispatch to Sandblasting'].toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center border-r">
                        {row['Dispatch to Galvanization'].toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center border-r">{row['Galvanization'].toFixed(1)}</td>
                      <td className="px-3 py-2 text-center border-r">
                        {row['Dispatch to Painting'].toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center border-r">{row['Painting'].toFixed(1)}</td>
                      <td className="px-3 py-2 text-center border-r">
                        {row['Dispatch to Customs'].toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center">{row['Dispatch to Site'].toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && reportData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Select date range and click "Generate Report" to view production data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
