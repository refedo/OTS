import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '📋 Payment Schedule Enhancements',
  highlights: [
    'Sortable columns — all table headers in the Payment Schedule Report now sort rows ascending/descending',
    'Partial payment receipts — record multiple partial receipts per payment term with running balance, progress bar, and percentage',
    'Task linkage — pin a payment term to a project task; green checkmark appears when the task is completed & approved',
    'Monthly Forecast Card — select any month to see total forecasted collections and an expandable breakdown',
    'Cash Flow Forecast drill-down — monthly rows now expandable to show which payment schedule entries drive each month's figures',
  ],
  changes: {
    added: [
      'Sortable table headers in Payment Schedule Report (project, client, slot, amount, received, balance, due date, status, action)',
      {
        title: 'Partial Payment Receipts',
        items: [
          'New ProjectPaymentReceipt model — stores individual receipts per schedule entry',
          'Edit drawer receipt history with per-receipt delete; receivedAmount auto-aggregated on the parent schedule',
          'Status auto-advances to partially_received when any receipt is recorded',
          'Table shows received amount, balance, and visual progress bar with percentage',
          'POST / DELETE /api/financial/payment-schedule-report/[id]/receipts',
        ],
      },
      {
        title: 'Task Linkage',
        items: [
          'Pin any payment term to a project task via the edit drawer (savedas linkedTaskId)',
          'Green checkmark in the Slot column when linked task is completed & approved — payment claimable',
          'Grey link icon shown when the task is still in progress',
        ],
      },
      {
        title: 'Monthly Forecast Card (Payment Schedule page)',
        items: [
          'Month selector — past 2 months + next 12 months',
          'Displays total forecasted collections for the selected month',
          'Expandable breakdown table with amount, received, balance, due date, and status per term',
        ],
      },
      {
        title: 'Cash Flow Forecast Monthly Drill-Down',
        items: [
          '13-week weeks grouped into calendar months — collections, payments, net flow per month',
          'Expandable month rows fetch matching payment schedule entries (cached per month)',
        ],
      },
    ],
    fixed: [],
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
