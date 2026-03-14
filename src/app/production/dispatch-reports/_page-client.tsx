'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Search, Filter, Calendar, Loader2, Package } from 'lucide-react';

type Project = {
  projectNumber: string;
  name: string;
};

type ReportType = 'sandblasting' | 'galvanization' | 'painting' | 'site' | 'customer' | 'all';

export default function DispatchReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Report filters
  const [reportType, setReportType] = useState<ReportType>('sandblasting');
  const [selectedProject, setSelectedProject] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeRemarks, setIncludeRemarks] = useState(true);
  const [groupByBuilding, setGroupByBuilding] = useState(true);

  const reportTypes = [
    { value: 'sandblasting', label: 'Dispatched to Sandblasting', color: 'bg-orange-100 text-orange-800' },
    { value: 'galvanization', label: 'Dispatched to Galvanization', color: 'bg-blue-100 text-blue-800' },
    { value: 'painting', label: 'Dispatched to Painting', color: 'bg-purple-100 text-purple-800' },
    { value: 'site', label: 'Dispatched to Site', color: 'bg-green-100 text-green-800' },
    { value: 'customer', label: 'Dispatched to Customer', color: 'bg-red-100 text-red-800' },
    { value: 'all', label: 'All Dispatch Types', color: 'bg-gray-100 text-gray-800' },
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      alert('Please select both start and end dates');
      return;
    }

    setGenerating(true);
    try {
      const params = new URLSearchParams({
        reportType,
        projectId: selectedProject,
        dateFrom,
        dateTo,
        includeRemarks: includeRemarks.toString(),
        groupByBuilding: groupByBuilding.toString(),
      });

      const url = `/api/production/reports/dispatch?${params.toString()}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Dispatch Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate comprehensive dispatch reports by type, project, and date range
          </p>
        </div>

        {/* Report Type Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Report Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {reportTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setReportType(type.value as ReportType)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${reportType === type.value ? 'bg-primary' : 'bg-gray-300'}`} />
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${type.color} mt-1 inline-block`}>
                        {type.value.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <select
                  id="project"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="all">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.projectNumber} value={project.projectNumber}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Group By Building</Label>
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    id="groupByBuilding"
                    checked={groupByBuilding}
                    onChange={(e) => setGroupByBuilding(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="groupByBuilding" className="cursor-pointer">
                    Group items by building
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date From *
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date To *
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Report Options</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeRemarks"
                    checked={includeRemarks}
                    onChange={(e) => setIncludeRemarks(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="includeRemarks" className="cursor-pointer">
                    Include remarks in report
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Report Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-1">Ready to Generate Report</h3>
                <p className="text-sm text-muted-foreground">
                  Report Type: <span className="font-medium">{reportTypes.find(t => t.value === reportType)?.label}</span>
                  {selectedProject !== 'all' && (
                    <> • Project: <span className="font-medium">{selectedProject}</span></>
                  )}
                  {dateFrom && dateTo && (
                    <> • Period: <span className="font-medium">{dateFrom} to {dateTo}</span></>
                  )}
                </p>
              </div>
              <Button
                onClick={generateReport}
                disabled={!dateFrom || !dateTo || generating}
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
