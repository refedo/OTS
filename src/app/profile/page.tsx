import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission } from '@/lib/permission-checker';
import { UserCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Profile' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.viewOwn');
  if (!canView) redirect('/unauthorized?from=/profile');

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { employeeId: true },
  });

  if (!user?.employeeId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-sky-100 rounded-full">
              <UserCircle2 className="h-12 w-12 text-sky-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Account Not Linked</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your OTS account is not yet linked to an employee record.
            Please contact HR to have your account linked to your employee profile.
          </p>
          <p className="text-xs text-slate-400">
            Account: <span className="font-medium text-slate-600">{session.name}</span>
          </p>
        </div>
      </div>
    );
  }

  redirect(`/hr/employees/${user.employeeId}`);
}
