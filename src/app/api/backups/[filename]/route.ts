import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/root/backups';

// Accepts YYYYMMDD dir name OR legacy db_backup_YYYYMMDD_HHMMSS.sql
function isValidIdentifier(name: string): boolean {
  return /^\d{8}$/.test(name) || /^db_backup_\d{8}_\d{6}\.sql$/.test(name);
}

export const DELETE = withApiContext(async (req: NextRequest, session, context) => {
  const hasAccess = await checkPermission('backups.delete');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filename = context?.params?.filename ?? '';

  if (!isValidIdentifier(filename)) {
    return NextResponse.json({ error: 'Invalid backup identifier' }, { status: 400 });
  }

  const targetPath = path.join(BACKUP_DIR, filename);

  // Prevent path traversal
  if (!path.resolve(targetPath).startsWith(path.resolve(BACKUP_DIR))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  if (!fs.existsSync(targetPath)) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  }

  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    logger.info({ filename, userId: session!.userId }, 'Backup deleted');
    return NextResponse.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    logger.error({ error, filename }, 'Failed to delete backup');
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
});
