'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AlertCircle, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';
import { ProjectTimelineVisual } from './ProjectTimelineVisual';

interface DashboardData {
  stageStats: any[];
  projectStats: any[];
  stageDurations: any[];
  delayedProjects: any[];
  summary: {
    totalProjects: number;
    totalEvents: number;
    completedEvents: number;
    delayedEvents: number;
    pendingEvents: number;
  };
}

export function OperationsDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/operations/dashboard');
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  const statusData = [
    { name: 'Completed', value: data.summary.completedEvents, color: '#10b981' },
    { name: 'Pending', value: data.summary.pendingEvents, color: '#f59e0b' },
    { name: 'Delayed', value: data.summary.delayedEvents, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Operations Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of operational milestones across all active projects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalProjects}</div>
            <p className="text-xs text-muted-foreground">Active projects being tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Events</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.completedEvents}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalEvents > 0
                ? `${Math.round((data.summary.completedEvents / data.summary.totalEvents) * 100)}% of total`
                : 'No events yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Events</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.pendingEvents}</div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed Events</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.delayedEvents}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Stage Completion Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Completion Rates</CardTitle>
            <CardDescription>Percentage of projects that reached each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.stageStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="stageName"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completionRate" fill="#3b82f6" name="Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Event Status Distribution</CardTitle>
            <CardDescription>Breakdown of all operational events</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Average Stage Durations */}
      {data.stageDurations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average Duration Between Stages</CardTitle>
            <CardDescription>Time taken to progress from one stage to the next</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.stageDurations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="from"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  tick={{ fontSize: 10 }}
                />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgDurationDays" fill="#8b5cf6" name="Avg Duration (days)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Project Timelines */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>Track all operational milestones from design to erection completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.projectStats.map((project) => (
              <ProjectTimelineVisual
                key={project.projectId}
                projectId={project.projectId}
                projectNumber={project.projectNumber}
                projectName={project.projectName}
                stages={project.stages || []}
                progress={project.progress}
                completedCount={project.completedCount || 0}
                pendingCount={project.pendingCount || 0}
                notStartedCount={project.notStartedCount || 0}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delayed Projects Alert */}
      {data.delayedProjects.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Projects with Delayed Stages
            </CardTitle>
            <CardDescription>These projects have one or more delayed milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.delayedProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/timeline`}
                  className="block p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.projectNumber}</p>
                      <p className="text-sm text-gray-600">{project.name}</p>
                    </div>
                    <Badge variant="destructive">Delayed</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
