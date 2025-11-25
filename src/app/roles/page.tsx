import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { RolesClient } from '@/components/roles-client';
import { checkPermission } from '@/lib/permission-checker';

export default async function RolesPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Check if user has permission to view roles
  // Temporarily disabled to allow initial setup
  // const canView = await checkPermission('roles.view');
  // if (!canView) {
  //   redirect('/dashboard');
  // }

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
