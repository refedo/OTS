import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Backup Management UI',
  highlights: [
    'New Backup Management page under System Settings — view, create, download, and delete database backups',
    'Automatic pruning keeps at most 7 most recent backups to conserve disk space',
    'Live disk usage stats show total, used, and free space on the backup partition',
    'Full RBAC/PBAC integration — granular permissions for view, create, download, and delete',
    'Backup files are served as direct SQL downloads without exposing the server filesystem',
  ],
  changes: {
    added: [
      {
        title: 'Backup Management — UI Page',
        items: [
          'New page at /settings/backups with a sortable table of all database backups',
          'Each row shows backup date, SQL filename, age, and file size',
          '"Latest" badge highlights the most recent backup',
          'Stats cards display total backup count, total size, and disk free space',
          'Backup directory path shown for reference',
        ],
      },
      {
        title: 'Backup Management — API Routes',
        items: [
          'GET /api/backups — lists all backups from YYYYMMDD subdirectory structure',
          'POST /api/backups — creates a new backup via mysqldump into a date-stamped directory',
          'DELETE /api/backups/[dirname] — deletes a backup directory (or legacy flat .sql file)',
          'GET /api/backups/[dirname]/download — streams the SQL file as a download attachment',
          'Supports both new YYYYMMDD/ subdirectory format and legacy flat .sql files',
        ],
      },
      {
        title: 'Backup Management — RBAC/PBAC',
        items: [
          'Added backups permission category with four permissions: view, create, delete, download',
          'Added backup_management PBAC module under the administrative category',
          'Navigation permission guard added for /settings/backups route',
          '"Backup Management" link added to the System Settings sidebar section',
        ],
      },
    ],
    fixed: [],
    changed: [
      'Backup pruning now runs automatically on every new backup creation — oldest beyond 7 are removed',
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
