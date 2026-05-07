import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import db from '@/lib/db';

export default async function ProjectCardRedirectPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const activeProject = await db.project.findFirst({
    where: { deletedAt: null, status: 'Active' },
    select: { id: true },
    orderBy: { projectNumber: 'asc' },
  });

  if (activeProject) redirect(`/projects/${activeProject.id}/buildings`);

  const anyProject = await db.project.findFirst({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { projectNumber: 'asc' },
  });

  if (anyProject) redirect(`/projects/${anyProject.id}/buildings`);

  redirect('/projects');
}
