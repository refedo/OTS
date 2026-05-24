import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'May 24, 2026',
  type: 'minor' as const,
  mainTitle: 'Dolibarr Planned Delivery Date Fix',
  highlights: [
    'Fixed: Dolibarr planned delivery date (date_livraison) was always showing as "Not set" in MIRs and the Dolibarr PO modal.',
    'Dolibarr Integration page: PO modal now fetches full PO detail on click — delivery date shows correctly.',
    'MIR creation: planned delivery date is now fetched from the Dolibarr detail endpoint before the MIR is written, so it is always persisted correctly.',
    'Sync Delivery Dates: improved guard handles date_livraison returned as string "0" from the API.',
  ],
  changes: {
    added: [],
    fixed: [
      'Dolibarr planned delivery date (date_livraison) displayed as "—" / "Not set" — the list endpoint returns 0 even when the date is set; now fetches full PO detail on demand.',
      'MIR plannedDeliveryDate always null on creation — now resolved by fetching the PO detail endpoint after user selects a PO.',
      'sync-delivery-dates: date_livraison "0" string no longer triggers a bogus epoch update.',
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
