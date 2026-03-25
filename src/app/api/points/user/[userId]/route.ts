import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { pointsService } from '@/lib/services/points-service';

// GET /api/points/user/[userId] - Get specific user's points (admin or self)
export const GET = withApiContext(async (req, session, context) => {
  const userId = context?.params?.userId;

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Only allow viewing own stats or if admin/manager
  const canView = 
    userId === session!.userId || 
    ['Admin', 'CEO', 'Manager'].includes(session!.role);

  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = await pointsService.getPointsStats(userId);
  const badges = await pointsService.getUserBadges(userId);
  const recentTransactions = await pointsService.getRecentTransactions(userId, 20);
  const rank = await pointsService.getUserRank(userId);

  return NextResponse.json({
    stats: {
      ...stats,
      rank
    },
    badges,
    recentTransactions
  });
});
