import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.18.1',
  date: 'March 5, 2026',
  type: 'patch' as const,
  mainTitle: 'Strategic Planning & Initiatives Enhancements',
  highlights: [
    'Strategic Objectives module with 5-7 year planning',
    'Enhanced initiatives with progress tracking & delayed alerts',
    'Fixed task update permissions for admins',
    'Improved initiatives dashboard with colorization',
  ],
  changes: {
    added: [
      'Strategic Objectives Module — 5-7 year mid-term planning with full CRUD operations',
      'Link yearly company objectives to strategic objectives',
      'Track progress, priority, and status for long-term goals',
      'Initiatives Progress Tracking — automatic progress calculation from status',
      'Delayed Initiative Alerts — visual indicators for overdue initiatives with red borders',
    ],
    fixed: [
      'Task Update Permissions — admins now bypass permission checks via direct database lookup',
      'Task requesters can now edit their tasks',
      'Fixed stale session permission errors',
      'Average progress calculation now uses effective progress',
    ],
    changed: [
      'Enhanced Initiatives Dashboard — colorized status cards with matching backgrounds',
      'Smaller, more compact card layout for better space utilization',
      'Progress bars now show red for delayed initiatives',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
