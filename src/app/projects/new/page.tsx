import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { ProjectForm } from '@/components/project-form-basic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function NewProjectPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  if (!['CEO', 'Admin', 'Manager'].includes(session.role)) {
    redirect('/projects');
  }

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
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
            <p className="text-muted-foreground mt-1">
              Fill in the project details below
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>
              Complete all required fields to create a new project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectForm 
              projectManagers={projectManagers}
              salesEngineers={salesEngineers}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
