import { NextResponse } from 'next/server';
import { FinancialReportService } from '@/lib/financial/report-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const service = new FinancialReportService();
    const data = await service.getCoAHierarchy();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
