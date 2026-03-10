import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'PBAC Migration — Permission-Based Access Control',
  highlights: [
    'Complete migration from role-based to permission-based access control',
    'Custom user permissions with grants/revokes override system',
    'Clone permissions API to copy permissions between users',
    'Legacy rbac.ts deleted — all access uses permission-checker.ts',
  ],
  changes: {
    added: [
      'Permission Resolution Service — hybrid model: Role Permissions + Grants - Revokes - Module Restrictions',
      'Custom Permissions with Grants/Revokes in user edit form',
      'Clone Permissions API — POST /api/users/[id]/clone-permissions',
      'PBAC Verification Script — scripts/verify-pbac-migration.ts',
    ],
    fixed: [
      '18+ API routes migrated from hardcoded role checks to checkPermission() calls',
      '12+ page components migrated from role checks to getCurrentUserPermissions()',
      '9 client components migrated from userRole prop to userPermissions prop',
    ],
    changed: [
      'Deleted src/lib/rbac.ts — legacy role-based access control removed',
      'customPermissions JSON uses { grants, revokes } format (backward compatible)',
      'User PATCH API accepts both legacy array and new grants/revokes format',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
