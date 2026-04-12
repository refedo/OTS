import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '📅 HR / Payroll Module — Phase 2: Attendance, Leaves & Overtime Ingestion',
  highlights: [
    'Google Sheet → OTS one-way attendance mirror reads the shared Overtime tab, the same sheet that already powers PTS sync',
    'Full attendance domain: PRESENT, AP/ANP absences, AV vacation, SL sick leave, weekends, and configurable public holidays — all parsed from the existing Hexa workbook',
    'Monthly per-worker timesheet with colour-coded day grid, hours totals, OT-multiplier support, and EN/AR name toggle',
    'Public holidays CRUD with yearly-recurrence flag, Arabic naming, and soft delete — drives timesheet colouring and rate calculations',
    'Orphans detection: unresolved worker identifiers downgrade the run to PARTIAL so the sheet can be fixed and re-synced without losing history',
  ],
  changes: {
    added: [
      'AttendanceRecord, PublicHoliday, GoogleSheetAttendanceSyncLog models with WorkerType, AttendanceStatus, AttendanceSyncStatus enums',
      'runAttendanceSync service — paginated sheet read, SHA-256 row-hash idempotent upsert, Friday 1.5× OT auto-detection, orphan capture',
      'POST /api/hr/attendance/sync to trigger a run, GET for the last 50 runs, GET /api/hr/attendance/sync/probe to dump raw header/data rows for layout verification',
      'GET /api/hr/attendance with month/worker/status filters returning employee + manpower-slot joined records',
      'Public holidays REST API: GET/POST /api/hr/public-holidays + PUT/DELETE /api/hr/public-holidays/[id] with Zod validation and soft delete',
      '/hr/attendance list page with filterable monthly view, EN/AR toggle, totals footer',
      '/hr/attendance/sync page with Sync now + Probe sheet layout buttons and per-run orphan drill-down',
      '/hr/attendance/timesheet/[workerType]/[id] monthly timesheet with calendar grid, hover tooltips, and legend',
      '/hr/public-holidays CRUD UI with inline add form and recurrence toggle',
      '5 new permissions: hr.attendance.view, hr.attendance.sync, hr.attendance.probe, hr.holiday.view, hr.holiday.manage — merged into HR role via updated patch script',
    ],
    fixed: [],
    changed: [
      'Sheet-wins policy for attendance (unlike the Phase 1 preserve-on-edit employee mirror) — Google is the source of truth, no writeback',
      'Sidebar: HR section now surfaces Attendance, Attendance Sync, and Public Holidays items',
      'Version bumped to 18.1.0 — minor bump reflecting Phase 2 feature additions',
    ],
  },
};

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  let alreadySeen = false;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { customPermissions: true },
      });
      const perms = user?.customPermissions as Record<string, unknown> | null;
      if (perms?.lastSeenVersion === CURRENT_VERSION.version) {
        alreadySeen = true;
      }
    } catch {
      // Non-critical; fall back to client-side check
    }
  }

  return NextResponse.json({ ...CURRENT_VERSION, alreadySeen });
}
