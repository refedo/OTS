import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';
import { hasPermission } from '@/lib/permissions';
import { getOverallRisk, buildSummary } from '@/lib/concentration-risk/overall-risk';
import { parseFilters } from '../_parse-filters';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const permissions = await resolveUserPermissions(session.userId);
  if (!hasPermission(permissions, 'concentrationRisk.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filters = parseFilters(req.nextUrl.searchParams);
  const result = await getOverallRisk(filters);
  const summary = buildSummary(result);

  logger.info({ userId: session.userId, filters }, '[ConcentrationRisk] summary viewed');

  return NextResponse.json(summary);
});
