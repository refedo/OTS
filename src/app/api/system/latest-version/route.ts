import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '⚖️ LCR Comparison Fix, PTS Weight Verification & Scope of Work',
  highlights: [
    'LCR comparison table now correctly shows Supplier, Price, and Tonnage Rate — amount/supplier were swapped',
    'PTS Sync results now show synced weight per building and project with verification table',
    'PTS Sync automatically sets scope of work to "Steel" for all synced parts',
    'Weight sorting already available in the assembly parts table',
  ],
  changes: {
    added: [
      'PTS Sync: weight totals per building and project in sync results',
      'PTS Sync: weight verification card after sync for reviewing numbers before accepting',
      'PTS Sync: scope of work automatically set to "Steel" for all synced assembly parts',
      'PTS Sync: per-building weight breakdown in project stats table',
    ],
    fixed: [
      'LCR comparison: supplier and amount column indices were swapped — now correctly maps Amount→col24, Supplier→col25, Price/Ton→col26 per LCR group',
      'LCR comparison: stale DB-saved column mapping auto-detected and discarded so corrected defaults take effect',
      'LCR comparison: table headers updated to "Supplier / Price / Tonnage Rate"',
    ],
    changed: [
      'PTS Sync results: project stats table now includes weight column and per-building rows',
      'PTS Sync results: grand total row added for parts, logs, and weight',
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
