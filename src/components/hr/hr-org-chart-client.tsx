'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Building2 } from 'lucide-react';
import { OrganizationChartViews } from '@/components/organization-chart-views';
import { DepartmentOrgChart } from '@/components/hr/department-org-chart';
import type { HierarchyNode } from '@/lib/hierarchy';
import type { DeptHierarchyNode } from '@/lib/employee-hierarchy';

type Props = {
  employeeTree: HierarchyNode[];
  deptTree: DeptHierarchyNode[];
};

export function HrOrgChartClient({ employeeTree, deptTree }: Props) {
  return (
    <Tabs defaultValue="employee" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="employee" className="gap-2">
          <Users className="h-4 w-4" />
          By Employee
        </TabsTrigger>
        <TabsTrigger value="department" className="gap-2">
          <Building2 className="h-4 w-4" />
          By Department
        </TabsTrigger>
      </TabsList>

      <TabsContent value="employee">
        {employeeTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No employee hierarchy data</p>
            <p className="text-sm mt-1">
              Sync employees from Dolibarr or set supervisor relationships to build the chart.
            </p>
          </div>
        ) : (
          <OrganizationChartViews hierarchy={employeeTree} />
        )}
      </TabsContent>

      <TabsContent value="department">
        <DepartmentOrgChart tree={deptTree} />
      </TabsContent>
    </Tabs>
  );
}
