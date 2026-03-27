import { redirect } from 'next/navigation';
import { checkPermission } from '@/lib/permission-checker';
import CronJobsPageClient from './_page-client';

export default async function CronJobsPage() {
  const hasAccess = await checkPermission('settings.view_cron');
  if (!hasAccess) {
    redirect('/unauthorized?from=/settings/cron-jobs');
  }
  return <CronJobsPageClient />;
}

export const metadata = {
  title: 'Cron Jobs | OTS Settings',
};
