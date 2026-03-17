import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Parts Upload Enhancements & Bug Fixes',
  highlights: [
    'CSV file support for parts upload — no need to convert to Excel first',
    'Header Row selector — choose which row contains column names (handles non-standard files)',
    'Rollback Upload button — soft-delete an entire upload batch, recoverable from Governance',
    'Part Mark is now optional when uploading assembly parts',
    'Tasks "New Features" tips dismissed state now persists across all devices and sessions',
  ],
  changes: {
    added: [
      {
        title: 'Parts Upload — CSV Support',
        items: [
          'Upload page now accepts .csv files in addition to .xls and .xlsx',
          'CSV is parsed via the XLSX library (reads as text); Excel continues as ArrayBuffer',
        ],
      },
      {
        title: 'Parts Upload — Header Row Selector',
        items: [
          'New numeric input (default: 1) lets you specify which row contains column names',
          'Column mapping and preview update live whenever the header row is changed',
          'Handles files where the header row is not the first row',
        ],
      },
      {
        title: 'Parts Upload — Rollback Upload',
        items: [
          'After a successful bulk upload, a Rollback Upload button appears in the result card',
          'Clicking it soft-deletes all uploaded parts (sets deletedAt); parts remain recoverable from the Governance page',
          'Rollback action is logged as a system event for full traceability',
          'Requires the production.delete_parts permission',
        ],
      },
    ],
    fixed: [
      {
        title: 'Parts Upload — 403 Forbidden Error',
        items: [
          'Upload API was checking for production.upload_parts which does not exist',
          'Fixed to use the correct permission key: production.create_parts',
        ],
      },
      'Parts Upload — Part Mark is now optional; uploads no longer fail when the column is absent',
      'Tasks Tips Banner — "New Features" tips dismissed state is now saved server-side so it no longer reappears after clearing browser storage, switching devices, or opening a new session',
    ],
    changed: [
      'Bulk upload now logs entityType and full partIds array in system events for traceability',
      'Bulk upload now also writes to the Governance audit trail (logActivity) in addition to system events',
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
