import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🏭 Assembly Parts Editing, LCR Numeric Sort & Pagination',
  highlights: [
    'LCR SN column now sorts numerically (1, 2, 3…) instead of as text (1, 10, 100…)',
    'LCR pagination now has First/Last page buttons for quick navigation',
    'Assembly parts table shows weight (kg) column with sorting support',
    'Parts upload summary now shows total weight and individual failed part details',
    'Assembly part detail page has a new Edit button to modify part properties inline',
  ],
  changes: {
    added: [
      'Assembly parts table: Weight (kg) column with sort support and locale-formatted numbers',
      'Assembly part detail: Edit button opens a dialog to modify all part properties (marks, quantity, profile, grade, dimensions, weights, area)',
      'Assembly part detail: PUT API endpoint for updating part fields',
      'Parts upload summary: total weight displayed prominently with tons conversion after successful upload',
      'Parts upload summary: failed parts section now shows part identifier (assembly mark / part designation / name) and formatted error details',
      'LCR pagination: First page and Last page buttons added to both top and bottom pagination bars',
    ],
    fixed: [
      'LCR SN column sorting: now uses numeric cast (CAST AS UNSIGNED) in raw SQL so entries sort as 1, 2, 3… instead of 1, 10, 100…',
    ],
    changed: [
      'LCR list query uses two-phase approach (raw SQL for sorted IDs, then Prisma for full data) when sorting by SN to ensure correct numeric ordering',
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
