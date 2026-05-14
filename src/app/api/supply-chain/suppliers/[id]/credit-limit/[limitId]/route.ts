import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { deleteSupplierCreditLimit } from '@/lib/services/supply-chain/supplier-portal.service';

export const dynamic = 'force-dynamic';

export const DELETE = withApiContext(async (_req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supplierId = parseInt(ctx?.params?.id ?? '', 10);
  const limitId    = parseInt(ctx?.params?.limitId ?? '', 10);
  if (isNaN(supplierId) || isNaN(limitId)) return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });

  await deleteSupplierCreditLimit(supplierId, limitId);
  return NextResponse.json({ success: true });
});
