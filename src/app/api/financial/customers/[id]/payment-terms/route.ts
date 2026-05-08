import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import {
  getCustomerPaymentTermsHistory,
  createCustomerPaymentTerms,
} from '@/lib/services/financial/customer-portal.service';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  net_days:             z.number().int().min(0).max(365),
  discount_days:        z.number().int().min(0).optional().nullable(),
  discount_percentage:  z.number().min(0).max(100).optional().nullable(),
  valid_from:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:                z.string().optional().nullable(),
});

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });

  return NextResponse.json(await getCustomerPaymentTermsHistory(id));
});

export const POST = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

  const term = await createCustomerPaymentTerms(id, {
    ...parsed.data,
    created_by_id: session.userId,
  });
  return NextResponse.json(term, { status: 201 });
});
