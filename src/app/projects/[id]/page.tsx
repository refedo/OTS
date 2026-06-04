import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { ProjectDetails } from '@/components/project-details';
import { ProjectSectionTabs } from '@/components/project-section-tabs';
import { getCurrentUserRestrictedModules, getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
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

  // Check if current user is admin/CEO for validation panel
  const currentUser = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isAdmin: true, role: { select: { name: true } } },
  });
  const isAdminOrCeo = !!(
    currentUser?.isAdmin ||
    currentUser?.role?.name === 'Admin' ||
    currentUser?.role?.name === 'CEO'
  );

  const canViewFinancials = isAdminOrCeo || userPermissions.includes('financial.view');

  return (
    <div>
      <ProjectDetails
        project={project}
        restrictedModules={restrictedModules}
        currentUserId={session.sub}
        isAdminOrCeo={isAdminOrCeo}
        canViewFinancials={canViewFinancials}
      />
      <div className="container mx-auto px-6 lg:px-8 pb-10">
        <ProjectSectionTabs
          projectId={id}
          buildings={buildings}
          scopeOfWorks={scopeOfWorks}
          scopeSchedules={scopeSchedules}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
