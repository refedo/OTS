import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const accountCode = searchParams.get('account_code');
  const journalCode = searchParams.get('journal_code');
  const sourceType = searchParams.get('source_type');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  try {
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (from) { where += ' AND je.entry_date >= ?'; params.push(from); }
    if (to) { where += ' AND je.entry_date <= ?'; params.push(to); }
    if (accountCode) { where += ' AND je.account_code = ?'; params.push(accountCode); }
    if (journalCode) { where += ' AND je.journal_code = ?'; params.push(journalCode); }
    if (sourceType) { where += ' AND je.source_type = ?'; params.push(sourceType); }

    const countRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM fin_journal_entries je ${where}`, ...params
    );
    const total = Number(countRows[0]?.cnt || 0);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT je.*, coa.account_name, coa.account_type
       FROM fin_journal_entries je
       LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
       ${where}
       ORDER BY je.entry_date DESC, je.piece_num, je.id
       LIMIT ${limit} OFFSET ${offset}`,
      ...params
    );

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
