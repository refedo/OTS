'use client';

/**
 * Thin client wrapper that gives /hr/employees/[id] top-level tabs:
 *   - Overview: dashboard summary (18.18.1)
 *   - Record:   the existing full EmployeeForm (passed as a slot)
 *   - History:  position + salary timelines (18.9.0)
 *   - Finance:  loans + custodies (18.10.0)
 *   - Assets:   asset assignments + traffic violations (18.12.0)
 *   - Letters:  HR letters issued to this employee (19.1.0)
 *
 * All tabs are client-side so switching between them never remounts the form.
 */

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmployeeHistoryTab } from './employee-history-tab';
import { EmployeeFinanceTab } from './employee-finance-tab';
import { EmployeeAssetsTab } from './employee-assets-tab';
import { EmployeeOverviewTab } from './employee-overview-tab';
import { EmployeeLettersTab } from './employee-letters-tab';
import { useSearchParams } from 'next/navigation';

interface Props {
  recordTab: ReactNode;
  showHistory: boolean;
  showFinance: boolean;
  showAssets: boolean;
  showLetters: boolean;
  employeeId: string;
  departments: { id: string; name: string }[];
  canManagePosition: boolean;
  canManageSalary: boolean;
  canApproveHr: boolean;
  canApproveCeo: boolean;
  canManageLoans: boolean;
  canManageCustodies: boolean;
  canViewLoans: boolean;
  canViewCustodies: boolean;
  canManageAssets: boolean;
  canManageViolations: boolean;
  canViewContracts: boolean;
  employee: {
    fullNameEn: string;
    dateOfJoining: string;
    dateOfLeaving?: string | null;
    status: string;
    occupation?: string | null;
    department?: string | null;
  };
}

export function EmployeeDetailTabs({
  recordTab,
  showHistory,
  showFinance,
  showAssets,
  showLetters,
  employeeId,
  departments,
  canManagePosition,
  canManageSalary,
  canApproveHr,
  canApproveCeo,
  canManageLoans,
  canManageCustodies,
  canViewLoans,
  canViewCustodies,
  canManageAssets,
  canManageViolations,
  canViewContracts,
  employee,
}: Props) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') ?? 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="record">Record</TabsTrigger>
        {showHistory && <TabsTrigger value="history">History</TabsTrigger>}
        {showFinance && <TabsTrigger value="finance">Finance</TabsTrigger>}
        {showAssets && <TabsTrigger value="assets">Assets</TabsTrigger>}
        {showLetters && <TabsTrigger value="letters">Letters</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <EmployeeOverviewTab
          employeeId={employeeId}
          employee={employee}
          canViewLoans={canViewLoans}
          canViewCustodies={canViewCustodies}
          canViewAssets={showAssets}
          canViewContracts={canViewContracts}
          onEditClick={() => setActiveTab('record')}
        />
      </TabsContent>

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
      {showLetters && (
        <TabsContent value="letters" className="mt-4">
          <EmployeeLettersTab employeeId={employeeId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
