import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { ITPFormNew } from '@/components/itp-form-new';
import prisma from '@/lib/db';

export default async function NewITPPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Only CEO, QA/QC Engineers, Managers, and Admins can create ITPs
  if (!['CEO', 'Admin', 'Manager', 'Engineer'].includes(session.role)) {
    redirect('/itp');
  }

  // Fetch projects
  const projects = await prisma.project.findMany({
    where: { status: { in: ['Draft', 'Active'] } },
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

  // Fetch users for signatures
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
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Create New ITP</h1>
          <p className="text-muted-foreground mt-1">
            Inspection & Test Plan - HEXA-DOC-INSP-003
          </p>
        </div>

        <ITPFormNew projects={projects} users={users} />
      </div>
    </main>
  );
}
