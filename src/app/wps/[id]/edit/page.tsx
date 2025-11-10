import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { WPSForm } from '@/components/wps-form';

export default async function EditWPSPage({ params }: { params: { id: string } }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const wps = await prisma.wPS.findUnique({
    where: { id: params.id },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          client: {
            select: { name: true },
          },
        },
      },
      preparedBy: {
        select: { id: true, name: true, email: true, position: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true, position: true },
      },
      passes: {
        orderBy: { layerNo: 'asc' },
      },
    },
  });

  if (!wps) {
    notFound();
  }

  // Only allow editing if status is Draft
  if (wps.status !== 'Draft') {
    redirect(`/wps/${wps.id}`);
  }

  // Fetch active projects
  const projects = await prisma.project.findMany({
    where: { status: { not: 'Cancelled' } },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      client: {
        select: { name: true },
      },
    },
    orderBy: { projectNumber: 'asc' },
  });

  // Fetch users for approval
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { 
      id: true, 
      name: true, 
      email: true,
      position: true,
      role: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Edit WPS</h1>
          <p className="text-muted-foreground mt-1">
            {wps.wpsNumber} - Rev. {wps.revision}
          </p>
        </div>

        <WPSForm projects={projects} users={users} wps={wps} />
      </div>
    </main>
  );
}
