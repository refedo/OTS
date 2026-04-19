'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, GitMerge, CalendarDays, LayoutGrid } from 'lucide-react';
import { AttendanceListClient } from '@/components/hr/attendance-list-client';
import { AttendanceMappingClient } from '@/components/hr/attendance-mapping-client';
import { AttendanceMonthlyGrid } from '@/components/hr/attendance-monthly-grid';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type MappingCandidate = {
  id: string;
  identifier: string;
  workerType: 'EMPLOYEE' | 'MANPOWER_SLOT';
  displayName: string | null;
  status: 'UNMAPPED' | 'RESOLVED' | 'IGNORED';
  resolvedEmployee: { id: string; employmentId: string; fullNameEn: string; fullNameAr: string | null } | null;
  resolvedAt: string | null;
  resolvedBy: { id: string; name: string | null } | null;
  ignoredAt: string | null;
  ignoredBy: { id: string; name: string | null } | null;
  ignoreReason: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
};

type Employee = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  occupation: string | null;
};

export function AttendanceTabsClient({
  canSync,
  mappingCandidates,
  employees,
  timesheetHref,
}: {
  canSync: boolean;
  mappingCandidates: MappingCandidate[];
  employees: Employee[];
  timesheetHref: string;
}) {
  const unmappedCount = mappingCandidates.filter((c) => c.status === 'UNMAPPED').length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="records" className="gap-2">
            <Calendar className="h-4 w-4" />
            Records
          </TabsTrigger>
          {canSync && (
            <TabsTrigger value="mapping" className="gap-2">
              <GitMerge className="h-4 w-4" />
              Mapping
              {unmappedCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                  {unmappedCount}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="grid" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Monthly Grid
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Timesheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <AttendanceListClient />
        </TabsContent>

        {canSync && (
          <TabsContent value="mapping">
            <AttendanceMappingClient candidates={mappingCandidates} employees={employees} />
          </TabsContent>
        )}

        <TabsContent value="grid">
          <div className="py-2">
            <AttendanceMonthlyGrid />
          </div>
        </TabsContent>

        <TabsContent value="timesheet">
          <div className="rounded-2xl border bg-gradient-to-br from-sky-50 to-white border-sky-200 p-8 text-center space-y-4">
            <CalendarDays className="mx-auto h-12 w-12 text-sky-400" />
            <h2 className="text-xl font-semibold text-slate-800">Employee Timesheets</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              View monthly timesheets for individual employees or manpower slots — colour-coded day grid,
              hours totals, overtime multipliers, and EN/AR name toggle.
            </p>
            <Link href={timesheetHref}>
              <Button className="mt-2 gap-2 bg-sky-600 hover:bg-sky-700">
                Open Timesheet
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
