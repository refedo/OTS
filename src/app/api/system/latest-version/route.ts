import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '13.4.7',
  date: 'February 7, 2026',
  type: 'minor' as const,
  mainTitle: '🚀 Quick Edit Mode & Bug Fixes',
  highlights: [
    'Quick Edit Mode for Tasks',
    'Hydration Error Resolution',
    'Date Field Preservation',
    'Terminal Noise Reduction',
  ],
  changes: {
    added: [
      {
        title: 'Quick Edit Mode for Tasks',
        items: [
          'Edit tasks directly in the table row without navigating to separate page',
          'All fields become editable inputs/dropdowns when clicking edit button',
          'Supports editing: title, assignee, department, project, building, priority, status, input date, due date, and private flag',
          'Visual feedback with blue background during edit mode',
          'Save and Cancel buttons replace action buttons during editing',
          'Maintains existing date values when entering edit mode',
        ],
      },
    ],
    fixed: [
      'Hydration Error Resolution: Fixed server/client mismatch in login form version display',
      'Version now fetched dynamically on client side to prevent hydration errors',
      'Date Field Preservation: Fixed issue where Input Date and Due Date fields were resetting to empty when entering edit mode',
      'Dates now properly converted from ISO format to YYYY-MM-DD for HTML date inputs',
      'Terminal Noise Reduction: Disabled Prisma query logging to reduce terminal clutter',
      'Only error messages are now logged to terminal',
    ],
    changed: [],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
