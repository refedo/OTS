'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, CheckCircle2, AlertTriangle, Clock, TrendingUp, BarChart3, Target } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type MemberStat = {
  id: string;
  name: string;
  position: string | null;
  department: string;
  totalAssigned: number;
  totalCompleted: number;
  pendingTasks: number;
  inProgressTasks: number;
  successRate: number;
  scheduleSlips: number;
  overdueActive: number;
  requestedTasks: number;
};

type Summary = {
  totalTasks: number;
  totalCompleted: number;
  totalOverdue: number;
  totalPending: number;
  totalInProgress: number;
  completionRate: number;
};

type DashboardData = {
  summary: Summary;
  members: MemberStat[];
};

type Props = {
  data: DashboardData;
  userPermissions: string[];
};

export function TasksDashboardClient({ data }: Props) {
  const { summary, members } = data;

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (rate >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getSlipsBadge = (slips: number) => {
    if (slips === 0) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (slips <= 2) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 max-lg:pt-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tasks">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Tasks Dashboard</h1>
            <p className="text-muted-foreground mt-1">Team performance overview and task analytics</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <BarChart3 className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalCompleted}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <Clock className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalInProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalOverdue}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                  <TrendingUp className="size-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Team Members Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Target className="size-3.5" />
                      Assigned
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      Completed
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">In Progress</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="size-3.5" />
                      Success Rate
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <AlertTriangle className="size-3.5" />
                      Schedule Slips
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Overdue</TableHead>
                  <TableHead className="text-center">Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      No task data available
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id} className={cn(
                      member.overdueActive > 0 && 'bg-red-50/30'
                    )}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          {member.position && (
                            <p className="text-xs text-muted-foreground">{member.position}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{member.department}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{member.totalAssigned}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-emerald-700">{member.totalCompleted}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{member.pendingTasks}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{member.inProgressTasks}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn('font-semibold', getSuccessRateColor(member.successRate))}
                        >
                          {member.successRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn('font-semibold', getSlipsBadge(member.scheduleSlips))}
                        >
                          {member.scheduleSlips}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {member.overdueActive > 0 ? (
                          <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 font-semibold">
                            {member.overdueActive}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{member.requestedTasks}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Success Rate &ge; 80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Success Rate 60-79%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Success Rate &lt; 60%</span>
          </div>
          <span className="text-muted-foreground/60">|</span>
          <span><strong>Success Rate</strong> = % of completed tasks finished on or before due date</span>
          <span className="text-muted-foreground/60">|</span>
          <span><strong>Schedule Slips</strong> = tasks completed late + currently overdue tasks</span>
        </div>
      </div>
    </main>
  );
}
