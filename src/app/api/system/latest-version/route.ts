import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔄 Backup Restore System & Financial Module Enhancements',
  highlights: [
    'Restore the database from any backup directly in the UI — full or partial restore by module, no server access needed',
    'Impact preview shows Current / Backup / ±Change row counts per module before confirming',
    '14 backup modules covering all 96+ tables, including the new Financial & Accounts module',
    'Chart of Accounts: CSV/XLSX import, mass delete, rollback, and force-replace Dolibarr sync',
    'SOA "Remain to Pay" column, VAT report excludes abandoned invoices, salaries Excel export, cost structure drill-down',
  ],
  changes: {
    added: [
      {
        title: 'Backup Restore System',
        items: [
          'Restore database from any backup at /settings/backups — no SSH required',
          'Partial restore by module: select any of 14 modules instead of restoring everything',
          'Impact preview: parses backup SQL (supports .sql.gz) and compares with live row counts from information_schema',
          'New backups.restore permission in Backup Management category, granted to Admin by default',
          'src/lib/backup-modules.ts — central module→tables config shared between API and UI',
        ],
      },
      {
        title: 'Financial & Accounts Backup Module',
        items: [
          'All 16 fin_* tables now restorable as a dedicated "Financial & Accounts" module',
          'Includes fin_chart_of_accounts, fin_journal_entries, fin_invoices, fin_payments, fin_salaries, fin_supplier_classification, fin_product_coa_mapping, fin_config',
        ],
      },
      {
        title: 'Chart of Accounts Management',
        items: [
          'CSV upload: import accounts from a CSV file with live validation and error reporting',
          'XLSX upload: Excel spreadsheet import with column detection and preview',
          'Mass delete: select and permanently remove multiple accounts at once',
          'COA rollback: restore a previous state of the chart of accounts from a snapshot',
          'Force replace: overwrite existing accounts during Dolibarr sync instead of skipping conflicts',
        ],
      },
      'Synced By column in COA sync history; system events logged for each financial sync run',
      'SOA: sortable columns and new "Remain to Pay" column',
      'Salaries: Excel export button',
      'Cost structure: drill-down view showing line-item detail per category',
      'Supplier Classification: bulk selection and "Save All" for batch commits',
    ],
    fixed: [
      'BigInt serialization in fin_* COA mapping APIs returning crash instead of string',
      'created_by column type mismatch on fin_* tables — INT column holding UUID removed',
      'COA accounts not appearing in product/supplier mapping dropdowns',
      'Dolibarr sync: product search returning stale results',
      'VAT report incorrectly including abandoned invoices in totals',
      'package-lock.json missing uuid@11.1.0 — caused npm ci failure in CI',
    ],
    changed: [],
  },
};

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  let alreadySeen = false;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { customPermissions: true },
      });
      const perms = user?.customPermissions as Record<string, unknown> | null;
      if (perms?.lastSeenVersion === CURRENT_VERSION.version) {
        alreadySeen = true;
      }
    } catch {
      // Non-critical; fall back to client-side check
    }
  }

  return NextResponse.json({ ...CURRENT_VERSION, alreadySeen });
}
