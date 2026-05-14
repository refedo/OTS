import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import { updateSupplierPaymentTerm, deleteSupplierPaymentTerm } from '@/lib/services/supply-chain/supplier-portal.service';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  net_days:             z.number().int().min(0).max(365).optional(),
  discount_days:        z.number().int().min(0).optional().nullable(),
  discount_percentage:  z.number().min(0).max(100).optional().nullable(),
  valid_from:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valid_to:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes:                z.string().optional().nullable(),
});

export const PUT = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supplierId = parseInt(ctx?.params?.id ?? '', 10);
  const termId     = parseInt(ctx?.params?.termId ?? '', 10);
  if (isNaN(supplierId) || isNaN(termId)) return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

  await updateSupplierPaymentTerm(termId, supplierId, parsed.data);
  return NextResponse.json({ success: true });
});

export const DELETE = withApiContext(async (_req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supplierId = parseInt(ctx?.params?.id ?? '', 10);
  const termId     = parseInt(ctx?.params?.termId ?? '', 10);
  if (isNaN(supplierId) || isNaN(termId)) return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });

  await deleteSupplierPaymentTerm(supplierId, termId);
  return NextResponse.json({ success: true });
});
