import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { ITPDetails } from '@/components/itp-details';
import prisma from '@/lib/db';

export default async function ITPDetailPage({ params }: { params: { id: string } }) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch ITP
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/itp/${params.id}`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) notFound();
    redirect('/itp');
  }

  const itp = await response.json();

  // Fetch projects for cloning
  const projects = await prisma.project.findMany({
    where: { status: { in: ['Draft', 'Active'] } },
    select: { 
      id: true, 
      projectNumber: true, 
      name: true,
    },
    orderBy: { projectNumber: 'asc' },
  });

  return <ITPDetails itp={itp} userRole={session.role} userId={session.sub} projects={projects} />;
}
