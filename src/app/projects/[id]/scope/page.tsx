import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { ProjectScopeSummary } from '@/components/project-scope-summary';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Project Scope Summary' };

export default async function ProjectScopePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) redirect('/login');

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const headers = { Cookie: `${cookieName}=${token}` };

  const [projectRes, scopesRes] = await Promise.all([
    fetch(`${baseUrl}/api/projects/${id}`, { headers, cache: 'no-store' }),
    fetch(`${baseUrl}/api/scope-of-work?projectId=${id}`, { headers, cache: 'no-store' }),
  ]);

  if (!projectRes.ok) {
    if (projectRes.status === 404) notFound();
    redirect('/projects');
  }

  const project = await projectRes.json();
  const scopeOfWorks = scopesRes.ok ? await scopesRes.json() : [];

  return <ProjectScopeSummary project={project} scopeOfWorks={scopeOfWorks} />;
}
