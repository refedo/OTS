'use client';

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
import { EmployeeLeavesTab } from './employee-leaves-tab';
import { useSearchParams } from 'next/navigation';

interface Props {
  recordTab: ReactNode;
  isSelfView: boolean;
  showHistory: boolean;
  showFinance: boolean;
  showAssets: boolean;
  showLetters: boolean;
  showPayslips: boolean;
  showAnnouncements?: boolean;
  showPolicies?: boolean;
  showContracts: boolean;
  showCarMaintenance: boolean;
  showTraining?: boolean;
  showOnboarding?: boolean;
  showCirculations?: boolean;
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
  canViewLeaves: boolean;
  employee: {
    fullNameEn: string;
    fullNameAr?: string | null;
    dateOfJoining: string;
    dateOfLeaving?: string | null;
    status: string;
    occupation?: string | null;
    department?: string | null;
    nationalId?: string | null;
    nationality?: string | null;
    dateOfBirth?: string | null;
    maritalStatus?: string | null;
    employeeNo?: string | null;
    reportsTo?: string | null;
    jobTitleEn?: string | null;
    jobTitleAr?: string | null;
    contractEndDate?: string | null;
    contractType?: string | null;
    workingLocation?: string | null;
    section?: string | null;
    division?: string | null;
  };
}

function fmt(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

function ProfileViewTab({ employee }: { employee: Props['employee'] }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm divide-y">
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-700">Personal Information</h3>
      </div>
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <InfoRow label="Full Name (EN)" value={employee.fullNameEn} />
        <InfoRow label="Full Name (AR)" value={employee.fullNameAr} />
        <InfoRow label="National ID / Iqama" value={employee.nationalId} />
        <InfoRow label="Nationality" value={employee.nationality} />
        <InfoRow label="Date of Birth" value={fmt(employee.dateOfBirth)} />
        <InfoRow label="Marital Status" value={employee.maritalStatus} />
      </div>
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-700">Employment Details</h3>
      </div>
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <InfoRow label="Employee No." value={employee.employeeNo} />
        <InfoRow label="Position Title" value={employee.occupation ?? employee.jobTitleEn} />
        <InfoRow label="Job Title (AR)" value={employee.jobTitleAr} />
        <InfoRow label="Department" value={employee.department} />
        <InfoRow label="Section" value={employee.section} />
        <InfoRow label="Division" value={employee.division} />
        <InfoRow label="Working Location" value={employee.workingLocation} />
        <InfoRow label="Reports To" value={employee.reportsTo} />
        <InfoRow label="Date of Joining" value={fmt(employee.dateOfJoining)} />
        <InfoRow label="Contract Type" value={employee.contractType} />
        <InfoRow label="Contract End Date" value={fmt(employee.contractEndDate)} />
        {employee.dateOfLeaving && <InfoRow label="Date of Leaving" value={fmt(employee.dateOfLeaving)} />}
      </div>
    </div>
  );
}

