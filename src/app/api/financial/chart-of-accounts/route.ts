import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const accounts = await prisma.$queryRawUnsafe(
      `SELECT * FROM fin_chart_of_accounts ORDER BY display_order, account_code`
    );
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const { account_code, account_name, account_name_ar, account_type, account_category, parent_code, display_order, notes } = body;

    if (!account_code || !account_name || !account_type) {
      return NextResponse.json({ error: 'account_code, account_name, and account_type are required' }, { status: 400 });
    }

    // Check uniqueness
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM fin_chart_of_accounts WHERE account_code = ?`, account_code
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Account code already exists' }, { status: 409 });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO fin_chart_of_accounts (account_code, account_name, account_name_ar, account_type, account_category, parent_code, display_order, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      account_code, account_name, account_name_ar || null, account_type,
      account_category || null, parent_code || null, display_order || 0, notes || null
    );

    systemEventService.log({
      eventType: 'FIN_CHART_ACCOUNT_CREATED',
      eventCategory: 'FINANCIAL',
      severity: 'INFO',
      userId: auth.session.sub,
      userName: auth.session.name,
      entityType: 'ChartAccount',
      entityId: account_code,
      entityName: account_name,
      summary: `Chart account created: ${account_code} - ${account_name}`,
      details: { account_code, account_name, account_type },
    }).catch((err: unknown) => logger.error({ err }, '[chart-of-accounts] Failed to log FIN_CHART_ACCOUNT_CREATED'));

    return NextResponse.json({ success: true, message: 'Account created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
