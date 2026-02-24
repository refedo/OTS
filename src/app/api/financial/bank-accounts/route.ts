import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const accounts = await prisma.$queryRawUnsafe(
      `SELECT * FROM fin_bank_accounts ORDER BY label`
    );
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
