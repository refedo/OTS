import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import { WPSForm } from '@/components/wps-form';

export default async function EditWPSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const wps = await prisma.wPS.findUnique({
    where: { id },
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

  // Serialize WPS data to convert Decimal objects to numbers
  const serializedWPS = {
    ...wps,
    materialThickness: wps.materialThickness ? Number(wps.materialThickness) : null,
    thicknessGroove: wps.thicknessGroove ? Number(wps.thicknessGroove) : null,
    thicknessFillet: wps.thicknessFillet ? Number(wps.thicknessFillet) : null,
    diameter: wps.diameter ? Number(wps.diameter) : null,
    flowRate: wps.flowRate ? Number(wps.flowRate) : null,
    grooveAngle: wps.grooveAngle ? Number(wps.grooveAngle) : null,
    rootOpening: wps.rootOpening ? Number(wps.rootOpening) : null,
    preheatTempMin: wps.preheatTempMin ? Number(wps.preheatTempMin) : null,
    interpassTempMin: wps.interpassTempMin ? Number(wps.interpassTempMin) : null,
    interpassTempMax: wps.interpassTempMax ? Number(wps.interpassTempMax) : null,
    postWeldTemp: wps.postWeldTemp ? Number(wps.postWeldTemp) : null,
    passes: wps.passes.map(pass => ({
      ...pass,
      diameter: pass.diameter ? Number(pass.diameter) : null,
      amperage: pass.amperage ? Number(pass.amperage) : null,
      voltage: pass.voltage ? Number(pass.voltage) : null,
      travelSpeed: pass.travelSpeed ? Number(pass.travelSpeed) : null,
      heatInput: pass.heatInput ? Number(pass.heatInput) : null,
    })),
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-6 lg:p-8 max-w-7xl max-lg:pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Edit WPS</h1>
          <p className="text-muted-foreground mt-1">
            {wps.wpsNumber} - Rev. {wps.revision}
          </p>
        </div>

        <WPSForm projects={projects} users={users} wps={serializedWPS} />
      </div>
    </main>
  );
}
