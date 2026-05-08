import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { FinancialReportService } from '@/lib/financial/report-service';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

  const { searchParams } = new URL(req.url!);
  const fromDate = searchParams.get('from') ?? `${new Date().getFullYear()}-01-01`;
  const toDate   = searchParams.get('to')   ?? new Date().toISOString().slice(0, 10);

  const service = new FinancialReportService();
  const report = await service.getStatementOfAccount(id, 'ap', fromDate, toDate);

  // Attach active payment terms for display in the SoA header
  const termsRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT net_days, discount_days, discount_percentage, valid_from
    FROM sc_supplier_payment_terms
    WHERE supplier_dolibarr_id = ? AND valid_to IS NULL
    LIMIT 1
  `, id);

  const activePaymentTerms = termsRows[0]
    ? {
        net_days: Number(termsRows[0].net_days),
        discount_days: termsRows[0].discount_days != null ? Number(termsRows[0].discount_days) : null,
        discount_percentage: termsRows[0].discount_percentage != null ? Number(termsRows[0].discount_percentage) : null,
        valid_from: termsRows[0].valid_from instanceof Date
          ? termsRows[0].valid_from.toISOString().slice(0, 10)
          : String(termsRows[0].valid_from),
      }
    : null;

  return NextResponse.json({ ...report, activePaymentTerms });
});
