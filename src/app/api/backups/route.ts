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

type BackupEntry = {
  dirname: string;        // e.g. "20260313"
  sqlFile: string;        // SQL filename inside the dir
  size: number;
  sizeFormatted: string;
  createdAt: string;      // ISO date derived from dirname
  dirPath: string;        // absolute path to the date dir
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function dateFromDirname(dirname: string): string {
  // dirname format: YYYYMMDD
  const y = dirname.slice(0, 4);
  const m = dirname.slice(4, 6);
  const d = dirname.slice(6, 8);
  return new Date(`${y}-${m}-${d}T00:00:00`).toISOString();
}

export function listBackups(): BackupEntry[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const entries: BackupEntry[] = [];

  const items = fs.readdirSync(BACKUP_DIR);
  for (const item of items) {
    const fullPath = path.join(BACKUP_DIR, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && /^\d{8}$/.test(item)) {
      // Date subdirectory — find SQL files inside
      const sqlFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.sql'));
      if (sqlFiles.length === 0) continue;

      // Pick the largest SQL file in the dir (most complete dump)
      let bestFile = sqlFiles[0];
      let bestSize = 0;
      for (const sf of sqlFiles) {
        const sfStat = fs.statSync(path.join(fullPath, sf));
        if (sfStat.size > bestSize) {
          bestSize = sfStat.size;
          bestFile = sf;
        }
      }

      entries.push({
        dirname: item,
        sqlFile: bestFile,
        size: bestSize,
        sizeFormatted: formatBytes(bestSize),
        createdAt: dateFromDirname(item),
        dirPath: fullPath,
      });
    } else if (stat.isFile() && item.endsWith('.sql')) {
      // Flat SQL file at root of BACKUP_DIR (legacy format support)
      entries.push({
        dirname: item,
        sqlFile: item,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        dirPath: BACKUP_DIR,
      });
    }
  }

  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const GET = withApiContext(async (req: NextRequest) => {
  const hasAccess = await checkPermission('backups.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const backups = listBackups();

    let diskInfo: { total: number; free: number; used: number; totalFormatted: string; freeFormatted: string; usedFormatted: string } | null = null;
    try {
      const target = fs.existsSync(BACKUP_DIR) ? BACKUP_DIR : '/root';
      const { stdout } = await execAsync(`df -k "${target}"`);
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
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const dirPath = path.join(BACKUP_DIR, datePart);
    fs.mkdirSync(dirPath, { recursive: true });

    const sqlFilename = `db_backup_${timePart}.sql`;
    const filePath = path.join(dirPath, sqlFilename);

    const dbUrl = process.env.DATABASE_URL || '';
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid database configuration' }, { status: 500 });
    }

    const [, dbUser, dbPass, dbHost, dbPort, dbName] = urlMatch;
    const cmd = `mysqldump -h "${dbHost}" -P "${dbPort}" -u "${dbUser}" -p"${dbPass}" "${dbName}" > "${filePath}"`;
    await execAsync(cmd);

    const stat = fs.statSync(filePath);

    // Prune: keep only the most recent 7 date directories
    const allBackups = listBackups();
    const dirsToKeep = new Set(allBackups.slice(0, 7).map(b => b.dirname));
    for (const b of allBackups.slice(7)) {
      if (!dirsToKeep.has(b.dirname) && b.dirPath !== BACKUP_DIR) {
        try {
          fs.rmSync(b.dirPath, { recursive: true, force: true });
        } catch {
          // best effort
        }
      }
    }

    logger.info({ dirname: datePart, sqlFilename, size: stat.size, userId: session!.userId }, 'Database backup created');

    return NextResponse.json({
      dirname: datePart,
      sqlFile: sqlFilename,
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
