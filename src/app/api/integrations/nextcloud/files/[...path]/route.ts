import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { nextcloudService } from '@/lib/services/nextcloud.service';
import { logger } from '@/lib/logger';

function getRemotePath(context: { params: Record<string, string> } | undefined): string {
  const pathSegments = (context?.params as unknown as { path?: string[] })?.path ?? [];
  return '/' + pathSegments.join('/');
}

export const GET = withApiContext(async (_req: NextRequest, _session, context): Promise<NextResponse<unknown>> => {
  const remotePath = getRemotePath(context);

  if (remotePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const { buffer, mimeType, fileName } = await nextcloudService.download(remotePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType ?? 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    logger.error({ error, remotePath }, '[Nextcloud] Download failed');
    return NextResponse.json({ error: 'File not found or download failed' }, { status: 404 });
  }
});

export const DELETE = withApiContext(async (_req: NextRequest, session, context): Promise<NextResponse<unknown>> => {
  if (!['Admin', 'Manager'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const remotePath = getRemotePath(context);

  if (remotePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    await nextcloudService.delete(remotePath);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error({ error, remotePath }, '[Nextcloud] Delete failed');
    return NextResponse.json({ error: 'Delete failed', message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
});
