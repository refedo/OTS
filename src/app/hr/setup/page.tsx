import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { HrSetupClient } from '@/components/hr/hr-setup-client';

export const metadata: Metadata = { title: 'HR Setup' };

export default async function HrSetupPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canManageDepartments =
    permissions.includes('departments.create') || permissions.includes('departments.edit');
  const canManageSections = permissions.includes('hr.section.manage');

  if (!canManageDepartments && !canManageSections) {
    redirect('/unauthorized?from=/hr/setup');
  }

  const [departments, sections] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.hrSection.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
  ]);

  const serializedDepartments = departments.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    archivedAt: d.archivedAt ? d.archivedAt.toISOString() : null,
  }));

  const serializedSections = sections.map((s) => ({
    id: s.id,
    name: s.name,
    displayOrder: s.displayOrder,
    archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
  }));

  return (
    <HrSetupClient
      initialDepartments={serializedDepartments}
      initialSections={serializedSections}
      canManageDepartments={canManageDepartments}
      canCreateDepartment={permissions.includes('departments.create')}
      canDeleteDepartment={permissions.includes('departments.delete')}
      canManageSections={canManageSections}
    />
  );
}