export function EmployeeDetailTabs({
  recordTab,
  isSelfView,
  showHistory,
  showFinance,
  showAssets,
  showLetters,
  showPayslips,
  showAnnouncements = false,
  showPolicies = false,
  showContracts,
  showCarMaintenance,
  showTraining = false,
  showOnboarding = false,
  showCirculations = false,
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
  canViewLeaves,
  employee,
}: Props) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') ?? 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {isSelfView && <TabsTrigger value="profile">Profile</TabsTrigger>}
        <TabsTrigger value="leaves">Leaves</TabsTrigger>
        {showPayslips && <TabsTrigger value="payslips">Payslips</TabsTrigger>}
        {showFinance && <TabsTrigger value="finance">Finance</TabsTrigger>}
        {showAssets && <TabsTrigger value="assets">Assets</TabsTrigger>}
        {showLetters && <TabsTrigger value="letters">Letters</TabsTrigger>}
        {showPolicies && <TabsTrigger value="policies">Policies</TabsTrigger>}
        {showAnnouncements && <TabsTrigger value="announcements">Announcements</TabsTrigger>}
        {/* Shared tabs — visible for both self-view and admin */}
        {showContracts && <TabsTrigger value="contracts">Contracts</TabsTrigger>}
        {showTraining && <TabsTrigger value="training">Training</TabsTrigger>}
        {showOnboarding && <TabsTrigger value="onboarding">Onboarding</TabsTrigger>}
        {showCirculations && <TabsTrigger value="circulations">Circulations</TabsTrigger>}
        {/* Admin-only tabs */}
        {!isSelfView && <TabsTrigger value="record">Record</TabsTrigger>}
        {!isSelfView && showHistory && <TabsTrigger value="history">History</TabsTrigger>}
        {!isSelfView && showCarMaintenance && <TabsTrigger value="car-maintenance">Car Maintenance</TabsTrigger>}
        {!isSelfView && <TabsTrigger value="announcements">Announcements</TabsTrigger>}
      </TabsList>

      {/* Overview — merged with self-service quick actions for isSelfView */}
      <TabsContent value="overview" className="mt-6">
        <EmployeeOverviewTab
          employeeId={employeeId}
          employee={employee}
          canViewLoans={canViewLoans}
          canViewCustodies={canViewCustodies}
          canViewAssets={showAssets}
          canViewContracts={canViewContracts}
          onEditClick={() => setActiveTab('record')}
          showEditButton={!isSelfView}
          showLeaveBalance={isSelfView}
        />
        {isSelfView && (
          <div className="mt-6">
            <EmployeeSelfDashboardTab
              employeeId={employeeId}
              employeeName={employee.fullNameEn}
              canManageLoans={canManageLoans}
              canManageCustodies={canManageCustodies}
              canManageLeaves={canManageLeaves}
              isSelfView={isSelfView}
            />
          </div>
        )}
      </TabsContent>

      {/* Profile — read-only personal info, self-view only */}
      {isSelfView && (
        <TabsContent value="profile" className="mt-6">
          <ProfileViewTab employee={employee} />
        </TabsContent>
      )}

      {/* Leaves — always shown */}
      <TabsContent value="leaves" className="mt-6">
        <EmployeeLeavesTab
          employeeId={employeeId}
          dateOfJoining={employee.dateOfJoining}
          isSelfView={isSelfView}
          canViewLeaves={canViewLeaves}
        />
      </TabsContent>

      {showPayslips && (
        <TabsContent value="payslips" className="mt-6">
          <EmployeePayslipsTab employeeId={employeeId} />
        </TabsContent>
      )}

      {showFinance && (
        <TabsContent value="finance" className="mt-6">
          <EmployeeFinanceTab
            employeeId={employeeId}
            canManageLoans={canManageLoans}
            canManageCustodies={canManageCustodies}
          />
        </TabsContent>
      )}

      {showAssets && (
        <TabsContent value="assets" className="mt-6">
          <EmployeeAssetsTab
            employeeId={employeeId}
            canManageAssets={canManageAssets}
            canManageViolations={canManageViolations}
          />
        </TabsContent>
      )}

      {showLetters && (
        <TabsContent value="letters" className="mt-6">
          <EmployeeLettersTab employeeId={employeeId} />
        </TabsContent>
      )}

      {showPolicies && (
        <TabsContent value="policies" className="mt-6">
          <EmployeeAnnouncementsTab mode="policies" />
        </TabsContent>
      )}

      {showAnnouncements && (
        <TabsContent value="announcements" className="mt-6">
          <EmployeeAnnouncementsTab mode="announcements" />
        </TabsContent>
      )}

      {/* Admin-only tabs — hidden for self-view */}
      {!isSelfView && (
        <TabsContent value="record" className="mt-6">{recordTab}</TabsContent>
      )}

      {!isSelfView && showHistory && (
        <TabsContent value="history" className="mt-6">
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

      {showContracts && (
        <TabsContent value="contracts" className="mt-6">
          <EmployeeContractsTab employeeId={employeeId} />
        </TabsContent>
      )}

      {!isSelfView && showCarMaintenance && (
        <TabsContent value="car-maintenance" className="mt-6">
          <EmployeeCarMaintenanceTab employeeId={employeeId} />
        </TabsContent>
      )}

      {showTraining && (
        <TabsContent value="training" className="mt-6">
          <EmployeeTrainingTab />
        </TabsContent>
      )}

      {showOnboarding && (
        <TabsContent value="onboarding" className="mt-6">
          <EmployeeOnboardingTab employeeId={employeeId} dateOfJoining={employee.dateOfJoining} />
        </TabsContent>
      )}

      {!isSelfView && (
        <TabsContent value="announcements" className="mt-6">
          <EmployeeAnnouncementsTab mode="announcements" />
        </TabsContent>
      )}

      {showCirculations && (
        <TabsContent value="circulations" className="mt-6">
          <EmployeeCirculationsTab employeeId={employeeId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
