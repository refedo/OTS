import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect, notFound } from 'next/navigation';
import db from '@/lib/db';
import { UserEditForm } from '@/components/user-edit-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch the user to edit
  const user = await db.user.findUnique({
    where: { id: params.id },
    include: {
      role: true,
      department: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Fetch roles, departments, and potential managers for the form
  const [roles, departments, managers] = await Promise.all([
    db.role.findMany({
      orderBy: { name: 'asc' },
    }),
    db.department.findMany({
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, role: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-8 max-lg:pt-20 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
            <p className="text-muted-foreground mt-1">
              Update user information and permissions
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Update the details below to modify the user account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserEditForm user={user} roles={roles} departments={departments} managers={managers} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
