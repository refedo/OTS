import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Project Wizard Enhancements & Personalized Notifications',
  highlights: [
    'Stage durations from wizard now persist and show in project details',
    'Completed wizard projects are set to Active status automatically',
    'Draft projects can be resumed from the projects list',
    'Notifications are now personalized per user role and involvement',
  ],
  changes: {
    added: [
      'Stage durations (Engineering/Operations/Site weeks) now saved from project wizard to project details',
      'Resume wizard draft — PlayCircle icon next to Draft projects in projects list to resume setup',
      'Department head notifications — dept managers notified on task creation, completion, and reassignment',
      'Personalized delayed tasks — users only see delayed tasks they are involved in (assignee/creator/requester)',
      'Personalized schedule alerts — users only see underperforming schedules for their projects',
    ],
    fixed: [
      'Project wizard now sets status to Active on completion instead of Draft',
      'Stage duration fields added to API schemas (create + update) so wizard data persists',
      'Fixed lint error: params.id replaced with awaited id variable in projects API',
      'Production migration SQL generated for missing stage duration columns',
    ],
    changed: [
      'Save as Draft stores full wizard state in remarks field for resume capability',
      'Delayed tasks endpoint now caches per-user instead of globally',
      'Underperforming schedules filtered to user\'s managed/assigned projects',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
