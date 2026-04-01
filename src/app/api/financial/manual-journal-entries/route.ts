import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const lineSchema = z.object({
  account_code: z.string().min(1).max(20),
  label: z.string().max(500).default(''),
  debit: z.number().min(0),
  credit: z.number().min(0),
});

const createSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'entry_date must be YYYY-MM-DD'),
  journal_code: z.string().min(1).max(10).default('OD'),
  reference: z.string().min(1).max(100),
  lines: z.array(lineSchema).min(2),
});

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const rows: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        je.piece_num,
        je.entry_date,
        je.journal_code,
        MIN(je.source_ref) as reference,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id', je.id,
            'account_code', je.account_code,
            'account_name', COALESCE(coa.account_name, je.account_code),
            'label', je.label,
            'debit', je.debit,
            'credit', je.credit
          )
          ORDER BY je.id
        ) as lines_json,
        SUM(je.debit) as total_debit,
        SUM(je.credit) as total_credit,
        COUNT(*) as line_count
      FROM fin_journal_entries je
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE je.is_locked = 1
      GROUP BY je.piece_num, je.entry_date, je.journal_code
      ORDER BY je.entry_date DESC, je.piece_num DESC
    `);

    const entries = (rows as Record<string, unknown>[]).map((row) => ({
      piece_num: Number(row.piece_num),
      entry_date: row.entry_date,
      journal_code: row.journal_code,
      reference: row.reference,
      total_debit: Number(row.total_debit),
      total_credit: Number(row.total_credit),
      line_count: Number(row.line_count),
      lines: (() => {
        try {
          return JSON.parse(`[${row.lines_json}]`);
        } catch {
          return [];
        }
      })(),
    }));

    return NextResponse.json({ entries });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch manual journal entries');
    return NextResponse.json({ error: 'Failed to fetch manual journal entries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { entry_date, journal_code, reference, lines } = parsed.data;

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json(
      { error: `Journal entry is not balanced: debits ${totalDebit.toFixed(2)} ≠ credits ${totalCredit.toFixed(2)}` },
      { status: 400 },
    );
  }

  try {
    // Use a piece_num that won't collide with auto-generated entries: prefix 9000000+
    const maxRow: unknown[] = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX(piece_num), 9000000) as max_pn FROM fin_journal_entries WHERE is_locked = 1`
    );
    const nextPieceNum = Number((maxRow as Record<string, unknown>[])[0]?.max_pn ?? 9000000) + 1;

    for (const line of lines) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO fin_journal_entries
          (entry_date, journal_code, piece_num, account_code, label, debit, credit,
           source_type, source_id, source_ref, thirdparty_id, currency_code, is_locked)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', 0, ?, NULL, 'SAR', 1)
      `,
        entry_date, journal_code, nextPieceNum,
        line.account_code, line.label,
        line.debit, line.credit,
        reference,
      );
    }

    logger.info({ piece_num: nextPieceNum, reference, lines: lines.length }, 'Manual journal entry created');
    return NextResponse.json({ success: true, piece_num: nextPieceNum }, { status: 201 });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to create manual journal entry');
    return NextResponse.json({ error: 'Failed to create manual journal entry' }, { status: 500 });
  }
}
