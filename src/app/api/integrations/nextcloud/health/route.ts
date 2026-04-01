import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { nextcloudService } from '@/lib/services/nextcloud.service';

export const GET = withApiContext(async () => {
  const result = await nextcloudService.checkHealth();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
});
