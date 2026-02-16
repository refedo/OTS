import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import db from '@/lib/db';
import { ProjectFormFull } from '@/components/project-form-full';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  if (!['CEO', 'Admin', 'Manager'].includes(session.role)) {
    redirect('/projects');
  }

  // Fetch the project
  const projectData = await db.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      projectManager: true,
      salesEngineer: true,
    },
  });

  if (!projectData) {
    notFound();
  }

  // Convert Decimal and Date fields for client component
  const project = {
    ...projectData,
    // Convert Decimals to numbers
    contractValue: projectData.contractValue !== null && projectData.contractValue !== undefined ? Number(projectData.contractValue) : null,
    downPayment: projectData.downPayment ? Number(projectData.downPayment) : null,
    downPaymentPercentage: projectData.downPaymentPercentage ? Number(projectData.downPaymentPercentage) : null,
    payment2: projectData.payment2 ? Number(projectData.payment2) : null,
    payment2Percentage: projectData.payment2Percentage ? Number(projectData.payment2Percentage) : null,
    payment3: projectData.payment3 ? Number(projectData.payment3) : null,
    payment3Percentage: projectData.payment3Percentage ? Number(projectData.payment3Percentage) : null,
    payment4: projectData.payment4 ? Number(projectData.payment4) : null,
    payment4Percentage: projectData.payment4Percentage ? Number(projectData.payment4Percentage) : null,
    payment5: projectData.payment5 ? Number(projectData.payment5) : null,
    payment5Percentage: projectData.payment5Percentage ? Number(projectData.payment5Percentage) : null,
    payment6: projectData.payment6 ? Number(projectData.payment6) : null,
    payment6Percentage: projectData.payment6Percentage ? Number(projectData.payment6Percentage) : null,
    preliminaryRetention: projectData.preliminaryRetention ? Number(projectData.preliminaryRetention) : null,
    hoRetention: projectData.hoRetention ? Number(projectData.hoRetention) : null,
    contractualTonnage: projectData.contractualTonnage ? Number(projectData.contractualTonnage) : null,
    engineeringTonnage: projectData.engineeringTonnage ? Number(projectData.engineeringTonnage) : null,
    area: projectData.area ? Number(projectData.area) : null,
    m2PerTon: projectData.m2PerTon ? Number(projectData.m2PerTon) : null,
    paintCoat1Liters: projectData.paintCoat1Liters ? Number(projectData.paintCoat1Liters) : null,
    paintCoat2Liters: projectData.paintCoat2Liters ? Number(projectData.paintCoat2Liters) : null,
    paintCoat3Liters: projectData.paintCoat3Liters ? Number(projectData.paintCoat3Liters) : null,
    paintCoat4Liters: projectData.paintCoat4Liters ? Number(projectData.paintCoat4Liters) : null,
    // Convert Dates to ISO strings
    contractDate: projectData.contractDate ? projectData.contractDate.toISOString() : null,
    downPaymentDate: projectData.downPaymentDate ? projectData.downPaymentDate.toISOString() : null,
    plannedStartDate: projectData.plannedStartDate ? projectData.plannedStartDate.toISOString() : null,
    plannedEndDate: projectData.plannedEndDate ? projectData.plannedEndDate.toISOString() : null,
    actualStartDate: projectData.actualStartDate ? projectData.actualStartDate.toISOString() : null,
    actualEndDate: projectData.actualEndDate ? projectData.actualEndDate.toISOString() : null,
  };

  // Fetch users for dropdowns
  const [projectManagers, salesEngineers] = await Promise.all([
    db.user.findMany({
      where: { 
        status: 'active',
        role: { name: { in: ['Admin', 'Manager'] } }
      },
      select: { id: true, name: true, position: true },
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { 
        status: 'active',
      },
      select: { id: true, name: true, position: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Edit Project <span className="text-primary">#{project.projectNumber}</span> - {project.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Update project information
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>
              Update the fields below to modify the project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectFormFull 
              project={project}
              projectManagers={projectManagers}
              salesEngineers={salesEngineers}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
