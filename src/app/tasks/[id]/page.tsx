import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { TaskDetails } from '@/components/task-details';

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
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

  const task = await response.json();

  return <TaskDetails task={task} userRole={session.role} userId={session.sub} />;
}
