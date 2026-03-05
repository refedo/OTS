import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '� RBAC Overhaul - Permissions Now Work Correctly',
  highlights: [
    'CRITICAL: Fixed RBAC system - permissions now respected for all roles',
    'CEO and other roles can now use their assigned permissions',
    'Replaced 18 hardcoded Admin-only checks with proper permission checks',
    'Users with isAdmin flag or appropriate permissions can perform actions',
  ],
  changes: {
    added: [
      'Proper RBAC permission checks in all critical API routes',
      'Clear error messages indicating which permission is missing',
    ],
    fixed: [
      'CRITICAL: CEO could not delete projects despite having projects.delete permission',
      'CRITICAL: Users with permissions were blocked by hardcoded Admin-only checks',
      'projects/[id] DELETE: now uses projects.delete permission',
      'users CRUD: now uses users.create/edit/delete permissions',
      'departments POST: now uses departments.create permission',
      'roles CRUD: now uses roles.create/edit/delete permissions',
      'clients DELETE: now uses clients.delete permission',
      'settings PATCH: now uses settings.manage permission',
      'planning routes: now use planning.create/edit/delete permissions',
      'operations routes: now use operations.create/edit/delete permissions',
      'ITP DELETE: now uses qc.delete permission',
      'Project import/export: now use projects.create/view permissions',
    ],
    changed: [
      'RBAC system now properly respects permissions assigned to roles',
      'isAdmin flag grants all permissions as intended',
      'Permission checks use centralized checkPermission() function',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
