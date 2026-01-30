import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { ProjectDetails } from '@/components/project-details';
import { BuildingsList } from '@/components/buildings-list';
import { ScopeSchedulesView } from '@/components/scope-schedules-view';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch project from API
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/projects/${id}`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) notFound();
    redirect('/projects');
  }

  const project = await response.json();

  // Fetch buildings
  const buildingsResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/projects/${id}/buildings`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  const buildings = buildingsResponse.ok ? await buildingsResponse.json() : [];

  // Fetch scope schedules
  const schedulesResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/projects/${id}/scope-schedules`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  const scopeSchedules = schedulesResponse.ok ? await schedulesResponse.json() : [];

  const canEdit = ['CEO', 'Admin', 'Manager'].includes(session.role);

  return (
    <div className="space-y-6">
      <ProjectDetails project={project} />
      {scopeSchedules.length > 0 && (
        <ScopeSchedulesView schedules={scopeSchedules} />
      )}
      <BuildingsList projectId={id} buildings={buildings} canEdit={canEdit} />
    </div>
  );
}
