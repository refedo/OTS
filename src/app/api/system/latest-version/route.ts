import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '💰 Payment Schedule Enhancements & MIR UX Fixes',
  highlights: [
    'Payment schedule summary cards are now clickable — tap Collected, Pending, or Overdue to filter the table instantly',
    'Cash Flow Timeline shows the selected month\'s collected/expected totals when you click a bar',
    'Table footer now shows total Amount, Received, and Remaining across all visible rows',
    'Monthly Cash Forecast prev/next arrows for quick month navigation',
    'New Payment Schedule widget available on the CEO dashboard',
    'Project tracker now defaults to "Active" view with icons on all filter tabs',
    'Material Inspection Receipt dialogs are now full-width and scrollable on all screen sizes',
    'MIR inspect form shows a warning when Received Qty exceeds the PO ordered quantity',
  ],
  changes: {
    added: [
      'Payment schedule: clickable summary cards with filter ring highlighting',
      'Cash Flow Timeline: header totals update to selected month when a bar is clicked',
      'Payment schedule: table totals footer (Amount, Received, Remaining)',
      'Monthly Cash Forecast: ‹ › navigation arrows',
      'PaymentScheduleWidget for CEO dashboard',
      'Project tracker: Active tab with ⚡ icon, defaults to Active view',
    ],
    fixed: [
      'Migration SQL: correct table name system_settings (was SystemSettings)',
      'Cash In/Out drilldown modal expanded for full readability',
      'MIR dialogs: full-width flex layout, no more clipped content on mobile',
      'MIR inspect form: Received Qty max validation with inline warning',
    ],
    changed: [
      'Project tracker default filter changed from All to Active',
    ],
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
