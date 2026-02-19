import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.5.3',
  date: 'February 19, 2026',
  type: 'patch' as const,
  mainTitle: '📋 Task Management & Wizard Enhancements',
  highlights: [
    'Task Approval Tracking & Filters',
    'Project Management View with Expand/Collapse All',
    'Multi-Select Status & Priority Filters',
    'PTS Sync Data Preview Before Import',
  ],
  changes: {
    added: [
      {
        title: '� Tasks Module Enhancement',
        items: [
          'Sortable table headers with visual sort indicators',
          'Task duplication via dropdown menu',
          'Multi-select filters (Ctrl+Click) for status and priority',
          'Approval status column with shield icon toggle',
          'Project management view: Project → Building → Department → Task',
          'Expand All / Collapse All with default expanded state',
          'New features tip banner (dismissible)',
          'Inline approval filter buttons (Approved / Not Approved)',
        ],
      },
      {
        title: '� PTS Sync Data Preview',
        items: [
          'Preview first 20 rows of PTS data before importing',
          'Shows mapped column data in scrollable table for verification',
        ],
      },
    ],
    fixed: [
      'Building dropdown in quick add now shows full name with designation',
      'Date columns expanded with min-width to prevent wrapping',
      'Removed duplicate approval filter dropdown',
      'Project management view uses consistent Table components',
    ],
    changed: [
      'Building filter now depends on selected project',
      'Tasks table expands to full width when sidebar is collapsed',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
