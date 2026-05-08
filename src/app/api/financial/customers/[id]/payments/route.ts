import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import { getCustomerPayments } from '@/lib/services/financial/customer-portal.service';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(20),
});

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });

  const { searchParams } = new URL(req.url!);
  const { data } = querySchema.safeParse(Object.fromEntries(searchParams));
  const { page, limit } = data ?? { page: 1, limit: 20 };

  return NextResponse.json(await getCustomerPayments(id, page, limit));
});
