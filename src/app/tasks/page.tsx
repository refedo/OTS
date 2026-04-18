import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { TasksClient } from '@/components/tasks-client';
import prisma from '@/lib/db';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Tasks',
};


export default async function TasksPage({ searchParams }: { searchParams: Promise<{ filter?: string; project?: string }> }) {
  const params = await searchParams;
  const filterMyTasks = params.filter === 'my-tasks';
  const filterRequesterTasks = params.filter === 'requested-by-me';
  const projectId = params.project;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const verifiedSession = session!;

  // Run all data fetches in parallel
  const [userPermissions, tasksResponse, users, projects, buildings, departments, userPrefs] = await Promise.all([
    getCurrentUserPermissions(),
    fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/tasks`, {
      headers: { Cookie: `${cookieName}=${token}` },
      cache: 'no-store',
    }),
    prisma.user.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({
      where: { status: { in: ['Draft', 'Active'] } },
      select: { id: true, projectNumber: true, name: true },
      orderBy: { projectNumber: 'asc' },
    }),
    prisma.building.findMany({
      select: { id: true, designation: true, name: true, projectId: true },
      orderBy: { designation: 'asc' },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findUnique({
      where: { id: verifiedSession.sub },
      select: { customPermissions: true },
    }),
  ]);

  const tasks = tasksResponse.ok ? await tasksResponse.json() : [];
  const perms = (userPrefs?.customPermissions as Record<string, unknown>) ?? {};
  const tipsDismissed = perms['tipsDismissed_tasks-new-features'] === true;

  return (
    <TasksClient
      initialTasks={tasks}
      userId={verifiedSession.sub}
      allUsers={users}
      allProjects={projects}
      allBuildings={buildings}
      allDepartments={departments}
      userPermissions={userPermissions}
      filterMyTasks={filterMyTasks}
      filterRequesterTasks={filterRequesterTasks}
      initialProjectFilter={projectId}
      tipsDismissed={tipsDismissed}
    />
  );
}
