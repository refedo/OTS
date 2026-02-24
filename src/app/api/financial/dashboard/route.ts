import { NextResponse } from 'next/server';
import { FinancialReportService } from '@/lib/financial/report-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const fromYear = searchParams.get('fromYear') || searchParams.get('year') || new Date().getFullYear().toString();
  const toYear = searchParams.get('toYear') || fromYear;
  const from = `${fromYear}-01-01`;
  const to = `${toYear}-12-31`;

  try {
    const service = new FinancialReportService();
    const summary = await service.getDashboardSummary(from, to);
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
