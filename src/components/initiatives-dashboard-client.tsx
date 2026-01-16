'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
  Users,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

interface DashboardData {
  summary: {
    totalInitiatives: number;
    averageCompletion: number;
    totalBudget: number;
    totalMilestones: number;
    completedMilestones: number;
    delayedMilestones: number;
    totalTasks: number;
    completedTasks: number;
  };
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byDepartment: Record<string, number>;
  budgetByStatus: Record<string, number>;
  topInitiatives: Array<{
    id: string;
    initiativeNumber: string;
    name: string;
    progress: number;
    status: string;
    owner: { id: string; name: string };
  }>;
  delayedInitiatives: Array<{
    id: string;
    initiativeNumber: string;
    name: string;
    endDate: string;
    status: string;
    owner: { id: string; name: string };
    daysOverdue: number;
  }>;
}

interface InitiativesDashboardClientProps {
  data: DashboardData;
  session: {
    sub: string;
    name: string;
    role: string;
    departmentId?: string | null;
  };
}

export default function InitiativesDashboardClient({ data, session }: InitiativesDashboardClientProps) {
  const { summary, byStatus, byCategory, byPriority, byDepartment, budgetByStatus, topInitiatives, delayedInitiatives } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/initiatives">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Initiatives
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Initiatives Analytics Dashboard</h1>
            <p className="text-sm text-gray-600">Overview of all initiatives and their performance</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Initiatives</p>
                <p className="text-3xl font-bold mt-1">{summary.totalInitiatives}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Completion</p>
                <p className="text-3xl font-bold mt-1">{summary.averageCompletion.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(summary.totalBudget)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delayed</p>
                <p className="text-3xl font-bold mt-1">{delayedInitiatives.length}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones & Tasks Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Milestones Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Milestones</span>
                <span className="font-semibold">{summary.totalMilestones}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{summary.completedMilestones}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Delayed</span>
                <span className="font-semibold text-red-600">{summary.delayedMilestones}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>
                    {summary.totalMilestones > 0
                      ? ((summary.completedMilestones / summary.totalMilestones) * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${summary.totalMilestones > 0
                        ? (summary.completedMilestones / summary.totalMilestones) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tasks Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Tasks</span>
                <span className="font-semibold">{summary.totalTasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{summary.completedTasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="font-semibold text-yellow-600">
                  {summary.totalTasks - summary.completedTasks}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>
                    {summary.totalTasks > 0
                      ? ((summary.completedTasks / summary.totalTasks) * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${summary.totalTasks > 0
                        ? (summary.completedTasks / summary.totalTasks) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / summary.totalInitiatives) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(byPriority).map(([priority, count]) => (
                <div key={priority}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(priority)}`}>
                      {priority}
                    </span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / summary.totalInitiatives) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(byCategory).slice(0, 5).map(([category, count]) => (
                <div key={category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm truncate">{category}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / summary.totalInitiatives) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 5 Initiatives by Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topInitiatives.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No initiatives yet</p>
          ) : (
            <div className="space-y-4">
              {topInitiatives.map((initiative) => (
                <Link
                  key={initiative.id}
                  href={`/initiatives/${initiative.id}`}
                  className="block hover:bg-gray-50 p-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">{initiative.initiativeNumber}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(initiative.status)}`}>
                          {initiative.status}
                        </span>
                      </div>
                      <p className="font-medium">{initiative.name}</p>
                      <p className="text-xs text-gray-600 mt-1">Owner: {initiative.owner.name}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-2xl font-bold text-blue-600">{initiative.progress}%</p>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${initiative.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delayed Initiatives */}
      {delayedInitiatives.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delayed Initiatives ({delayedInitiatives.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {delayedInitiatives.map((initiative) => (
                <Link
                  key={initiative.id}
                  href={`/initiatives/${initiative.id}`}
                  className="block hover:bg-red-50 p-3 rounded-lg transition-colors border border-red-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">{initiative.initiativeNumber}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(initiative.status)}`}>
                          {initiative.status}
                        </span>
                      </div>
                      <p className="font-medium">{initiative.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <span>Owner: {initiative.owner.name}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {formatDate(initiative.endDate)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-2xl font-bold text-red-600">{initiative.daysOverdue}</p>
                      <p className="text-xs text-red-600">days overdue</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget by Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Distribution by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(budgetByStatus).map(([status, amount]) => (
              <div key={status}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(status)}`}>
                    {status}
                  </span>
                  <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(amount / summary.totalBudget) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Department */}
      {Object.keys(byDepartment).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              By Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(byDepartment).map(([department, count]) => (
                <div key={department}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">{department}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(count / summary.totalInitiatives) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
