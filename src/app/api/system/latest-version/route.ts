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
  mainTitle: 'IMS Sidebar, Workflow Fix & Seed Repair',
  highlights: [
    'Workflow definition save (edit mode) no longer shows "Invalid input" — fixed Zod schema to accept null conditions.',
    'IMS Quick Guide now appears in sidebar — added /ims/guide to navigation-permissions.ts.',
    'All IMS pages now have an IMS Dashboard back-link in the breadcrumb area.',
    'IMS seed SQL workflow section rewritten with correct column names (key, sequence, approverResolver) — seed data will now apply correctly on server restart.',
    'Added /ims/change-requests/new to navigation permissions so the route is accessible.',
  ],
  changes: {
    added: [
      '/ims/guide added to NAVIGATION_PERMISSIONS with null (open to any logged-in user)',
      '/ims/change-requests/new added to NAVIGATION_PERMISSIONS',
      'IMS Dashboard back-link breadcrumb added to all IMS pages (documents, change-requests, clause-matrix, review-calendar, risks, risk matrix, treatments, risk detail, document detail)',
    ],
    fixed: [
      'Workflow steps PUT API: conditions schema changed from .optional() to .optional().nullable() — null conditions from the form no longer cause "Invalid input"',
      'Workflow definitions POST API: same nullable fix applied',
      'seed_ims_data.sql workflow section: rewrote INSERT statements to use correct column names (key, sequence, approverResolver, entityType) instead of old names (code, stepOrder, approverRole)',
    ],
    changed: [
      'Version bumped to 22.0.2',
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
