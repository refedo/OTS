import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import BankTransactionsPage from './_page-client';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;
  return <BankTransactionsPage bankId={parseInt(id, 10)} />;
}
