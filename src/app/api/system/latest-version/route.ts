import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 19, 2026',
  type: 'minor' as const,
  mainTitle: 'Four HR & Payroll UX Improvements',
  highlights: [
    'Delete payroll periods — remove DRAFT or CALCULATED periods directly from the payroll table with a single click and confirmation.',
    'Employee form locked by default — employee records open in read-only mode. Click Edit to make changes; Cancel reverts and re-locks the form.',
    'Employee navigation — use the arrow buttons on any employee page to move alphabetically through your team, with a position counter showing where you are.',
    'Leaves "All" tab + search — HR users land on the All tab by default and can instantly filter requests by employee name, ID, leave type, or status.',
  ],
  changes: {
    added: [],
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
