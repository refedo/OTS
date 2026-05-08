import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { getSupplierOverview } from '@/lib/services/supply-chain/supplier-portal.service';

export const dynamic = 'force-dynamic';

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

  const overview = await getSupplierOverview(id);
  if (!overview) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  return NextResponse.json(overview);
});
