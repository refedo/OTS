import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { ProjectDetails } from '@/components/project-details';
import { BuildingsList } from '@/components/buildings-list';
import { ScopeSchedulesView } from '@/components/scope-schedules-view';
import { BuildingScopesView } from '@/components/building-scopes-view';
import { getCurrentUserRestrictedModules, getCurrentUserPermissions } from '@/lib/permission-checker';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Projects',
};


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

  // Fetch scope of works
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const scopesResponse = await fetch(`${baseUrl}/api/scope-of-work?projectId=${id}`, {
    headers: { Cookie: `${cookieName}=${token}` },
    cache: 'no-store',
  });
  const scopeOfWorks = scopesResponse.ok ? await scopesResponse.json() : [];

  const userPermissions = await getCurrentUserPermissions();
  const canEdit = userPermissions.includes('projects.edit');

  // Get user's restricted modules for hiding financial data
  const restrictedModules = await getCurrentUserRestrictedModules();

  return (
    <div className="space-y-6">
      <ProjectDetails project={project} restrictedModules={restrictedModules} />
      {scopeSchedules.length > 0 && (
        <ScopeSchedulesView schedules={scopeSchedules} />
      )}
      {scopeOfWorks.length > 0 && (
        <BuildingScopesView
          buildings={buildings}
          scopeOfWorks={scopeOfWorks}
          buildingActivities={[]}
          projectId={id}
          canEdit={canEdit}
        />
      )}
      <BuildingsList projectId={id} buildings={buildings} canEdit={canEdit} />
    </div>
  );
}
