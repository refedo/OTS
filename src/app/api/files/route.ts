import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import path from 'path';
import { logger } from '@/lib/logger';

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

// Only files under /uploads/ are served
const ALLOWED_BASE = '/uploads/';

export async function GET(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filePath = req.nextUrl.searchParams.get('path');

  if (!filePath || !filePath.startsWith(ALLOWED_BASE)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  // Prevent path traversal
  const normalised = path.normalize(filePath);
  if (!normalised.startsWith(ALLOWED_BASE)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const diskPath = path.join(process.cwd(), 'public', normalised);

  if (!existsSync(diskPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(diskPath);
    const ext = path.extname(diskPath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    const fileName = path.basename(diskPath);

    // PDFs open inline; everything else triggers a download
    const disposition = contentType === 'application/pdf'
      ? `inline; filename="${fileName}"`
      : `attachment; filename="${fileName}"`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    logger.error({ error, filePath }, 'Failed to serve file');
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
