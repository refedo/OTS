import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { RoleCreateForm } from '@/components/role-create-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { checkPermission } from '@/lib/permission-checker';

export default async function CreateRolePage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Check if user has permission to create roles
  // Temporarily disabled to allow initial setup
  // const canCreate = await checkPermission('roles.create');
  // if (!canCreate) {
  //   redirect('/roles');
  // }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/roles">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Role</h1>
            <p className="text-muted-foreground mt-1">
              Add a new role to the system
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
            <CardDescription>
              Fill in the details below to create a new role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoleCreateForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
