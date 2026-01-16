'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  FileCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import Link from 'next/link';

type Project = {
  id: string;
  projectNumber: string;
  name: string;
};

type Building = {
  id: string;
  designation: string;
  name: string;
};

type DashboardData = {
  rfi: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byType: Array<{ inspectionType: string; _count: number }>;
    recent: any[];
  };
  ncr: {
    total: number;
    open: number;
    inProgress: number;
    closed: number;
    overdue: number;
    bySeverity: Array<{ severity: string; _count: number }>;
    recent: any[];
  };
  metrics: {
    approvalRate: number;
    rejectionRate: number;
    ncrClosureRate: number;
  };
};

export default function QCDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedProject && selectedProject !== 'all') {
      fetchBuildings(selectedProject);
    } else {
      setBuildings([]);
      if (selectedProject === 'all') {
        setSelectedBuilding('all');
      }
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && selectedBuilding) {
      fetchDashboardData();
    }
  }, [selectedProject, selectedBuilding]);

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

  const fetchBuildings = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/buildings`);
      if (response.ok) {
        const data = await response.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedProject) params.append('projectId', selectedProject);
      if (selectedBuilding) params.append('buildingId', selectedBuilding);

      const response = await fetch(`/api/qc/dashboard?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Waiting for Inspection':
        return 'text-yellow-600 bg-yellow-50';
      case 'QC Checked':
        return 'text-green-600 bg-green-50';
      case 'Rejected':
        return 'text-red-600 bg-red-50';
      case 'Open':
      case 'In Progress':
        return 'text-orange-600 bg-orange-50';
      case 'Closed':
        return 'text-green-600 bg-green-50';
      case 'Overdue':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'text-red-700 bg-red-100';
      case 'High':
        return 'text-orange-700 bg-orange-100';
      case 'Medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'Low':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Quality Control Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor RFIs, NCRs, and quality metrics
          </p>
        </div>
      </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
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
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <select
                  id="building"
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  disabled={!selectedProject || selectedProject === 'all'}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="all">All Buildings</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.designation} - {building.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading dashboard data...</p>
              </div>
            </CardContent>
          </Card>
        ) : dashboardData ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Pending RFIs */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending RFIs</p>
                      <p className="text-3xl font-bold">{dashboardData.rfi.pending}</p>
                    </div>
                    <Clock className="h-10 w-10 text-yellow-500" />
                  </div>
                  <Link href="/qc/rfi?status=Waiting for Inspection">
                    <Button variant="link" className="px-0 mt-2">View All →</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Approved RFIs */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-3xl font-bold text-green-600">{dashboardData.rfi.approved}</p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {dashboardData.metrics.approvalRate}% approval rate
                  </p>
                </CardContent>
              </Card>

              {/* Rejected Items */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-3xl font-bold text-red-600">{dashboardData.rfi.rejected}</p>
                    </div>
                    <XCircle className="h-10 w-10 text-red-500" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {dashboardData.metrics.rejectionRate}% rejection rate
                  </p>
                </CardContent>
              </Card>

              {/* Open NCRs */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Open NCRs</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {dashboardData.ncr.open + dashboardData.ncr.inProgress}
                      </p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-orange-500" />
                  </div>
                  <Link href="/qc/ncr?status=Open">
                    <Button variant="link" className="px-0 mt-2">View All →</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* NCR Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Open NCRs</p>
                    <span className="text-2xl font-bold">{dashboardData.ncr.open}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Awaiting action</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Overdue NCRs</p>
                    <span className="text-2xl font-bold text-red-600">{dashboardData.ncr.overdue}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Past deadline</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Closed NCRs</p>
                    <span className="text-2xl font-bold text-green-600">{dashboardData.ncr.closed}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.metrics.ncrClosureRate}% closure rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent RFIs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Recent RFIs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.rfi.recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No RFIs found</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboardData.rfi.recent.slice(0, 5).map((rfi: any) => {
                        const firstLog = rfi.productionLogs?.[0]?.productionLog;
                        return (
                        <div key={rfi.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {firstLog?.assemblyPart?.partDesignation || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {rfi.inspectionType} • {rfi.project.projectNumber}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(rfi.status)}`}>
                            {rfi.status}
                          </span>
                        </div>
                      )})}
                    </div>
                  )}
                  <Link href="/qc/rfi">
                    <Button variant="outline" className="w-full mt-4">View All RFIs</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent NCRs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Recent NCRs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.ncr.recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No NCRs found</p>
                  ) : (
                    <div className="space-y-3">
                      {dashboardData.ncr.recent.slice(0, 5).map((ncr: any) => {
                        const firstLog = ncr.rfiRequest?.productionLogs?.[0]?.productionLog;
                        return (
                        <div key={ncr.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{ncr.ncrNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {firstLog?.assemblyPart?.partDesignation || 'N/A'} • {ncr.project.projectNumber}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(ncr.severity)}`}>
                              {ncr.severity}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ncr.status)}`}>
                              {ncr.status}
                            </span>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}
                  <Link href="/qc/ncr">
                    <Button variant="outline" className="w-full mt-4">View All NCRs</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No data available</p>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
