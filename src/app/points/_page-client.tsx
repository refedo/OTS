'use client';

import { useState, useEffect } from 'react';
import { Star, Flame, Trophy, Medal, Award, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type LeaderboardEntry = {
  user_id: string;
  user_name: string;
  position: string | null;
  department_name: string | null;
  total_points: number;
  lifetime_points: number;
  current_streak: number;
  badge_count: number;
  rank: number;
  isCurrentUser: boolean;
};

type CurrentUser = {
  rank: number | null;
  totalPoints: number;
  lifetimePoints: number;
  currentStreak: number;
  longestStreak: number;
  badgeCount: number;
  thisWeekPoints: number;
  thisMonthPoints: number;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  currentUser: CurrentUser;
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="size-5 text-amber-400" />;
  if (rank === 2) return <Medal className="size-5 text-slate-400" />;
  if (rank === 3) return <Award className="size-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{rank}</span>;
}

export default function PointsPageClient() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/points/leaderboard?limit=${limit}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Star className="size-6 text-amber-500 fill-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Points Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Rankings based on total current points</p>
        </div>
      </div>

      {/* Current user stats */}
      {data?.currentUser && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Your Points</p>
              <p className="text-2xl font-bold text-amber-500">{data.currentUser.totalPoints.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Your Rank</p>
              <p className="text-2xl font-bold">
                {data.currentUser.rank ? `#${data.currentUser.rank}` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Current Streak</p>
              <div className="flex items-center gap-1.5">
                <Flame className="size-5 text-orange-500" />
                <p className="text-2xl font-bold">{data.currentUser.currentStreak}</p>
                <span className="text-xs text-muted-foreground">days</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <p className="text-2xl font-bold text-emerald-500">+{data.currentUser.thisMonthPoints.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" />
            Top {limit} Performers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.leaderboard.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Star className="size-10 mx-auto mb-3 opacity-20" />
              <p>No leaderboard data yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.leaderboard.map((entry) => (
                <div
                  key={entry.user_id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors',
                    entry.isCurrentUser && 'bg-amber-500/5 border-l-2 border-l-amber-500',
                  )}
                >
                  <div className="w-6 flex items-center justify-center shrink-0">
                    <RankIcon rank={entry.rank} />
                  </div>

                  <div
                    className={cn(
                      'size-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                      entry.isCurrentUser ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {entry.user_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{entry.user_name}</span>
                      {entry.isCurrentUser && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500 text-amber-600">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.position && (
                        <span className="text-[11px] text-muted-foreground truncate">{entry.position}</span>
                      )}
                      {entry.department_name && (
                        <span className="text-[11px] text-muted-foreground/60 truncate">· {entry.department_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right">
                    {entry.current_streak > 0 && (
                      <div className="hidden sm:flex items-center gap-1 text-orange-500">
                        <Flame className="size-3.5" />
                        <span className="text-xs font-medium">{entry.current_streak}d</span>
                      </div>
                    )}
                    {entry.badge_count > 0 && (
                      <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
                        <Award className="size-3.5" />
                        <span className="text-xs">{entry.badge_count}</span>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="font-bold text-sm text-amber-500">{Number(entry.total_points).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">pts</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.leaderboard.length >= limit && limit < 50 && (
        <div className="text-center">
          <button
            onClick={() => setLimit(prev => Math.min(prev + 20, 50))}
            className="text-sm text-primary hover:underline"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
