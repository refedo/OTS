import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { TasksClient } from '@/components/tasks-client';
import prisma from '@/lib/db';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

export default async function TasksPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Get user permissions
  const userPermissions = await getCurrentUserPermissions();

  // Fetch tasks
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/tasks`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  const tasks = response.ok ? await response.json() : [];

  // Fetch all users for assignment dropdown with department info
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      position: true,
      departmentId: true,
      department: { select: { id: true, name: true } }
    },
    orderBy: { name: 'asc' },
  });

  // Fetch all projects
  const projects = await prisma.project.findMany({
    where: { status: { in: ['Draft', 'Active'] } },
    select: { id: true, projectNumber: true, name: true },
    orderBy: { projectNumber: 'asc' },
  });

  // Fetch all buildings with projectId for filtering
  const buildings = await prisma.building.findMany({
    select: { id: true, designation: true, name: true, projectId: true },
    orderBy: { designation: 'asc' },
  });

  // Fetch all departments
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <TasksClient 
      initialTasks={tasks} 
      userRole={session.role} 
      userId={session.sub}
      allUsers={users}
      allProjects={projects}
      allBuildings={buildings}
      allDepartments={departments}
      userPermissions={userPermissions}
      filterMyTasks={filterMyTasks}
    />
  );
}
