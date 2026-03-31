import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🧪 Test Coverage & Infrastructure',
  highlights: [
    'Vitest test infrastructure — npm test and npm run test:watch scripts, vitest.config.ts with full @/ alias support',
    '27 tests for permissions helpers and role catalogue integrity — verifies Admin has all permissions, Operator restrictions, and every role references valid permission IDs',
    '10 tests for PointsService — on-time bonus, early completion threshold, badge deduplication, and guard clauses',
    '7 tests for WorkUnitDependencyService cycle detection — BFS algorithm validated for direct, indirect, and diamond-shaped dependency graphs',
  ],
  changes: {
    added: [
      'Vitest + vite-tsconfig-paths devDependencies — npm test (single run) and npm run test:watch scripts — vitest.config.ts',
      {
        title: 'permissions.ts — 27 unit tests',
        items: [
          'hasPermission, hasAnyPermission, hasAllPermissions helper functions',
          'getPermissionsByCategory and getPermissionById lookups',
          'Catalogue integrity: no duplicate IDs, dot-notation naming convention, non-empty names and descriptions',
          'DEFAULT_ROLE_PERMISSIONS: Admin has every permission, Operator blocked from project management, all role permissions reference valid IDs',
        ],
      },
      {
        title: 'rate-limiter.ts — 8 unit tests',
        items: [
          'First request allowed with correct remaining count',
          'Remaining count decrements on each request',
          'Request blocked once limit is reached',
          'Independent tracking per identifier',
          'Window expiry resets the counter (fake timers)',
          'reset() immediately clears the entry',
        ],
      },
      {
        title: 'WorkUnitDependencyService — 7 unit tests',
        items: [
          'wouldCreateCycle returns false for isolated nodes and linear chains',
          'wouldCreateCycle returns true for direct 2-node and indirect 3-node cycles',
          'wouldCreateCycle returns false for diamond-shaped graphs',
          'Visited-set guard prevents infinite loops in existing cyclic graphs',
          'create() throws immediately on self-reference without any DB calls',
        ],
      },
      {
        title: 'PointsService — 10 unit tests',
        items: [
          'Returns null when task has no assignedToId or no completedAt',
          'Awards 0 points when TASK_COMPLETE rule is missing from DB',
          'Awards base + on-time + early completion bonus (≥ 2 days early)',
          'Does not award early completion bonus for 1-day-early completion',
          'Does not award on-time bonus when completed after due date',
          'awardBadge returns false without insert when badge already exists',
          'awardBadge returns true and inserts when badge is new',
        ],
      },
    ],
    fixed: [
      'excel-parser.test.ts — duplicate project_code was incorrectly expected to produce a validation error; the code intentionally treats duplicates as warnings (user may want to merge data). Test corrected to assert valid: true with a warning.',
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
