import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { TaskDetails } from '@/components/task-details';
import { getCurrentUserPermissions } from '@/lib/permission-checker';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
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

  const task = await response.json();
  
  // Get user permissions for proper access control
  const userPermissions = await getCurrentUserPermissions();

  return <TaskDetails task={task} userRole={session.role} userId={session.sub} userPermissions={userPermissions} />;
}
