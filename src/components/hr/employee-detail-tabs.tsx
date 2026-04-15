'use client';

/**
 * Thin client wrapper that gives /hr/employees/[id] top-level tabs:
 *   - Record:  the existing full EmployeeForm (passed as a slot)
 *   - History: position + salary timelines (18.9.0)
 *   - Finance: loans + custodies (18.10.0)
 *   - Assets:  asset assignments + traffic violations (18.12.0)
 *
 * All tabs are client-side so switching between them never remounts the form.
 */

import type { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmployeeHistoryTab } from './employee-history-tab';
import { EmployeeFinanceTab } from './employee-finance-tab';
import { EmployeeAssetsTab } from './employee-assets-tab';

interface Props {
  recordTab: ReactNode;
  showHistory: boolean;
  showFinance: boolean;
  showAssets: boolean;
  employeeId: string;
  departments: { id: string; name: string }[];
  canManagePosition: boolean;
  canManageSalary: boolean;
  canApproveHr: boolean;
  canApproveCeo: boolean;
  canManageLoans: boolean;
  canManageCustodies: boolean;
  canManageAssets: boolean;
  canManageViolations: boolean;
}

export function EmployeeDetailTabs({
  recordTab,
  showHistory,
  showFinance,
  showAssets,
  employeeId,
  departments,
  canManagePosition,
  canManageSalary,
  canApproveHr,
  canApproveCeo,
  canManageLoans,
  canManageCustodies,
  canManageAssets,
  canManageViolations,
}: Props) {
  if (!showHistory && !showFinance && !showAssets) {
    return <>{recordTab}</>;
  }

  return (
    <Tabs defaultValue="record" className="w-full">
      <TabsList>
        <TabsTrigger value="record">Record</TabsTrigger>
        {showHistory && <TabsTrigger value="history">History</TabsTrigger>}
        {showFinance && <TabsTrigger value="finance">Finance</TabsTrigger>}
        {showAssets && <TabsTrigger value="assets">Assets</TabsTrigger>}
      </TabsList>
      <TabsContent value="record">{recordTab}</TabsContent>
      {showHistory && (
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
      )}
      {showFinance && (
        <TabsContent value="finance">
          <EmployeeFinanceTab
            employeeId={employeeId}
            canManageLoans={canManageLoans}
            canManageCustodies={canManageCustodies}
          />
        </TabsContent>
      )}
      {showAssets && (
        <TabsContent value="assets">
          <EmployeeAssetsTab
            employeeId={employeeId}
            canManageAssets={canManageAssets}
            canManageViolations={canManageViolations}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
