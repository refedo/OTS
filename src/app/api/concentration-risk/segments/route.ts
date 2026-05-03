import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';
import { hasPermission } from '@/lib/permissions';
import { getSegmentConcentration } from '@/lib/concentration-risk/segment-risk';
import { parseFilters } from '../_parse-filters';

export const GET = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const permissions = await resolveUserPermissions(session.userId);
  if (!hasPermission(permissions, 'concentrationRisk.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filters = parseFilters(req.nextUrl.searchParams);
  const result = await getSegmentConcentration(filters);
  return NextResponse.json(result);
});
