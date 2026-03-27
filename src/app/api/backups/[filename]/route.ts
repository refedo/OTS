import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/root/backups';

// Accepts date dir names (YYYYMMDD or YYYYMMDD_HHMMSS) or any SQL filename
function isValidIdentifier(name: string): boolean {
  if (name.includes('..') || name.includes('/')) return false;
  if (/^\d{8}([_-]\d{6})?$/.test(name)) return true;
  if (/\.(sql|sql\.gz)$/.test(name)) return true;
  return false;
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
    logger.info({ filename, userId: session!.sub }, 'Backup deleted');
    systemEventService.logSystem('SYS_BACKUP_DELETED', {
      filename,
      userId: session!.sub,
    });
    return NextResponse.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    logger.error({ error, filename }, 'Failed to delete backup');
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
});
