import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { pointsService } from '@/lib/services/points-service';
import { z } from 'zod';

// GET /api/points - Get current user's points stats
export const GET = withApiContext(async (req, session) => {
  const stats = await pointsService.getPointsStats(session!.userId);
  const badges = await pointsService.getUserBadges(session!.userId);
  const recentTransactions = await pointsService.getRecentTransactions(session!.userId, 10);

  return NextResponse.json({
    stats,
    badges,
    recentTransactions
  });
});

// POST /api/points - Manual adjustment (admin only)
const adjustmentSchema = z.object({
  userId: z.string().uuid(),
  points: z.number().int(),
  reason: z.string().min(1).max(500)
});

export const POST = withApiContext(async (req, session) => {
  if (!['Admin', 'CEO'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = adjustmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, points, reason } = parsed.data;

  await pointsService.manualAdjustment(userId, points, reason, session!.userId);

  return NextResponse.json({ success: true });
});
