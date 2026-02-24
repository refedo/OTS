import { NextResponse } from 'next/server';
import { FinancialReportService } from '@/lib/financial/report-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const thirdpartyId = searchParams.get('thirdparty_id');
  const type = (searchParams.get('type') || 'ar') as 'ar' | 'ap';
  const fromDate = searchParams.get('from') || `${new Date().getFullYear()}-01-01`;
  const toDate = searchParams.get('to') || new Date().toISOString().slice(0, 10);

  if (!thirdpartyId) {
    return NextResponse.json({ error: 'thirdparty_id is required' }, { status: 400 });
  }

  try {
    const service = new FinancialReportService();
    const report = await service.getStatementOfAccount(Number(thirdpartyId), type, fromDate, toDate);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
