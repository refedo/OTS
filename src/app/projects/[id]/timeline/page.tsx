import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { OperationTimelineClient } from '@/components/operations/OperationTimelineClient';

export default async function ProjectTimelinePage({ params }: { params: { id: string } }) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch project
  const projectResponse = await fetch(
    `${process.env.APP_URL || 'http://localhost:3000'}/api/projects/${params.id}`,
    {
      headers: {
        Cookie: `${cookieName}=${token}`,
      },
      cache: 'no-store',
    }
  );

  if (!projectResponse.ok) {
    if (projectResponse.status === 404) notFound();
    redirect('/projects');
  }

  const project = await projectResponse.json();

  // Fetch buildings
  const buildingsResponse = await fetch(
    `${process.env.APP_URL || 'http://localhost:3000'}/api/projects/${params.id}/buildings`,
    {
      headers: {
        Cookie: `${cookieName}=${token}`,
      },
      cache: 'no-store',
    }
  );

  const buildings = buildingsResponse.ok ? await buildingsResponse.json() : [];

  const canEdit = ['Admin', 'Project Manager'].includes(session.role);

  return (
    <OperationTimelineClient
      projectId={params.id}
      project={project}
      buildings={buildings}
      canEdit={canEdit}
      userRole={session.role}
    />
  );
}
