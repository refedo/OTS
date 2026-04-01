import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { openAuditService } from '@/lib/services/open-audit.service';

export const GET = withApiContext(async () => {
  const result = await openAuditService.checkHealth();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
});
