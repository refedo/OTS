import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { EmployeeForm } from '@/components/hr/employee-form';

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

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">New Employee</h1>
      <EmployeeForm
        initial={null}
        canViewCompensation={canViewCompensation}
        canResetToDolibarr={false}
        departments={departments}
      />
    </div>
  );
}
