import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT config_key, config_value, description FROM fin_config ORDER BY config_key`
    );
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.config_key] = row.config_value || '';
    }
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO fin_config (config_key, config_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()`,
        key, String(value), String(value)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
