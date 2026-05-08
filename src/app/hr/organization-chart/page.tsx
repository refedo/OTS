import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { buildEmployeeHierarchyTree, buildDepartmentHierarchyTree } from '@/lib/employee-hierarchy';
import { HrOrgChartClient } from '@/components/hr/hr-org-chart-client';
import { Network } from 'lucide-react';

export const metadata: Metadata = { title: 'Organization Chart' };

export default async function HrOrganizationChartPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.view');
  if (!canView) redirect('/unauthorized?from=/hr/organization-chart');

  const [employeeTree, deptTree] = await Promise.all([
    buildEmployeeHierarchyTree(),
    buildDepartmentHierarchyTree(),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20">
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
              <Network className="h-8 w-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm mb-2">
                HR · Organization
              </div>
              <h1 className="text-2xl font-bold">Organization Chart</h1>
              <p className="text-sky-100 text-sm mt-0.5">
                Employee reporting hierarchy and departmental structure
              </p>
            </div>
          </div>
        </div>

        <HrOrgChartClient employeeTree={employeeTree} deptTree={deptTree} />
      </div>
    </main>
  );
}
