import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { nextcloudService } from '@/lib/services/nextcloud.service';
import { logger } from '@/lib/logger';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const POST = withApiContext(async (req: NextRequest, session): Promise<NextResponse<unknown>> => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const entityType = formData.get('entityType') as string | null;
  const entityId = formData.get('entityId') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 10 MB limit' }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await nextcloudService.upload({
      buffer,
      fileName: file.name,
      mimeType: file.type,
      entityType,
      entityId,
      uploadedById: session!.userId,
    });

    return NextResponse.json({ ...result, storageBackend: 'nextcloud' });
  } catch (error) {
    logger.error({ error, entityType, entityId }, '[Nextcloud] Upload failed');
    return NextResponse.json({ error: 'Upload failed', message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
});
