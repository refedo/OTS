import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/root/backups';

function isValidIdentifier(name: string): boolean {
  return /^\d{8}$/.test(name) || /^db_backup_\d{8}_\d{6}\.sql$/.test(name);
}

export const GET = withApiContext(async (req: NextRequest, session, context) => {
  const hasAccess = await checkPermission('backups.download');
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
    let filePath: string;
    let downloadName: string;

    if (stat.isDirectory()) {
      // Date dir — find the SQL file inside (pick largest)
      const sqlFiles = fs.readdirSync(targetPath).filter(f => f.endsWith('.sql'));
      if (sqlFiles.length === 0) {
        return NextResponse.json({ error: 'No SQL file found in backup directory' }, { status: 404 });
      }
      let best = sqlFiles[0];
      let bestSize = 0;
      for (const sf of sqlFiles) {
        const sfSize = fs.statSync(path.join(targetPath, sf)).size;
        if (sfSize > bestSize) { bestSize = sfSize; best = sf; }
      }
      filePath = path.join(targetPath, best);
      downloadName = `backup_${filename}_${best}`;
    } else {
      filePath = targetPath;
      downloadName = filename;
    }

    const fileBuffer = fs.readFileSync(filePath);
    logger.info({ filename, downloadName, userId: session!.userId }, 'Backup downloaded');

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    logger.error({ error, filename }, 'Failed to download backup');
    return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 });
  }
});
