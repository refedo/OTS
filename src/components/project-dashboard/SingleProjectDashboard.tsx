'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProjectDashboardData } from '@/lib/types/project-dashboard';
import { ProjectHeader } from './ProjectHeader';
import { WPSStatusWidget } from './WPSStatusWidget';
import { ITPStatusWidget } from './ITPStatusWidget';
import { ProductionProgressWidget } from './ProductionProgressWidget';
import { QCProgressWidget } from './QCProgressWidget';
import { BuildingsStatusWidget } from './BuildingsStatusWidget';
import { DocumentationStatusWidget } from './DocumentationStatusWidget';
import { TasksOverviewWidget } from './TasksOverviewWidget';
import { WorkOrdersWidget } from './WorkOrdersWidget';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';

interface Project {
  id: string;
  projectNumber: string;
  name: string;
}

export function SingleProjectDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboardData, setDashboardData] = useState<ProjectDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Fetch available projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch dashboard data when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchDashboardData(projectId);
    }
  }, [projectId]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchDashboardData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Helper function to fetch and handle errors
      const fetchEndpoint = async (endpoint: string) => {
        // Use the existing [id] route structure
        const url = `/api/projects/${id}/${endpoint}`;
        console.log(`Fetching: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
        }
        return response.json();
      };

      // Fetch all dashboard data in parallel
      const [summary, wps, itp, production, qc, buildings, documentation, tasks, workOrders] = await Promise.all([
        fetchEndpoint('summary'),
        fetchEndpoint('wps'),
        fetchEndpoint('itp'),
        fetchEndpoint('production'),
        fetchEndpoint('qc'),
        fetchEndpoint('buildings'),
        fetchEndpoint('documents'),
        fetchEndpoint('tasks'),
        fetchEndpoint('work-orders'),
      ]);

      setDashboardData({
        summary,
        wps,
        itp,
        production,
        qc,
        buildings,
        documentation,
        tasks,
        workOrders,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (newProjectId: string) => {
    router.push(`/projects-dashboard?projectId=${newProjectId}`);
  };

  const handleRefresh = () => {
    if (projectId) {
      fetchDashboardData(projectId);
    }
  };

  // Show project selector if no project selected
  if (!projectId) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Select a Project</h2>
            <p className="text-muted-foreground">
              Choose a project to view its comprehensive dashboard
            </p>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select onValueChange={handleProjectChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.projectNumber} — {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state
  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="size-12 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !dashboardData) {
    return (
      <Card className="max-w-2xl mx-auto mt-8 border-red-200 dark:border-red-900">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="size-12 text-red-600 mx-auto" />
            <h2 className="text-xl font-bold text-red-600">Error Loading Dashboard</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show dashboard
  if (!dashboardData) return null;

  return (
    <div className="space-y-6">
      {/* Project Selector (sticky) */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 border-b">
        <div className="flex items-center justify-between">
          <Select value={projectId} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-[400px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.projectNumber} — {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : null}
            Refresh All
          </Button>
        </div>
      </div>

      {/* Project Header */}
      <ProjectHeader summary={dashboardData.summary} />

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WPS Status */}
        <WPSStatusWidget 
          data={dashboardData.wps} 
          onRefresh={() => fetchDashboardData(projectId)}
        />

        {/* ITP Status */}
        <ITPStatusWidget 
          data={dashboardData.itp} 
          onRefresh={() => fetchDashboardData(projectId)}
        />

        {/* Production Progress */}
        <ProductionProgressWidget 
          data={dashboardData.production} 
          projectId={projectId}
          onRefresh={() => fetchDashboardData(projectId)}
        />

        {/* QC Progress */}
        <QCProgressWidget 
          data={dashboardData.qc} 
          projectId={projectId}
          onRefresh={() => fetchDashboardData(projectId)}
        />
      </div>

      {/* Buildings Status (Full Width) */}
      <BuildingsStatusWidget 
        data={dashboardData.buildings} 
        onRefresh={() => fetchDashboardData(projectId)}
      />

      {/* Work Orders (Full Width) */}
      <WorkOrdersWidget 
        data={dashboardData.workOrders} 
        projectId={projectId}
        onRefresh={() => fetchDashboardData(projectId)}
      />

      {/* Documentation & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentation Status */}
        <DocumentationStatusWidget 
          data={dashboardData.documentation} 
          projectId={projectId}
          onRefresh={() => fetchDashboardData(projectId)}
        />

        {/* Tasks Overview */}
        <TasksOverviewWidget 
          data={dashboardData.tasks} 
          projectId={projectId}
          canCreateTask={true}
          onRefresh={() => fetchDashboardData(projectId)}
        />
      </div>
    </div>
  );
}
