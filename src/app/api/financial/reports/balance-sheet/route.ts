import { NextResponse } from 'next/server';
import { FinancialReportService } from '@/lib/financial/report-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const asOf = searchParams.get('as_of');

  if (!asOf) {
    return NextResponse.json({ error: 'as_of date parameter is required' }, { status: 400 });
  }

  try {
    const service = new FinancialReportService();
    const report = await service.getBalanceSheet(asOf);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
