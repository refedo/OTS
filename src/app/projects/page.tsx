import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { ProjectsClient } from '@/components/projects-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Wand2 } from 'lucide-react';

export default async function ProjectsPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const canCreate = ['Admin', 'Manager'].includes(session.role);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all your projects
            </p>
          </div>
          {canCreate && (
            <Link href="/projects/wizard">
              <Button>
                <Plus className="size-4 mr-2" />
                Create Project
              </Button>
            </Link>
          )}
        </div>

        {/* Projects List */}
        <ProjectsClient />
      </div>
    </main>
  );
}
