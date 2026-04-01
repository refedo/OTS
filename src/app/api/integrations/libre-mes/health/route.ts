import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { libreMesService } from '@/lib/services/libre-mes.service';

export const GET = withApiContext(async () => {
  const result = await libreMesService.checkHealth();
  const allOk = result.influx.ok && result.postgres.ok;
  return NextResponse.json(result, { status: allOk ? 200 : 503 });
});
