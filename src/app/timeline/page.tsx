'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type ProjectTimeline = {
  id: string;
  projectNumber: string;
  name: string;
  projectManager: { id: string; name: string };
  schedules: Array<{
    scopeLabel: string;
    startDate: string;
    endDate: string;
    building: {
      designation: string;
      name: string;
    };
  }>;
};

const PHASE_BAR_COLORS: Record<string, string> = {
  Design: 'bg-blue-500',
  'Detailing': 'bg-indigo-500',
  Procurement: 'bg-amber-500',
  Fabrication: 'bg-emerald-500',
  Coating: 'bg-orange-500',
  Delivery: 'bg-purple-500',
  Erection: 'bg-red-500',
};

type Department = {
  id: string;
  name: string;
};

export default function TimelinePage() {
  const [projects, setProjects] = useState<ProjectTimeline[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    fetchTimeline();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchTimeline = async () => {
    try {
      // Fetch projects and schedules in parallel
      const [projectsRes, schedulesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/scope-schedules/all')
      ]);

      if (projectsRes.ok && schedulesRes.ok) {
        const projectsData = await projectsRes.json();
        const schedulesData = await schedulesRes.json();
        
        // Group schedules by project
        const projectsWithSchedules = projectsData.map((project: any) => ({
          id: project.id,
          projectNumber: project.projectNumber,
          name: project.name,
          projectManager: project.projectManager || { id: '', name: 'Unassigned' },
          schedules: schedulesData.filter((s: any) => s.projectId === project.id),
        }));
        
        setProjects(projectsWithSchedules.filter(p => p.schedules.length > 0));
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getProjectTimelineData = (schedules: ProjectTimeline['schedules']) => {
    if (schedules.length === 0) return null;

    const allDates = schedules.flatMap(s => [
      new Date(s.startDate),
      new Date(s.endDate),
    ]);
    const projectStart = new Date(Math.min(...allDates.map(d => d.getTime())));
    const projectEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

    return {
      projectStart,
      projectEnd,
      totalDays,
    };
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
        <div className="container mx-auto p-6 lg:p-8 max-w-[1800px] max-lg:pt-20">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    );
  }

  const getFilteredSchedules = (schedules: ProjectTimeline['schedules']) => {
    if (departmentFilter === 'all') return schedules;
    
    return schedules.filter(schedule => {
      const scope = schedule.scopeLabel;
      // Map scopes to departments
      if (departmentFilter === 'Design') return scope === 'Design' || scope === 'Detailing';
      if (departmentFilter === 'Procurement') return false; // No procurement scope yet
      if (departmentFilter === 'Production') return scope === 'Fabrication' || scope === 'Galvanization' || scope === 'Painting';
      if (departmentFilter === 'Logistics') return scope === 'Delivery & Logistics';
      if (departmentFilter === 'Site') return scope === 'Erection';
      return false;
    });
  };

  const filteredProjects = projects
    .map(project => ({
      ...project,
      schedules: getFilteredSchedules(project.schedules)
    }))
    .filter(project => project.schedules.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Project Timeline Overview
        </h1>
        <p className="text-muted-foreground mt-1">
          View and compare timelines across all projects and departments
        </p>
      </div>

      {/* Department Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background"
            >
              <option value="all">All Departments</option>
              <option value="Design">Design</option>
              <option value="Procurement">Procurement</option>
              <option value="Production">Production</option>
              <option value="Logistics">Logistics</option>
              <option value="Site">Site/Erection</option>
            </select>
            <span className="text-sm text-muted-foreground">
              Showing {filteredProjects.length} of {projects.length} projects
            </span>
          </div>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                No project timelines available
              </p>
              <Link href="/planning">
                <Button>Go to Project Planning</Button>
              </Link>
            </CardContent>
          </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
              const timeline = getProjectTimelineData(project.schedules);
              if (!timeline) return null;

              const isExpanded = expandedProjects.has(project.id);

              return (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">
                            {project.projectNumber} - {project.name}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleProject(project.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Manager: {project.projectManager.name} | Duration: {timeline.totalDays} days | 
                          {timeline.projectStart.toLocaleDateString()} - {timeline.projectEnd.toLocaleDateString()}
                        </p>
                      </div>
                      <Link href="/planning">
                        <Button variant="outline" size="sm">
                          Manage Schedules
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent>
                      <div className="space-y-3">
                        {project.schedules.map((schedule, idx) => {
                          const start = new Date(schedule.startDate);
                          const end = new Date(schedule.endDate);
                          const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                          const daysSinceStart = Math.ceil(
                            (start.getTime() - timeline.projectStart.getTime()) / (1000 * 60 * 60 * 24)
                          );
                          const leftPercent = (daysSinceStart / timeline.totalDays) * 100;
                          const widthPercent = (duration / timeline.totalDays) * 100;

                          return (
                            <div key={idx} className="relative">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-sm font-medium w-40 truncate">
                                  {schedule.building.designation} - {schedule.scopeLabel}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {start.toLocaleDateString()} - {end.toLocaleDateString()} ({duration} days)
                                </span>
                              </div>
                              <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                                <div
                                  className={`absolute h-full ${
                                    PHASE_BAR_COLORS[schedule.scopeLabel] || 'bg-blue-500'
                                  } rounded transition-all flex items-center justify-center text-white text-xs font-medium`}
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                  }}
                                >
                                  {widthPercent > 10 && `${duration}d`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
          })}
        </div>
      )}
    </div>
  );
}
