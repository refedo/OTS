import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/hexa-steel-ots';

function isValidFilename(filename: string): boolean {
  return /^db_backup_\d{8}_\d{6}\.sql$/.test(filename);
}

export const GET = withApiContext(async (req: NextRequest, session, context) => {
  const hasAccess = await checkPermission('backups.download');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filename = context?.params?.filename ?? '';

  if (!isValidFilename(filename)) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const filePath = path.join(BACKUP_DIR, filename);

  // Prevent path traversal
  if (path.resolve(filePath) !== path.resolve(path.join(BACKUP_DIR, filename))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    logger.info({ filename, userId: session!.userId }, 'Backup downloaded');

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    logger.error({ error, filename }, 'Failed to download backup');
    return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 });
  }
});
