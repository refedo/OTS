import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 29, 2026',
  type: 'patch' as const,
  mainTitle: 'Search, Payment Sync, Date-Range Reports & CEO Board',
  highlights: [
    'Global search now finds customers, suppliers, invoice numbers, payment references, and customer/supplier codes.',
    'Payments deleted in Dolibarr are now automatically removed from OTS on next sync — financial reports no longer show stale data.',
    'Monthly Financial Report supports date ranges (e.g. January → April) instead of a single month only.',
    'CEO Tasks from the main task system appear directly on the Brainstorm Board with an inline "Done" button.',
  ],
  changes: {
    added: [
      'Global search: customers, suppliers, customer invoices, supplier invoices, and payments added as result categories',
      'Monthly Financial Report: "From / To" month+year selectors for multi-month range reporting',
      'CEO Tasks panel on Brainstorm Board — shows active tasks assigned to or created by the CEO with inline Mark Complete',
      'GET /api/ceo-arena/tasks — endpoint returning active CEO tasks (isCeoTask flag or assigned to/created by Walid Dami)',
    ],
    fixed: [
      'Payment deletion sync: payments deleted in Dolibarr now deleted from OTS fin_payments on the next invoice sync — applies to syncCustomerInvoices, syncSupplierInvoices, and syncAllPayments',
    ],
    changed: [
      'Version bumped to 22.4.1',
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
