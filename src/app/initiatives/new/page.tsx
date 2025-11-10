import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { InitiativeForm } from '@/components/initiative-form';
import prisma from '@/lib/db';

export default async function NewInitiativePage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Check if user is Admin or Manager
  if (!['Admin', 'Manager'].includes(session.role)) {
    redirect('/initiatives');
  }

  // Fetch all users for owner dropdown
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, email: true, position: true },
    orderBy: { name: 'asc' },
  });

  // Fetch all departments
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <InitiativeForm 
      mode="create"
      allUsers={users}
      allDepartments={departments}
      currentUserId={session.sub}
    />
  );
}
