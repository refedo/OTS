import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.18.2',
  date: 'March 5, 2026',
  type: 'patch' as const,
  mainTitle: 'Initiatives Display & RBAC Enhancements',
  highlights: [
    'Fixed initiatives showing 0% progress on objectives page',
    'Multi-select objectives for initiatives support',
    'Enhanced RBAC with browse_users permission',
    'Objective names now displayed in initiative cards',
  ],
  changes: {
    added: [
      'Multi-select objectives for initiatives — link one initiative to multiple objectives',
      'New projects.browse_users permission — allows browsing user lists without full user management access',
      'Objective names displayed in initiative cards — shows next to budget and timeline',
    ],
    fixed: [
      'Initiatives now show correct progress on objectives page — calculated from status when progress field is 0',
      'Fixed initiatives not appearing under objectives — merged direct and junction table relationships',
      'Version display in sidebar now dynamically updates from system version',
    ],
    changed: [
      'Enhanced initiatives form UI — replaced dropdown with multi-select checkbox list',
      'Updated objectives API to handle both direct and many-to-many initiative relationships',
      'Users API now checks projects.browse_users permission for user dropdown access',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
