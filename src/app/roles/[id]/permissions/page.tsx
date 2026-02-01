import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import db from '@/lib/db';
import { PermissionMatrix } from '@/components/permission-matrix';
import { ModuleRestrictionsClient } from '@/components/module-restrictions-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Shield, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { checkPermission } from '@/lib/permission-checker';

export default async function RolePermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Check if user has permission to manage permissions
  // Temporarily disabled to allow initial setup
  // const canManage = await checkPermission('roles.manage_permissions');
  // if (!canManage) {
  //   redirect('/roles');
  // }

  // Fetch the role
  const role = await db.role.findUnique({
    where: { id },
  });

  if (!role) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/roles">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Permissions & Access</h1>
            <p className="text-muted-foreground mt-1">
              Configure permissions and module restrictions for <span className="font-medium">{role.name}</span> role
            </p>
          </div>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue="permissions" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="restrictions" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Module Restrictions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  Select the permissions that users with this role should have
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionMatrix role={role} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Module Access Restrictions</CardTitle>
                <CardDescription>
                  Restrict access to sensitive modules for admin-level roles. This allows you to create roles with full admin permissions
                  except for specific modules like financial data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ModuleRestrictionsClient role={role} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
