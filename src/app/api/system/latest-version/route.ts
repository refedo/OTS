import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.4.0',
  date: 'January 8, 2026',
  type: 'minor' as const,
  mainTitle: '🎯 CEO Role & System Update Notifications',
  highlights: [
    'CEO Superadmin Role',
    'Update Notification System',
    'Production Error Fixes',
    'Planning Page Layout Improvements',
  ],
  changes: {
    added: [
      {
        title: 'CEO Superadmin Role',
        items: [
          'New CEO role with all system privileges (higher than Admin)',
          'CEO automatically has access to all features and modules',
          'Updated 30+ files to include CEO in permission checks',
          'CEO can create, edit, delete, and approve all content',
          'Added to role hierarchy: CEO > Admin > Manager > Engineer > Operator',
        ],
      },
      {
        title: 'System Update Notifications',
        items: [
          'Beautiful popup dialog shows what\'s new after system updates',
          'Displays new features, bug fixes, and improvements',
          'Shows once per user when logging in after an update',
          'Organized by categories with color-coded sections',
          'Link to full changelog for detailed information',
        ],
      },
    ],
    fixed: [
      'Fixed production error: DocumentSubmission query using wrong model',
      'Scope schedules now correctly query DocumentSubmission instead of Document',
      'Fixed buildingId field error in document progress calculation',
      'Planning page layout now uses full width when sidebar is collapsed',
      'Removed excessive whitespace on planning page',
    ],
    changed: [
      'Updated RBAC system to recognize CEO as superadmin',
      'All permission checks now include CEO role',
      'Planning page layout standardized with ResponsiveLayout',
      'Improved system-wide permission consistency',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
