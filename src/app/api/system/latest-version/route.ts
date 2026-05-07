import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'May 7, 2026',
  type: 'minor' as const,
  mainTitle: 'Project Card',
  highlights: [
    'New Project Card page — full project overview with project & building navigation, technical specs, coating, stage durations, and scope aggregation.',
    'Switch projects and buildings using arrow buttons or dropdowns without leaving the page.',
    'Aggregated "All Buildings" view shows combined tonnage, area, and scopes across the entire project.',
  ],
  changes: {
    added: [
      'Project Card page at /projects/[id]/buildings with project selector (dropdown + prev/next arrows) and building tabs (All + per-building + prev/next arrows).',
      'Technical Information section: cranes, third-party inspection, incoterm, welding process/WPS/PQR, NDT, applicable codes.',
      'Coating System section: paint coats, galvanization microns, RAL top-coat colour chip.',
      'Stage Durations section: engineering / operations / site week ranges displayed as visual progress bars.',
      'Aggregated scope view when "All Buildings" selected: groups scopes by type with total quantities.',
      'Buildings Breakdown collapsible card listing all buildings with tonnage, area, and scope badges.',
      '/project-card sidebar shortcut — redirects to first active project\'s card.',
    ],
    fixed: [],
    changed: [
      'Buildings page renamed to "Project Card" in sidebar and page title.',
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
