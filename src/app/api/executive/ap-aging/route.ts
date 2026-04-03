import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { FinancialReportService } from '@/lib/financial/report-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = withApiContext(async (_req: NextRequest, _session) => {
  const hasAccess = await checkPermission('executive.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const service = new FinancialReportService();
    const today = new Date().toISOString().slice(0, 10);
    const report = await service.getAgingReport('ap', today);

    return NextResponse.json({
      data: {
        buckets: report.totals,
        rows: report.rows.map(r => ({
          thirdpartyName: r.thirdpartyName,
          invoiceCount: r.invoices.length,
          current: r.buckets.current,
          days1to30: r.buckets.days1to30,
          days31to60: r.buckets.days31to60,
          days61to90: r.buckets.days61to90,
          days90plus: r.buckets.days90plus,
          total: r.buckets.total,
        })),
      },
    });
  } catch (error) {
    logger.error({ error }, '[Executive] Failed to fetch AP aging');
    return NextResponse.json({ error: 'Failed to fetch AP aging' }, { status: 500 });
  }
});
