import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '💰 Payment Schedule Report',
  highlights: [
    'Payment Schedule Report — consolidated view of all payment terms and retention amounts across every project in one financial report',
    'Link each payment term to a synced Dolibarr invoice with amount and paid status',
    'Assign due dates, event triggers (milestone, delivery, drawing approval) and actions (issue invoice, collection call, stop/proceed shipping) per payment slot',
    'Monthly cash flow timeline groups pending collections for financial forecasting',
  ],
  changes: {
    added: [
      {
        title: 'Payment Schedule Report (/financial/reports/payment-schedule)',
        items: [
          'Aggregates all 6 payment slots + Preliminary and HO retention amounts from every project into one table',
          'Summary cards: Total Scheduled, Collected, Pending, Overdue (SAR)',
          'Filter by project, status, due date range, action required, and trigger type',
          'Invoice linking: searchable dropdown of synced Dolibarr invoices with ref, amount, and paid status',
          'Trigger types: Date, Milestone, Delivery, Drawing Approval, Manual',
          'Action required: Issue Invoice, Collection Call, Stop Shipping, Proceed Shipping, On Hold, No Action — with free-text notes',
          'Status tracking: Pending → Triggered → Invoiced → Collected; auto-overdue when due date passes',
          'Cash flow timeline: collapsible monthly grouping of pending rows for inflow forecasting',
          'Edit drawer per row — enrich any payment term without leaving the report',
          'Access-controlled: financial.view (read) / financial.manage (edit)',
        ],
      },
      'ProjectPaymentSchedule Prisma model — non-destructive enrichment overlay on existing project payment fields, keyed by (projectId, paymentSlot)',
      'GET/POST /api/financial/payment-schedule-report and PUT/DELETE /api/financial/payment-schedule-report/[id]',
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
