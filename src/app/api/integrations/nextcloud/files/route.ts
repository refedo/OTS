import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { nextcloudService } from '@/lib/services/nextcloud.service';

const listSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

export const GET = withApiContext(async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const { searchParams } = new URL(req.url);
  const parsed = listSchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'entityType and entityId are required', details: parsed.error.flatten() }, { status: 400 });
  }

  const files = await nextcloudService.listForEntity(parsed.data.entityType, parsed.data.entityId);
  return NextResponse.json(files);
});
