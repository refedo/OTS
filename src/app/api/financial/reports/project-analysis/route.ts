import { NextResponse } from 'next/server';
import { FinancialReportService } from '@/lib/financial/report-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const projectId = searchParams.get('projectId');

  try {
    const service = new FinancialReportService();
    const report = await service.getProjectAnalysis(
      from,
      to,
      projectId ? parseInt(projectId, 10) : undefined
    );
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('[Project Analysis] Error:', error.message);
    // Check for common issues
    if (error.message?.includes("doesn't exist") || error.message?.includes('dolibarr_projects')) {
      return NextResponse.json({ 
        error: 'Project data not available. Please run a full financial sync first to populate the dolibarr_projects table.',
        details: error.message 
      }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
