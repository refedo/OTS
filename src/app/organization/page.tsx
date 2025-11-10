import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { buildHierarchyTree } from '@/lib/hierarchy';
import { OrganizationChartViews } from '@/components/organization-chart-views';

export default async function OrganizationPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Build the organization hierarchy tree
  const hierarchy = await buildHierarchyTree();

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Chart</h1>
          <p className="text-muted-foreground mt-1">
            View the company hierarchy and reporting structure
          </p>
        </div>

        {/* Organization Chart with View Switcher */}
        <OrganizationChartViews hierarchy={hierarchy} />
      </div>
    </main>
  );
}
