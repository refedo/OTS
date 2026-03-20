import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/hexa-steel-ots';

type BackupFile = {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  path: string;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function parseBackupDate(filename: string): string {
  // Parse date from format: db_backup_YYYYMMDD_HHMMSS.sql
  const match = filename.match(/db_backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.sql/);
  if (!match) return new Date().toISOString();
  const [, year, month, day, hour, min, sec] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString();
}

function listBackups(): BackupFile[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.match(/^db_backup_\d{8}_\d{6}\.sql$/))
    .map(filename => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat = fs.statSync(filePath);
      return {
        filename,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: parseBackupDate(filename),
        path: filePath,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return files;
}

export const GET = withApiContext(async (req: NextRequest, session) => {
  const hasAccess = await checkPermission('backups.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const backups = listBackups();

    let diskInfo: { total: number; free: number; used: number; totalFormatted: string; freeFormatted: string; usedFormatted: string } | null = null;
    try {
      const { stdout } = await execAsync(`df -k "${BACKUP_DIR}" 2>/dev/null || df -k /var 2>/dev/null || df -k / 2>/dev/null`);
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        if (parts.length >= 4) {
          const total = parseInt(parts[1]) * 1024;
          const used = parseInt(parts[2]) * 1024;
          const free = parseInt(parts[3]) * 1024;
          diskInfo = {
            total,
            used,
            free,
            totalFormatted: formatBytes(total),
            freeFormatted: formatBytes(free),
            usedFormatted: formatBytes(used),
          };
        }
      }
    } catch {
      // disk info not critical
    }

    return NextResponse.json({
      backups,
      backupDir: BACKUP_DIR,
      diskInfo,
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      totalSizeFormatted: formatBytes(backups.reduce((sum, b) => sum + b.size, 0)),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list backups');
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const hasAccess = await checkPermission('backups.create');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `db_backup_${datePart}_${timePart}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    const dbUrl = process.env.DATABASE_URL || '';
    // Parse mysql://user:pass@host:port/database
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid database configuration' }, { status: 500 });
    }

    const [, dbUser, dbPass, dbHost, dbPort, dbName] = urlMatch;

    const cmd = `mysqldump -h "${dbHost}" -P "${dbPort}" -u "${dbUser}" -p"${dbPass}" "${dbName}" > "${filePath}"`;
    await execAsync(cmd);

    const stat = fs.statSync(filePath);

    // Prune old backups — keep last 7
    const allBackups = listBackups();
    if (allBackups.length > 7) {
      const toDelete = allBackups.slice(7);
      for (const b of toDelete) {
        try {
          fs.unlinkSync(b.path);
        } catch {
          // best effort
        }
      }
    }

    logger.info({ filename, size: stat.size, userId: session!.userId }, 'Database backup created');

    return NextResponse.json({
      filename,
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
      createdAt: now.toISOString(),
      message: 'Backup created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error({ error, userId: session!.userId }, 'Failed to create backup');
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
});
