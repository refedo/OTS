import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';

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

export default async function WPSListPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const wpsList = await getWPSList();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Draft':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'Superseded':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Superseded':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

        <div className="grid gap-4">
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
            wpsList.map((wps) => (
              <Card key={wps.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">
                          {wps.wpsNumber}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">
                          Rev. {wps.revision}
                        </span>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(wps.status)}`}>
                          {getStatusIcon(wps.status)}
                          {wps.status}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium">Project:</span> {wps.project.projectNumber} - {wps.project.name}
                        </p>
                        <p>
                          <span className="font-medium">Client:</span> {wps.project.client.name}
                        </p>
                        <p>
                          <span className="font-medium">Process:</span> {wps.weldingProcess}
                        </p>
                        {wps.supportingPQR && (
                          <p>
                            <span className="font-medium">PQR:</span> {wps.supportingPQR}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Link href={`/wps/${wps.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {wps.status === 'Draft' && (
                        <Link href={`/wps/${wps.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Prepared By</p>
                      <p className="font-medium">{wps.preparedBy.name}</p>
                      {wps.preparedBy.position && (
                        <p className="text-xs text-muted-foreground">{wps.preparedBy.position}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Approved By</p>
                      <p className="font-medium">
                        {wps.approvedBy?.name || 'Pending'}
                      </p>
                      {wps.approvedBy?.position && (
                        <p className="text-xs text-muted-foreground">{wps.approvedBy.position}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Welding Passes</p>
                      <p className="font-medium">{wps._count.passes} passes</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date Issued</p>
                      <p className="font-medium">
                        {wps.dateIssued
                          ? new Date(wps.dateIssued).toLocaleDateString()
                          : 'Not issued'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
