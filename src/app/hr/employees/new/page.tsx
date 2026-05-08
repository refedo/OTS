import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { EmployeeForm } from '@/components/hr/employee-form';
import { UserPlus } from 'lucide-react';

export default async function NewEmployeePage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canCreate = await checkPermission('hr.employee.create');
  if (!canCreate) redirect('/unauthorized?from=/hr/employees/new');

  const permissions = await getCurrentUserPermissions();
  const canViewCompensation = permissions.includes('hr.employee.viewCompensation');

  const [departments, allEmployees] = await Promise.all([
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, status: { not: 'TERMINATED' } },
      select: { id: true, fullNameEn: true, employmentId: true },
      orderBy: { fullNameEn: 'asc' },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
              <UserPlus className="h-7 w-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm mb-2">
                HR · Employees
              </div>
              <h1 className="text-2xl font-bold">Add New Employee</h1>
              <p className="text-sky-100 text-sm mt-0.5">
                Fill in the employee details below. Mandatory fields are marked with an asterisk.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border bg-white shadow-sm p-6 md:p-8">
          <EmployeeForm
            initial={null}
            canViewCompensation={canViewCompensation}
            canResetToDolibarr={false}
            departments={departments}
            allEmployees={allEmployees}
          />
        </div>
      </div>
    </div>
  );
}
