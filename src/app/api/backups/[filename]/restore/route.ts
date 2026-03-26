import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';
import { BACKUP_MODULES, getTablesForModules } from '@/lib/backup-modules';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import { spawn } from 'child_process';

const BACKUP_DIR = process.env.BACKUP_DIR || '/root/backups';

function isValidIdentifier(name: string): boolean {
  if (name.includes('..') || name.includes('/')) return false;
  if (/^\d{8}([_-]\d{6})?$/.test(name)) return true;
  if (/\.(sql|sql\.gz)$/.test(name)) return true;
  return false;
}

function getSqlFilePath(targetPath: string): string | null {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const sqlFiles = fs.readdirSync(targetPath).filter((f: string) => f.endsWith('.sql') || f.endsWith('.sql.gz'));
    if (sqlFiles.length === 0) return null;
    let best = sqlFiles[0];
    let bestSize = 0;
    for (const sf of sqlFiles) {
      const size = fs.statSync(path.join(targetPath, sf)).size;
      if (size > bestSize) { bestSize = size; best = sf; }
    }
    return path.join(targetPath, best);
  }
  return targetPath;
}

async function parseBackupRowCounts(filePath: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const fileStream = fs.createReadStream(filePath);
  const input = filePath.endsWith('.sql.gz') ? fileStream.pipe(zlib.createGunzip()) : fileStream;
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const line of rl) {
    const m = line.match(/^INSERT INTO `([^`]+)`/);
    if (m) {
      const table = m[1];
      // Approximate row count: count value tuple separators ),(
      const rowCount = (line.match(/\),\s*\(/g) || []).length + 1;
      counts[table] = (counts[table] || 0) + rowCount;
    }
  }
  return counts;
}

async function getCurrentDbRowCounts(): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ TABLE_NAME: string; TABLE_ROWS: bigint }>>`
    SELECT TABLE_NAME, TABLE_ROWS
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
  `;
  return Object.fromEntries(rows.map((r: { TABLE_NAME: string; TABLE_ROWS: bigint }) => [r.TABLE_NAME, Number(r.TABLE_ROWS)]));
}

function resolveDbCredentials() {
  const dbUrl = process.env.DATABASE_URL || '';
  const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!urlMatch) return null;
  const [, parsedUser, parsedPass, dbHost, dbPort, dbName] = urlMatch;
  return {
    user: process.env.BACKUP_DB_USER ?? parsedUser,
    pass: process.env.BACKUP_DB_PASSWORD ?? parsedPass,
    host: dbHost,
    port: dbPort,
    name: dbName,
  };
}

// Stream-filter the SQL file to only include statements for selectedTables.
// If selectedTables is empty, all tables are included (full restore).
async function runMysqlRestore(sqlFilePath: string, creds: ReturnType<typeof resolveDbCredentials>, selectedTables?: Set<string>): Promise<void> {
  if (!creds) throw new Error('Invalid database configuration');

  const args = ['-h', creds.host, '-P', creds.port, '-u', creds.user, creds.name];
  if (creds.pass) args.splice(args.indexOf(creds.user) + 1, 0, `-p${creds.pass}`);

  const mysql = spawn('mysql', args, { stdio: ['pipe', 'pipe', 'pipe'] });

  const mysqlDone = new Promise<void>((resolve, reject) => {
    mysql.on('close', (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`mysql exited with code ${code}`));
    });
    mysql.on('error', reject);
  });

  // Full restore: pipe the file directly
  if (!selectedTables || selectedTables.size === 0) {
    const fileStream = fs.createReadStream(sqlFilePath);
    const input = sqlFilePath.endsWith('.sql.gz') ? fileStream.pipe(zlib.createGunzip()) : fileStream;
    input.pipe(mysql.stdin);
  } else {
    // Partial restore: stream-filter to selected tables only
    const fileStream = fs.createReadStream(sqlFilePath);
    const input = sqlFilePath.endsWith('.sql.gz') ? fileStream.pipe(zlib.createGunzip()) : fileStream;
    const rl = readline.createInterface({ input, crlfDelay: Infinity });

    let inSelectedBlock = true; // header is always included
    let seenFirstTable = false;

    mysql.stdin.write('SET FOREIGN_KEY_CHECKS=0;\n');

    for await (const line of rl) {
      // Table structure anchor: marks start of a table block
      const structMatch = line.match(/^-- Table structure for table `([^`]+)`/);
      const dataMatch = line.match(/^-- Dumping data for table `([^`]+)`/);

      if (structMatch) {
        seenFirstTable = true;
        inSelectedBlock = selectedTables.has(structMatch[1]);
      } else if (dataMatch) {
        inSelectedBlock = selectedTables.has(dataMatch[1]);
      } else if (line.startsWith('-- Dump completed')) {
        inSelectedBlock = true;
      }

      if (!seenFirstTable || inSelectedBlock) {
        mysql.stdin.write(line + '\n');
      }
    }

    mysql.stdin.write('SET FOREIGN_KEY_CHECKS=1;\n');
    mysql.stdin.end();
  }

  await mysqlDone;
}

// ─── GET: Preview ───────────────────────────────────────────────────────────

export const GET = withApiContext(async (req: NextRequest, session, context) => {
  const hasAccess = await checkPermission('backups.restore');
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const filename = context?.params?.filename ?? '';
  if (!isValidIdentifier(filename)) return NextResponse.json({ error: 'Invalid backup identifier' }, { status: 400 });

  const targetPath = path.join(BACKUP_DIR, filename);
  if (!path.resolve(targetPath).startsWith(path.resolve(BACKUP_DIR))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }
  if (!fs.existsSync(targetPath)) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });

  const sqlFilePath = getSqlFilePath(targetPath);
  if (!sqlFilePath) return NextResponse.json({ error: 'No SQL file found in backup' }, { status: 404 });

  try {
    const [backupCounts, currentCounts] = await Promise.all([
      parseBackupRowCounts(sqlFilePath),
      getCurrentDbRowCounts(),
    ]);

    const modules = BACKUP_MODULES.map(mod => {
      const tables = mod.tables.map(table => ({
        name: table,
        current: currentCounts[table] ?? 0,
        backup: backupCounts[table] ?? 0,
      }));
      return { id: mod.id, label: mod.label, tables };
    });

    return NextResponse.json({ modules });
  } catch (error) {
    logger.error({ error, filename }, 'Failed to generate restore preview');
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
});

// ─── POST: Restore ──────────────────────────────────────────────────────────

const restoreSchema = z.object({
  // If provided, only restore these module IDs. If absent or empty, do a full restore.
  modules: z.array(z.string()).optional(),
});

export const POST = withApiContext(async (req: NextRequest, session, context) => {
  const hasAccess = await checkPermission('backups.restore');
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const filename = context?.params?.filename ?? '';
  if (!isValidIdentifier(filename)) return NextResponse.json({ error: 'Invalid backup identifier' }, { status: 400 });

  const targetPath = path.join(BACKUP_DIR, filename);
  if (!path.resolve(targetPath).startsWith(path.resolve(BACKUP_DIR))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }
  if (!fs.existsSync(targetPath)) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });

  const sqlFilePath = getSqlFilePath(targetPath);
  if (!sqlFilePath) return NextResponse.json({ error: 'No SQL file found in backup' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { modules: moduleIds } = parsed.data;
  const isPartial = Array.isArray(moduleIds) && moduleIds.length > 0;
  const selectedTables = isPartial ? new Set(getTablesForModules(moduleIds)) : undefined;

  const creds = resolveDbCredentials();
  if (!creds) return NextResponse.json({ error: 'Invalid database configuration' }, { status: 500 });

  try {
    await runMysqlRestore(sqlFilePath, creds, selectedTables);

    logger.info(
      { filename, isPartial, modules: moduleIds, tableCount: selectedTables?.size, userId: session!.userId },
      'Database restored from backup',
    );

    return NextResponse.json({
      message: isPartial
        ? `Partial restore complete — ${selectedTables!.size} tables restored`
        : 'Full database restore complete',
    });
  } catch (error) {
    logger.error({ error, filename, userId: session!.userId }, 'Failed to restore database from backup');
    return NextResponse.json({ error: 'Failed to restore database from backup' }, { status: 500 });
  }
});
