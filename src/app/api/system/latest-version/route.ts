import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🛠️ Settings & Developer Experience',
  highlights: [
    'Conventional Commits Cheat Sheet — new /settings/commits page with dark-theme reference covering semver rules, all 12 commit prefixes, OTS module scopes, and real commit examples',
    'Settings Commits tab — dedicated tab in System Settings routing to the cheat sheet with GitCommitHorizontal icon',
    'CI fix — resolved npm error code EJSONPARSE blocking the Deploy to Digital Ocean workflow',
  ],
  changes: {
    added: [
      {
        title: 'Conventional Commits Cheat Sheet (/settings/commits)',
        items: [
          'MAJOR / MINOR / PATCH semver cards with color-coded top borders and trigger pill examples',
          '12 commit prefix cards: feat, fix, refactor, schema, ui, perf, chore, docs, breaking, api, auth, seed',
          '16 OTS module scope identifiers with numeric chips (01 projects → 15 ai → system)',
          'Real example blocks: Planning, Procurement, Breaking/Schema, and Chores/System — each with version bump badge',
          'Breaking change syntax note: ! shorthand and BREAKING CHANGE: footer usage',
        ],
      },
      'Settings "Commits" tab — GitCommitHorizontal icon tab in /settings routing to /settings/commits',
    ],
    fixed: [
      'CI npm error code EJSONPARSE — malformed package.json on the deployment branch was blocking npm ci in the Deploy to Digital Ocean workflow',
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
