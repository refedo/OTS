import { NextResponse } from 'next/server';
import { FinancialReportService } from '@/lib/financial/report-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') || 'ar') as 'ar' | 'ap';
  const asOf = searchParams.get('as_of') || new Date().toISOString().slice(0, 10);

  try {
    const service = new FinancialReportService();
    const report = await service.getAgingReport(type, asOf);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
