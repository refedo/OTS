import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.5.0',
  date: 'February 23, 2026',
  type: 'minor' as const,
  mainTitle: '✨ Tasks Module Enhancement',
  highlights: [
    'Task Requester & Release Date fields',
    'Tasks Dashboard with team performance analytics',
    'Personalized task notifications',
    'Requester/Release Date in table, detail & form views',
  ],
  changes: {
    added: [
      'Task Requester field — choose/change who requested the task',
      'Task Release Date field — target release/delivery date',
      'Tasks Dashboard — team performance overview with success rate, schedule slips, assigned/completed counts',
      'Personalized notifications: assignee notified on assignment, requester notified on completion',
      'TASK_COMPLETED notification type',
    ],
    fixed: [],
    changed: [],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
