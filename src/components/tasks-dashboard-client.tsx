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
import { ArrowLeft, Users, CheckCircle2, AlertTriangle, Clock, TrendingUp, BarChart3, Target, LayoutDashboard } from 'lucide-react';
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto p-4 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Hero Banner */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Tasks Dashboard</h1>
              </div>
              <p className="text-violet-100 text-sm">Team performance overview and task analytics</p>
            </div>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 bg-white/10 backdrop-blur-sm self-start md:self-auto"
              asChild
            >
              <Link href="/tasks">
                <ArrowLeft className="size-4 mr-2" />
                Back to Tasks
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total Tasks</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{summary.totalTasks}</p>
            <p className="text-xs text-sky-500 mt-0.5">all time</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{summary.totalCompleted}</p>
            <p className="text-xs text-emerald-500 mt-0.5">finished</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-blue-50 to-white border-blue-200 p-4 shadow-sm">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">In Progress</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{summary.totalInProgress}</p>
            <p className="text-xs text-blue-500 mt-0.5">active</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-red-50 to-white border-red-200 p-4 shadow-sm">
            <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{summary.totalOverdue}</p>
            <p className="text-xs text-red-500 mt-0.5">past due date</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Completion</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{summary.completionRate}%</p>
            <p className="text-xs text-violet-500 mt-0.5">success rate</p>
          </div>
        </div>

        {/* Members Performance Table */}
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="border-b bg-slate-50/80 rounded-t-2xl">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
              <Users className="size-4 text-violet-500" />
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
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
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
