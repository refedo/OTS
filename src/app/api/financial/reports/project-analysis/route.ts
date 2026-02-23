import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { FinancialReportService } from '@/lib/financial/report-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
