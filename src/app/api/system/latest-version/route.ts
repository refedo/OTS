import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 24, 2026',
  type: 'major' as const,
  mainTitle: 'Business Development Module',
  highlights: [
    'New top-level Business Development section for tracking target companies, registration status, submitted documents, and received RFQs/Inquiries.',
    'Full company registry with registration status (Registered, In Progress, Not Started, Closed/Inactive), contact details, and requirements tracking.',
    'Document archive per company — log every submitted document with status badges (Submitted, Pending, Approved, Rejected).',
    'Requests tracker for RFQs and Inquiries received from each company with status pipeline (New → In Review → In Progress → Closed).',
    'Company archive with four structured sections: General Information, Communication History, Notes, and Evaluation History.',
  ],
  changes: {
    added: [
      'Business Development sidebar section (visible to Admin, CEO, Manager)',
      'BdCompany model — company registry with registration status, contact info, and requirements',
      'BdDocument model — submitted documents per company with status tracking',
      'BdRequest model — RFQs and Inquiries received from companies',
      'BdArchiveEntry model — four-section archive per company',
      'Full CRUD API at /api/bd/companies and sub-routes',
      '6 new permissions: bd.companies.view/manage, bd.documents.view/manage, bd.requests.view/manage',
    ],
    fixed: [],
    changed: [
      'Version bumped to 20.0.0 (major release)',
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
