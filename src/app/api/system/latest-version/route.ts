import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Delayed Tasks Widget & Login Notification',
  highlights: [
    'New dashboard widget showing delayed tasks with severity breakdown',
    'Login notification dialog alerts users about overdue tasks',
    'Admin toggle to switch between personal and all delayed tasks',
    'Clickable severity cards to filter tasks by Critical, Warning, or Minor',
  ],
  changes: {
    added: [
      'Delayed Tasks Dashboard Widget — severity breakdown (Critical 7+ days, Warning 3-7 days, Minor 1-3 days) with most overdue tasks list',
      'Login Notification Dialog — prompts users once per session about their delayed tasks requiring attention',
      'Admin toggle (My Tasks / All Tasks) — admin users can switch between personal tasks and system-wide delayed tasks',
      'Clickable severity cards — Critical, Warning, Minor cards navigate to notifications page with severity pre-filter',
      'Severity filter on Notifications page — ?severity=critical|warning|minor query param with filter pill buttons and clickable stat cards',
    ],
    fixed: [
      'Delayed tasks scoped to user\'s own tasks (assigned to, created by, or requested by) instead of showing all system tasks',
    ],
    changed: [
      'Delayed tasks API supports ?personal=true param to always filter to user\'s own tasks regardless of admin permissions',
      'Notifications page stat cards are now clickable with active filter ring indicator',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
