import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FileText } from 'lucide-react';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { WPSList } from '@/components/wps-list';

async function getWPSList() {
  const wps = await prisma.wPS.findMany({
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
        select: { name: true, position: true },
      },
      approvedBy: {
        select: { name: true, position: true },
      },
      _count: {
        select: { passes: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return wps;
}

async function getProjects() {
  const projects = await prisma.project.findMany({
    where: { status: { not: 'Cancelled' } },
    select: {
      id: true,
      projectNumber: true,
      name: true,
    },
    orderBy: { projectNumber: 'asc' },
  });
  return projects;
}

export default async function WPSListPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const wpsList = await getWPSList();
  const projects = await getProjects();
  const canApprove = ['Admin', 'Manager'].includes(session.role);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welding Procedure Specifications</h1>
            <p className="text-muted-foreground mt-1">
              Manage WPS documents per AWS D1.1 / D17.1 standards
            </p>
          </div>
          <Link href="/wps/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create WPS
            </Button>
          </Link>
        </div>

        {wpsList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No WPS Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by creating your first Welding Procedure Specification
              </p>
              <Link href="/wps/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First WPS
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <WPSList wpsList={wpsList} projects={projects} canApprove={canApprove} />
        )}
      </div>
    </main>
  );
}
