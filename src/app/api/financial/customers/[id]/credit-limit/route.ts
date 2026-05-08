import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import {
  getCustomerCreditLimitHistory,
  createCustomerCreditLimit,
} from '@/lib/services/financial/customer-portal.service';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  credit_limit: z.number().min(0),
  valid_from:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:        z.string().optional().nullable(),
});

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });

  return NextResponse.json(await getCustomerCreditLimitHistory(id));
});

export const POST = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

  const row = await createCustomerCreditLimit(id, {
    ...parsed.data,
    created_by_id: session.userId,
  });
  return NextResponse.json(row, { status: 201 });
});
