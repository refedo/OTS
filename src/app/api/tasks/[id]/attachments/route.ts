import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import sharp from 'sharp';

const COMPRESSIBLE_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_TYPES = [
  ...COMPRESSIBLE_IMAGE_TYPES,
  'image/gif', 'image/svg+xml', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_ATTACHMENTS = 10;

/** Compress image buffer using sharp; returns compressed buffer and new MIME type. */
async function compressImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const instance = sharp(buffer).rotate(); // auto-rotate from EXIF

  if (mimeType === 'image/png') {
    const compressed = await instance
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    return { buffer: compressed, mimeType: 'image/png' };
  }

  // JPEG / WEBP / other → output as WebP for best size/quality ratio
  const compressed = await instance
    .webp({ quality: 82 })
    .toBuffer();
  return { buffer: compressed, mimeType: 'image/webp' };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  try {
    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { uploadedAt: 'asc' },
    });
    return NextResponse.json(attachments);
  } catch (error) {
    logger.error({ error, taskId }, 'Failed to fetch task attachments');
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const existing = await prisma.taskAttachment.count({ where: { taskId } });
  if (existing >= MAX_ATTACHMENTS) {
    return NextResponse.json({ error: `Maximum ${MAX_ATTACHMENTS} attachments allowed per task` }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed. Only images and documents are permitted.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 10 MB limit' }, { status: 400 });
  }

  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'task-attachments');
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const rawBytes = await file.arrayBuffer();
    let fileBuffer = Buffer.from(rawBytes);
    let mimeType = file.type;

    // Compress raster images to save disk space
    if (COMPRESSIBLE_IMAGE_TYPES.includes(mimeType)) {
      try {
        const compressed = await compressImage(fileBuffer, mimeType);
        fileBuffer = compressed.buffer;
        mimeType = compressed.mimeType;
        logger.debug({ taskId, originalSize: file.size, compressedSize: fileBuffer.length }, 'Image compressed');
      } catch (compressErr) {
        logger.warn({ compressErr, taskId }, 'Image compression failed, storing original');
      }
    }

    const timestamp = Date.now();
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_');
    const ext = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : path.extname(file.name).slice(1) || 'bin';
    const filename = `${timestamp}-${baseName}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, fileBuffer);

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: file.name,
        filePath: `/uploads/task-attachments/${filename}`,
        fileType: mimeType,
        fileSize: fileBuffer.length,
        uploadedById: session.sub,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    logger.info({ taskId, attachmentId: attachment.id, fileName: file.name, savedSize: fileBuffer.length }, 'Task attachment uploaded');
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    logger.error({ error, taskId }, 'Failed to upload task attachment');
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
