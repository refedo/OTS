import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import prisma from '@/lib/db';

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Only CEO, Admins and Managers can edit tasks
  if (!['CEO', 'Admin', 'Manager'].includes(session.role)) {
    redirect('/tasks');
  }

  // Fetch task
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/tasks/${params.id}`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) notFound();
    redirect('/tasks');
  }

  const taskData = await response.json();

  // Convert to plain object for client component
  const task = {
    ...taskData,
    dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
  };

  // Fetch users for assignment with department info
  let users;
  if (['CEO', 'Admin'].includes(session.role)) {
    users = await prisma.user.findMany({
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
  } else {
    const manager = await prisma.user.findUnique({
      where: { id: session.sub },
      include: {
        subordinates: {
          where: { status: 'active' },
          select: { 
            id: true, 
            name: true, 
            email: true, 
            position: true,
            departmentId: true,
            department: { select: { id: true, name: true } }
          },
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

  // Fetch buildings with projectId
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
          <h1 className="text-3xl font-bold tracking-tight">Edit Task</h1>
          <p className="text-muted-foreground mt-1">
            Update task details
          </p>
        </div>

        <TaskForm users={users} projects={projects} buildings={buildings} departments={departments} task={task} />
      </div>
    </main>
  );
}
