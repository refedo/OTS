import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '� Points & Rewards Incentive System',
  highlights: [
    'Gamification system that awards points for completing tasks with bonuses for on-time completion and high-priority tasks',
    'Dashboard widget showing total points, rank, current streak, badges, and leaderboard',
    'Streak tracking with bonuses at 3-day, 7-day, and 30-day milestones',
    'PWA install prompt now has "Don\'t show again" button',
    'Delayed tasks popup now shows once daily instead of every page load',
  ],
  changes: {
    added: [
      {
        title: 'Points & Rewards System',
        items: [
          'user_points table — stores total points, lifetime points, current streak, longest streak per user',
          'point_transactions table — detailed log of all point changes (earn, spend, bonus, adjustment)',
          'point_rules table — configurable rules for point earning with multipliers',
          'user_badges table — tracks badges/achievements earned by users',
          'Points service with automatic awarding on task completion',
        ],
      },
      {
        title: 'Point Rules',
        items: [
          'Base: 10 points per task completion',
          'On-time bonus: +5 points for completing before/on due date',
          'Early bird bonus: +10 points for completing 2+ days early',
          'High priority multiplier: 1.5x for high-priority tasks',
          'Streak bonuses: +15 (3-day), +50 (7-day), +200 (30-day)',
        ],
      },
      {
        title: 'Dashboard Widget',
        items: [
          'Overview tab: Total points, rank, current streak, this week/month earnings, badges',
          'Leaderboard tab: Top 5 users with rank indicators (gold/silver/bronze)',
          'History tab: Recent point transactions with timestamps',
        ],
      },
      {
        title: 'API Routes',
        items: [
          'GET /api/points — current user\'s points stats, badges, and transactions',
          'POST /api/points — manual point adjustment (Admin/CEO only)',
          'GET /api/points/leaderboard — company-wide or department leaderboard',
          'GET/POST/PUT /api/points/rules — manage point rules',
        ],
      },
    ],
    changed: [
      'Task completion now automatically awards points based on priority, due date, and timing',
      'PWA install prompt has "Don\'t show again" button that persists permanently',
      'Delayed tasks popup shows once daily instead of once per session',
    ],
    fixed: [
      'Chart of accounts sync from Dolibarr now tries multiple API endpoints for compatibility',
    ],
  },
};

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  let alreadySeen = false;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { customPermissions: true },
      });
      const perms = user?.customPermissions as Record<string, unknown> | null;
      if (perms?.lastSeenVersion === CURRENT_VERSION.version) {
        alreadySeen = true;
      }
    } catch {
      // Non-critical; fall back to client-side check
    }
  }

  return NextResponse.json({ ...CURRENT_VERSION, alreadySeen });
}
