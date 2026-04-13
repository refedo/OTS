import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { PayrollPeriodsClient } from '@/components/hr/payroll-periods-client';

export const metadata: Metadata = { title: 'Payroll' };

export default async function PayrollPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  if (!perms.includes('hr.payroll.view')) {
    redirect('/unauthorized?from=/hr/payroll');
  }

  return (
    <PayrollPeriodsClient
      canCalculate={perms.includes('hr.payroll.calculate')}
      canApprove={perms.includes('hr.payroll.approve')}
      canLock={perms.includes('hr.payroll.lock')}
      canExport={perms.includes('hr.payroll.export')}
      canSync={
        perms.includes('hr.employee.sync') && perms.includes('hr.leaves.sync')
      }
    />
  );
}
