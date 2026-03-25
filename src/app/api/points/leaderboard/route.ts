import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { pointsService } from '@/lib/services/points-service';

// GET /api/points/leaderboard - Get points leaderboard
export const GET = withApiContext(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
  const departmentId = searchParams.get('departmentId') || undefined;

  const leaderboard = await pointsService.getLeaderboard(limit, departmentId);

  // Get current user's rank
  const userRank = await pointsService.getUserRank(session!.userId);
  const userStats = await pointsService.getPointsStats(session!.userId);

  return NextResponse.json({
    leaderboard: leaderboard.map(entry => ({
      ...entry,
      total_points: Number(entry.total_points),
      lifetime_points: Number(entry.lifetime_points),
      current_streak: Number(entry.current_streak),
      badge_count: Number(entry.badge_count),
      rank: Number(entry.rank),
      isCurrentUser: entry.user_id === session!.userId
    })),
    currentUser: {
      rank: userRank,
      ...userStats
    }
  });
});
