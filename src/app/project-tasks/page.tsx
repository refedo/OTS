import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { ProjectTasksClient } from '@/components/project-tasks-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tasks Management',
};

export default async function ProjectTasksPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const canCreate = await checkPermission('tasks.create');

  // Fetch tasks via API to respect PBAC visibility rules
  const response = await fetch(
    `${process.env.APP_URL || 'http://localhost:3000'}/api/tasks`,
    {
      headers: { Cookie: `${cookieName}=${token}` },
      cache: 'no-store',
    }
  );
  const tasks = response.ok ? await response.json() : [];

  const [users, projects, buildings] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, email: true, position: true, departmentId: true },
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
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks Management</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all tasks across projects
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="size-4 mr-2" />
                New Task
              </Link>
            </Button>
          )}
        </div>

        <ProjectTasksClient
          initialTasks={tasks}
          allUsers={users}
          allProjects={projects}
          allBuildings={buildings}
          canCreate={canCreate}
        />
      </div>
    </main>
  );
}
