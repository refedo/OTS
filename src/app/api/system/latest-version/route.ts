import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.10.0',
  date: 'February 24, 2026',
  type: 'minor' as const,
  mainTitle: '� RBAC Overhaul & User Management',
  highlights: [
    'Financial module now properly hidden when disabled in role permissions',
    'New isAdmin flag — admin privileges without requiring Admin role',
    'Mobile number field for WhatsApp notifications',
    'Module restrictions enforced on both server and client side',
  ],
  changes: {
    added: [
      'isAdmin flag on User — grants all permissions regardless of role',
      'Mobile number field (international format) for WhatsApp notifications',
      'financial_module and dolibarr_module entries in MODULE_RESTRICTIONS',
      'Better error handling for Project Analysis report',
    ],
    fixed: [
      'RBAC: /api/auth/me now applies restrictedModules filtering (was missing)',
      'Financial sidebar visible despite module being disabled in role',
      'permission-checker.ts refactored to use shared resolveUserPermissions()',
      'Missing navigation permissions for newer financial report pages',
    ],
    changed: [
      'User create/edit forms now include mobile number and admin toggle',
      'API user routes accept isAdmin and mobileNumber fields',
      'Navigation permissions updated for all financial report routes',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
