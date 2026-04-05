import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { pointsService } from '@/lib/services/points-service';

// GET /api/points/me — returns current user's points and rank for the TopBar badge
export const GET = withApiContext(async (_req, session) => {
  const stats = await pointsService.getPointsStats(session!.userId);
  const rank = await pointsService.getUserRank(session!.userId);

  return NextResponse.json({
    totalPoints: stats.totalPoints,
    rank,
  });
});
