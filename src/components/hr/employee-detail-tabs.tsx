'use client';

/**
 * Thin client wrapper that gives /hr/employees/[id] two top-level tabs:
 *   - Record:  the existing full EmployeeForm (passed as a slot)
 *   - History: position + salary timelines (18.9.0)
 *
 * Both tabs are client-side so switching between them never remounts the
 * form. The History tab lazily fetches its own data.
 */

import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmployeeHistoryTab } from './employee-history-tab';

interface Props {
  recordTab: ReactNode;
  showHistory: boolean;
  employeeId: string;
  departments: { id: string; name: string }[];
  canManagePosition: boolean;
  canManageSalary: boolean;
  canApproveHr: boolean;
  canApproveCeo: boolean;
}

export function EmployeeDetailTabs({
  recordTab,
  showHistory,
  employeeId,
  departments,
  canManagePosition,
  canManageSalary,
  canApproveHr,
  canApproveCeo,
}: Props) {
  if (!showHistory) {
    return <>{recordTab}</>;
  }

  return (
    <Tabs defaultValue="record" className="w-full">
      <TabsList>
        <TabsTrigger value="record">Record</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="record">{recordTab}</TabsContent>
      <TabsContent value="history">
        <EmployeeHistoryTab
          employeeId={employeeId}
          departments={departments}
          canManagePosition={canManagePosition}
          canManageSalary={canManageSalary}
          canApproveHr={canApproveHr}
          canApproveCeo={canApproveCeo}
        />
      </TabsContent>
    </Tabs>
  );
}
