import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import VatPaymentsPage from './_page-client';

export default async function Page() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;
  return <VatPaymentsPage />;
}
