import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { TaskForm } from '@/components/task-form';
import prisma from '@/lib/db';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Check permissions - allow if user has tasks.edit or tasks.create permission, or is CEO/Admin/Manager
  const userPermissions = await getCurrentUserPermissions();
  const canEdit = userPermissions.includes('tasks.edit') || 
                  userPermissions.includes('tasks.create') || 
                  ['CEO', 'Admin', 'Manager'].includes(session.role);
  
  if (!canEdit) {
    redirect('/tasks');
  }

  // Fetch task
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/tasks/${id}`, {
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

  // Fetch all active users for assignment dropdown
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
