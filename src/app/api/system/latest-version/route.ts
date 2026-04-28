import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 28, 2026',
  type: 'patch' as const,
  mainTitle: 'IMS Module Fixes & Quick Guide',
  highlights: [
    'IMS sidebar navigation now appears on all IMS pages — fixed missing ResponsiveLayout wrapper in IMS layout.',
    'Risk Register page no longer loops/refreshes — fixed named-export mismatch that caused the component to render as undefined.',
    'ISO clause and category seed data now loads automatically on server start — add_ims_module.sql and seed_ims_data.sql added to startup migrations.',
    'New document creation page at /ims/documents/new — full form with category, owner, standards, review cycle, and file URL.',
    'New DCR submission page at /ims/change-requests/new — title, priority, document link, reason, and change description.',
    'IMS Quick Guide added — step-by-step reference covering Document Control, DCR lifecycle, Risk Register, Clause Matrix, Review Calendar, and ISO standards.',
  ],
  changes: {
    added: [
      '/ims/documents/new — new document creation page with all fields and auto-number generation',
      '/ims/change-requests/new — new DCR submission page with workflow note',
      '/ims/guide — IMS Quick Guide covering all seven modules with ISO clause reference',
      'Quick Guide added to IMS sidebar navigation',
      'add_ims_module.sql and seed_ims_data.sql registered in startup-migrations.ts so IMS schema and seed data apply on first boot',
    ],
    fixed: [
      'IMS layout.tsx now wraps children in ResponsiveLayout — sidebar was missing on all IMS pages',
      'risks/_page-client.tsx: changed export default to named export to match page import — was causing blank/refresh loop',
    ],
    changed: [
      'Version bumped to 22.0.1',
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
