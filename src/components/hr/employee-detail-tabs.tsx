'use client';

/**
 * Thin client wrapper that gives /hr/employees/[id] top-level tabs.
 * Tabs: Overview, Record, History, Finance, Assets, Letters, Payslips,
 *       Contracts, Training, Onboarding, Announcements, Circulations, Car Maintenance, Dashboard
 */

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmployeeHistoryTab } from './employee-history-tab';
import { EmployeeFinanceTab } from './employee-finance-tab';
import { EmployeeAssetsTab } from './employee-assets-tab';
import { EmployeeOverviewTab } from './employee-overview-tab';
import { EmployeeLettersTab } from './employee-letters-tab';
import { EmployeePayslipsTab } from './employee-payslips-tab';
import { EmployeeContractsTab } from './employee-contracts-tab';
import { EmployeeTrainingTab } from './employee-training-tab';
import { EmployeeOnboardingTab } from './employee-onboarding-tab';
import { EmployeeAnnouncementsTab } from './employee-announcements-tab';
import { EmployeeCirculationsTab } from './employee-circulations-tab';
import { EmployeeCarMaintenanceTab } from './employee-car-maintenance-tab';
import { EmployeeSelfDashboardTab } from './employee-self-dashboard-tab';
import { useSearchParams } from 'next/navigation';

interface Props {
  recordTab: ReactNode;
  showHistory: boolean;
  showFinance: boolean;
  showAssets: boolean;
  showLetters: boolean;
  showPayslips: boolean;
  showContracts: boolean;
  showCarMaintenance: boolean;
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
  canManageLeaves: boolean;
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
  showPayslips,
  showContracts,
  showCarMaintenance,
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
  canManageLeaves,
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
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        {showHistory && <TabsTrigger value="history">History</TabsTrigger>}
        {showFinance && <TabsTrigger value="finance">Finance</TabsTrigger>}
        {showAssets && <TabsTrigger value="assets">Assets</TabsTrigger>}
        {showCarMaintenance && <TabsTrigger value="car-maintenance">Car Maintenance</TabsTrigger>}
        {showLetters && <TabsTrigger value="letters">Letters</TabsTrigger>}
        {showPayslips && <TabsTrigger value="payslips">Payslips</TabsTrigger>}
        {showContracts && <TabsTrigger value="contracts">Contracts</TabsTrigger>}
        <TabsTrigger value="training">Training</TabsTrigger>
        <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        <TabsTrigger value="announcements">Announcements</TabsTrigger>
        <TabsTrigger value="circulations">Circulations</TabsTrigger>
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

      <TabsContent value="dashboard" className="mt-4">
        <EmployeeSelfDashboardTab
          employeeId={employeeId}
          employeeName={employee.fullNameEn}
          canManageLoans={canManageLoans}
          canManageCustodies={canManageCustodies}
          canManageLeaves={canManageLeaves}
        />
      </TabsContent>

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
      {showCarMaintenance && (
        <TabsContent value="car-maintenance" className="mt-4">
          <EmployeeCarMaintenanceTab employeeId={employeeId} />
        </TabsContent>
      )}
      {showLetters && (
        <TabsContent value="letters" className="mt-4">
          <EmployeeLettersTab employeeId={employeeId} />
        </TabsContent>
      )}
      {showPayslips && (
        <TabsContent value="payslips" className="mt-4">
          <EmployeePayslipsTab employeeId={employeeId} />
        </TabsContent>
      )}
      {showContracts && (
        <TabsContent value="contracts" className="mt-4">
          <EmployeeContractsTab employeeId={employeeId} />
        </TabsContent>
      )}
      <TabsContent value="training" className="mt-4">
        <EmployeeTrainingTab />
      </TabsContent>
      <TabsContent value="onboarding" className="mt-4">
        <EmployeeOnboardingTab employeeId={employeeId} dateOfJoining={employee.dateOfJoining} />
      </TabsContent>
      <TabsContent value="announcements" className="mt-4">
        <EmployeeAnnouncementsTab />
      </TabsContent>
      <TabsContent value="circulations" className="mt-4">
        <EmployeeCirculationsTab employeeId={employeeId} />
      </TabsContent>
    </Tabs>
  );
}
