import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'May 26, 2026',
  type: 'minor' as const,
  mainTitle: 'INV UI Polish + Material Master Enrichment Engine',
  highlights: [
    'Fixed deployment failure: "Too many connections" — app now stops before migrations to free DB connections, then restarts cleanly.',
    'Sidebar navigation added to all /inv pages — the full app sidebar is now visible across every inventory screen.',
    'All INV pages completely redesigned: gradient hero banners, colour-coded KPI cards, polished tables with hover states and category badges.',
    'Material Master Enrichment System: AI-powered product classification and enrichment pipeline for ~5,000 Dolibarr products.',
    '40+ new columns on dolibarr_products: classification, section properties, fastener, welding, unit conversions, web enrichment metadata.',
    'New item_class column with 5 classification tiers for improved Material Master queries.',
  ],
  changes: {
    added: [
      'Material Master Enrichment: AI pipeline classifies and enriches Dolibarr products with section properties, fastener specs, welding specs, and unit conversions.',
      'Material Master: 40+ new schema columns on dolibarr_products (v36_1 migration).',
      'Material Master: new item_class column with 5 classification tiers (STRUCTURAL_SECTION, PLATE_SHEET, PIPE_TUBE, FASTENER, CONSUMABLE).',
      'INV layout.tsx: sidebar now appears on all /inv pages (Dashboard, Stock, MIR-OUT, Returns, Ledger, Settings).',
    ],
    fixed: [
      'Deployment: "Extract and restart application" step was failing with "Schema engine error: Too many connections". The PM2 process is now stopped before migrations run, releasing all DB pool connections, then restarted after.',
    ],
    changed: [
      'INV Dashboard (/inv): gradient hero banner, colour-coded KPI cards with links, improved warehouse chart, quick-action links strip.',
      'INV Stock Levels (/inv/stock): category colour badges, alert-filter dropdown, redesigned slide-over ledger drawer.',
      'INV Ledger (/inv/ledger): filter panel card, colour-coded movement type pills, two-row date/time cells, cleaner pagination.',
      'INV Material Issues (/inv/mir-out): gradient hero, pill status badges, empty-state CTA.',
      'INV Returns (/inv/returns): gradient hero, pill status and type badges, empty-state CTA.',
      'INV Settings (/inv/settings): gradient hero, icon-labelled tabs, active/inactive chip counters, improved CRUD dialogs.',
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
