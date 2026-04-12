import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { checkPermission } from '@/lib/permission-checker';
import { AgencyForm } from '@/components/hr/agency-form';

export default async function NewAgencyPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');
  if (!(await checkPermission('hr.agency.manage'))) redirect('/unauthorized?from=/hr/agencies/new');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">New Agency</h1>
      <AgencyForm initial={null} />
    </div>
  );
}
