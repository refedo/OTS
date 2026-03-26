import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || '/root/backups';

function isValidIdentifier(name: string): boolean {
  if (name.includes('..') || name.includes('/')) return false;
  if (/^\d{8}([_-]\d{6})?$/.test(name)) return true;
  if (/\.(sql|sql\.gz)$/.test(name)) return true;
  return false;
}

export const POST = withApiContext(async (req: NextRequest, session, context) => {
  const hasAccess = await checkPermission('backups.restore');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filename = context?.params?.filename ?? '';

  if (!isValidIdentifier(filename)) {
    return NextResponse.json({ error: 'Invalid backup identifier' }, { status: 400 });
  }

  const targetPath = path.join(BACKUP_DIR, filename);

  if (!path.resolve(targetPath).startsWith(path.resolve(BACKUP_DIR))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  if (!fs.existsSync(targetPath)) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  }

  try {
    const stat = fs.statSync(targetPath);
    let sqlFilePath: string;

    if (stat.isDirectory()) {
      const sqlFiles = fs.readdirSync(targetPath).filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'));
      if (sqlFiles.length === 0) {
        return NextResponse.json({ error: 'No SQL file found in backup directory' }, { status: 404 });
      }
      let best = sqlFiles[0];
      let bestSize = 0;
      for (const sf of sqlFiles) {
        const sfSize = fs.statSync(path.join(targetPath, sf)).size;
        if (sfSize > bestSize) { bestSize = sfSize; best = sf; }
      }
      sqlFilePath = path.join(targetPath, best);
    } else {
      sqlFilePath = targetPath;
    }

    const dbUrl = process.env.DATABASE_URL || '';
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid database configuration' }, { status: 500 });
    }

    const [, parsedUser, parsedPass, dbHost, dbPort, dbName] = urlMatch;
    const dbUser = process.env.BACKUP_DB_USER ?? parsedUser;
    const dbPass = process.env.BACKUP_DB_PASSWORD ?? parsedPass;
    const passArg = dbPass ? `-p"${dbPass}"` : '';

    let cmd: string;
    if (sqlFilePath.endsWith('.sql.gz')) {
      cmd = `gunzip -c "${sqlFilePath}" | mysql -h "${dbHost}" -P "${dbPort}" -u "${dbUser}" ${passArg} "${dbName}"`;
    } else {
      cmd = `mysql -h "${dbHost}" -P "${dbPort}" -u "${dbUser}" ${passArg} "${dbName}" < "${sqlFilePath}"`;
    }

    await execAsync(cmd);

    logger.info({ filename, sqlFilePath, userId: session!.userId }, 'Database restored from backup');

    return NextResponse.json({ message: 'Database restored successfully' });
  } catch (error) {
    logger.error({ error, filename, userId: session!.userId }, 'Failed to restore database from backup');
    return NextResponse.json({ error: 'Failed to restore database from backup' }, { status: 500 });
  }
});
