import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { RolesClient } from '@/components/roles-client';
import { checkPermission } from '@/lib/permission-checker';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Roles',
};


export default async function RolesPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const canView = await checkPermission('roles.view');
  if (!canView) {
    redirect('/unauthorized?from=/roles');
  }

  // Fetch roles
  const roles = await db.role.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return <RolesClient roles={roles} />;
}
