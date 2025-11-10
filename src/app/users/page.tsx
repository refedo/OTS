import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { UsersClient } from '@/components/users-client';

export default async function UsersPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch users with their roles and departments
  const users = await db.user.findMany({
    include: {
      role: true,
      department: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return <UsersClient users={users} />;
}
