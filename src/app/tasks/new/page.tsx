import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import prisma from '@/lib/db';

export default async function NewTaskPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Only Admins and Managers can create tasks
  if (!['Admin', 'Manager'].includes(session.role)) {
    redirect('/tasks');
  }

  // Fetch users for assignment (subordinates for managers, all for admins)
  let users;
  if (session.role === 'Admin') {
    users = await prisma.user.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, email: true, position: true },
      orderBy: { name: 'asc' },
    });
  } else {
    // Manager sees their subordinates
    const manager = await prisma.user.findUnique({
      where: { id: session.sub },
      include: {
        subordinates: {
          where: { status: 'active' },
          select: { id: true, name: true, email: true, position: true },
        },
      },
    });
    users = manager?.subordinates || [];
  }

  // Fetch projects
  const projects = await prisma.project.findMany({
    where: { status: { in: ['Draft', 'Active'] } },
    select: { id: true, projectNumber: true, name: true },
    orderBy: { projectNumber: 'asc' },
  });

  // Fetch buildings
  const buildings = await prisma.building.findMany({
    select: { id: true, designation: true, name: true, projectId: true },
    orderBy: { designation: 'asc' },
  });

  // Fetch departments
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 max-w-3xl max-lg:pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Create New Task</h1>
          <p className="text-muted-foreground mt-1">
            Assign a task to a team member
          </p>
        </div>

        <TaskForm users={users} projects={projects} buildings={buildings} departments={departments} />
      </div>
    </main>
  );
}
