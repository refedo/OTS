import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { getSupplierShipmentEvaluations } from '@/lib/services/qc/mir-evaluation.service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

  try {
    const evaluations = await getSupplierShipmentEvaluations(id);
    return NextResponse.json(evaluations);
  } catch (err) {
    logger.error({ err, supplierId: id }, '[MIR Eval] Failed to fetch supplier shipment evaluations');
    return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
  }
});
