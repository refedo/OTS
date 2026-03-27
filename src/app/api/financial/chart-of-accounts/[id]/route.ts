import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const body = await req.json();
    const { account_code, account_name, account_name_ar, account_type, account_category, parent_code, display_order, notes, is_active } = body;

    await prisma.$executeRawUnsafe(
      `UPDATE fin_chart_of_accounts SET
       account_code = COALESCE(?, account_code),
       account_name = COALESCE(?, account_name),
       account_name_ar = ?,
       account_type = COALESCE(?, account_type),
       account_category = ?,
       parent_code = ?,
       display_order = COALESCE(?, display_order),
       notes = ?,
       is_active = COALESCE(?, is_active),
       updated_at = NOW()
       WHERE id = ?`,
      account_code || null, account_name || null, account_name_ar ?? null,
      account_type || null, account_category ?? null, parent_code ?? null,
      display_order ?? null, notes ?? null, is_active ?? null, parseInt(id)
    );

    systemEventService.log({
      eventType: 'FIN_CHART_ACCOUNT_UPDATED',
      eventCategory: 'FINANCIAL',
      severity: 'INFO',
      userId: auth.session.sub,
      userName: auth.session.name,
      entityType: 'ChartAccount',
      entityId: id,
      summary: `Chart account updated: ${account_code ?? id}`,
      details: { id, account_code, account_name },
    }).catch((err: unknown) => logger.error({ err }, '[chart-of-accounts/id] Failed to log FIN_CHART_ACCOUNT_UPDATED'));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    // Soft delete
    await prisma.$executeRawUnsafe(
      `UPDATE fin_chart_of_accounts SET is_active = 0, updated_at = NOW() WHERE id = ?`,
      parseInt(id)
    );

    systemEventService.log({
      eventType: 'FIN_CHART_ACCOUNT_DELETED',
      eventCategory: 'FINANCIAL',
      severity: 'INFO',
      userId: auth.session.sub,
      userName: auth.session.name,
      entityType: 'ChartAccount',
      entityId: id,
      summary: `Chart account deactivated: ${id}`,
      details: { id },
    }).catch((err: unknown) => logger.error({ err }, '[chart-of-accounts/id] Failed to log FIN_CHART_ACCOUNT_DELETED'));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
