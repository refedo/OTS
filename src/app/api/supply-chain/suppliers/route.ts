import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import { getSupplierList } from '@/lib/services/supply-chain/supplier-portal.service';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  search: z.string().optional(),
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
});

export const GET = withApiContext(async (req, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url!);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

  const { search, page, limit } = parsed.data;
  const result = await getSupplierList(search ?? null, page, limit);
  return NextResponse.json(result);
});
