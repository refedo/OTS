import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { ProjectsClient } from '@/components/projects-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Upload, FolderKanban } from 'lucide-react';
import { getCurrentUserRestrictedModules, checkPermission } from '@/lib/permission-checker';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Projects',
};


export default async function ProjectsPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const canCreate = await checkPermission('projects.create');
  const canImportExport = await checkPermission('projects.import_export');
  const restrictedModules = await getCurrentUserRestrictedModules();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 max-lg:pt-20 space-y-6">

        {/* Hero Banner */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Projects</h1>
              </div>
              <p className="text-sky-100 text-sm">Manage and track all steel fabrication projects</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canImportExport && (
                <Link href="/projects/migration">
                  <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
                    <Upload className="size-4 mr-2" />
                    Import/Export
                  </Button>
                </Link>
              )}
              {canCreate && (
                <Link href="/projects/wizard">
                  <Button className="bg-white text-sky-700 hover:bg-sky-50 font-semibold">
                    <Plus className="size-4 mr-2" />
                    New Project
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Projects List with KPI tiles */}
        <ProjectsClient restrictedModules={restrictedModules} />
      </div>
    </div>
  );
}
