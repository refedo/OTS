import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { nextcloudService } from '@/lib/services/nextcloud.service';
import { logger } from '@/lib/logger';

const shareSchema = z.object({
  remotePath: z.string().min(1).startsWith('/'),
  shareType: z.union([z.literal(0), z.literal(3)]).default(0),
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const POST = withApiContext(async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const body = await req.json();
  const parsed = shareSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { remotePath, shareType, password, expiresAt } = parsed.data;

  try {
    const result = await nextcloudService.share({
      remotePath,
      shareType,
      password,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, remotePath }, '[Nextcloud] Share creation failed');
    return NextResponse.json({ error: 'Share creation failed', message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
});
