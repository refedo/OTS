import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { InitiativesClient } from '@/components/initiatives-client';
import prisma from '@/lib/db';

export default async function InitiativesPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch initiatives directly from database
  const initiatives = await prisma.initiative.findMany({
    include: {
      owner: {
        select: { id: true, name: true, email: true, position: true },
      },
      department: {
        select: { id: true, name: true },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
      milestones: {
        select: { id: true, name: true, status: true, progress: true },
      },
      tasks: {
        select: { id: true, taskName: true, status: true, progress: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

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
    <InitiativesClient 
      initialInitiatives={initiatives} 
      userRole={session.role} 
      userId={session.sub}
      allUsers={users}
      allDepartments={departments}
    />
  );
}
