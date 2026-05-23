import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import path from 'path';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import prisma from '@/lib/db';

const MIME_TYPES: Record<string, string> = {
  '.pdf':  'application/pdf',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls':  'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt':  'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt':  'text/plain',
  '.csv':  'text/csv',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.bmp':  'image/bmp',
};

// Files under /uploads/ are served from local disk
const LOCAL_BASE = '/uploads/';

function buildResponse(buffer: Buffer, filePath: string): NextResponse {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
  const fileName = path.basename(filePath);
  const viewInline = contentType === 'application/pdf' || contentType.startsWith('image/');
  const disposition = viewInline ? `inline; filename="${fileName}"` : `attachment; filename="${fileName}"`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function GET(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filePath = req.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // ── Case 1: local /uploads/ path ─────────────────────────────────────────
  if (filePath.startsWith(LOCAL_BASE)) {
    const normalised = path.normalize(filePath);
    // Guard against path-traversal
    if (!normalised.startsWith(LOCAL_BASE)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const diskPath = path.join(process.cwd(), 'public', normalised);

    if (existsSync(diskPath)) {
      try {
        const buffer = await readFile(diskPath);
        return buildResponse(buffer, diskPath);
      } catch (error) {
        logger.error({ error, filePath }, 'Failed to serve local file');
        return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
      }
    }

    // Local file missing — fall back to Nextcloud if enabled
    if (env.NEXTCLOUD_ENABLED === 'true') {
      try {
        const fileName = path.basename(normalised);
        const ncRow = await prisma.nextcloudFile.findFirst({
          where: { fileName },
          orderBy: { createdAt: 'desc' },
        });
        if (ncRow) {
          const { nextcloudService } = await import('@/lib/services/nextcloud.service');
          const { buffer, mimeType, fileName: ncFileName } = await nextcloudService.download(ncRow.remotePath);
          const ct = mimeType ?? 'application/octet-stream';
          const viewInline = ct === 'application/pdf' || ct.startsWith('image/');
          const disposition = viewInline
            ? `inline; filename="${ncFileName}"`
            : `attachment; filename="${ncFileName}"`;
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': ct,
              'Content-Disposition': disposition,
              'Content-Length': String(buffer.byteLength),
              'Cache-Control': 'private, no-store',
            },
          });
        }
      } catch (ncError) {
        logger.warn({ ncError, filePath }, 'Nextcloud fallback also failed');
      }
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // ── Case 2: Nextcloud remote path (when Nextcloud is the storage backend) ─
  if (env.NEXTCLOUD_ENABLED === 'true') {
    try {
      const { nextcloudService } = await import('@/lib/services/nextcloud.service');
      const { buffer, mimeType, fileName } = await nextcloudService.download(filePath);
      const ct = mimeType ?? 'application/octet-stream';
      const viewInline = ct === 'application/pdf' || ct.startsWith('image/');
      const disposition = viewInline
        ? `inline; filename="${fileName}"`
        : `attachment; filename="${fileName}"`;
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': ct,
          'Content-Disposition': disposition,
          'Content-Length': String(buffer.byteLength),
          'Cache-Control': 'private, no-store',
        },
      });
    } catch (error) {
      logger.error({ error, filePath }, 'Failed to serve Nextcloud file');
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
}
