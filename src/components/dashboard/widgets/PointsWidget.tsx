'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Flame, 
  TrendingUp, 
  Medal, 
  Crown, 
  Star,
  Award,
  Zap,
  Target,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PointStats {
  totalPoints: number;
  lifetimePoints: number;
  currentStreak: number;
  longestStreak: number;
  rank: number | null;
  badgeCount: number;
  thisWeekPoints: number;
  thisMonthPoints: number;
}

interface BadgeInfo {
  badge_code: string;
  badge_name: string;
  badge_icon: string;
  earned_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  position: string | null;
  department_name: string | null;
  total_points: number;
  current_streak: number;
  badge_count: number;
  rank: number;
  isCurrentUser: boolean;
}

interface Transaction {
  id: string;
  points: number;
  transaction_type: string;
  source_type: string;
  description: string;
  created_at: string;
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  trophy: <Trophy className="size-4" />,
  flame: <Flame className="size-4" />,
  medal: <Medal className="size-4" />,
  crown: <Crown className="size-4" />,
  star: <Star className="size-4" />,
  award: <Award className="size-4" />,
  zap: <Zap className="size-4" />,
  target: <Target className="size-4" />
};

export default function PointsWidget() {
  const [stats, setStats] = useState<PointStats | null>(null);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pointsRes, leaderboardRes] = await Promise.all([
        fetch('/api/points'),
        fetch('/api/points/leaderboard?limit=5')
      ]);

      if (pointsRes.ok) {
        const data = await pointsRes.json();
        setStats(data.stats);
        setBadges(data.badges || []);
        setTransactions(data.recentTransactions || []);
      }

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      // Silent fail - widget will show empty state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getRankChange = (rank: number | null) => {
    // This would compare to previous rank - simplified for now
    return null;
  };

  const formatPoints = (points: number) => {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="size-5 text-amber-500" />
          Points & Rewards
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent h-9">
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 text-xs">Leaderboard</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-4 space-y-4 mt-0">
            {/* Points Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg p-3 text-white">
                <div className="text-xs opacity-80">Total Points</div>
                <div className="text-2xl font-bold">{formatPoints(stats?.totalPoints || 0)}</div>
                {stats?.rank && (
                  <div className="text-xs opacity-80 flex items-center gap-1 mt-1">
                    <Medal className="size-3" />
                    Rank #{stats.rank}
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-lg p-3 text-white">
                <div className="text-xs opacity-80">Current Streak</div>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <Flame className="size-5" />
                  {stats?.currentStreak || 0}
                </div>
                <div className="text-xs opacity-80 mt-1">
                  Best: {stats?.longestStreak || 0} days
                </div>
              </div>
            </div>

            {/* This Period */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">This Week</div>
                <div className="text-lg font-semibold text-green-600">
                  +{stats?.thisWeekPoints || 0}
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">This Month</div>
                <div className="text-lg font-semibold text-blue-600">
                  +{stats?.thisMonthPoints || 0}
                </div>
              </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Badges Earned ({badges.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {badges.slice(0, 6).map((badge) => (
                    <Badge
                      key={badge.badge_code}
                      variant="secondary"
                      className="flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                    >
                      {BADGE_ICONS[badge.badge_icon] || <Star className="size-3" />}
                      <span className="text-xs">{badge.badge_name}</span>
                    </Badge>
                  ))}
                  {badges.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{badges.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="p-4 mt-0">
            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No leaderboard data yet
                </div>
              ) : (
                leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      entry.isCurrentUser 
                        ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      entry.rank === 1 && "bg-amber-500 text-white",
                      entry.rank === 2 && "bg-gray-400 text-white",
                      entry.rank === 3 && "bg-amber-700 text-white",
                      entry.rank > 3 && "bg-muted text-muted-foreground"
                    )}>
                      {entry.rank <= 3 ? (
                        entry.rank === 1 ? <Crown className="size-3" /> :
                        entry.rank === 2 ? <Medal className="size-3" /> :
                        <Award className="size-3" />
                      ) : entry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {entry.user_name}
                        {entry.isCurrentUser && (
                          <span className="text-xs text-muted-foreground ml-1">(You)</span>
                        )}
                      </div>
                      {entry.department_name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {entry.department_name}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {formatPoints(entry.total_points)}
                      </div>
                      {entry.current_streak > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center justify-end gap-0.5">
                          <Flame className="size-3 text-orange-500" />
                          {entry.current_streak}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-4 mt-0">
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No transactions yet. Complete tasks to earn points!
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className={cn(
                      "text-sm font-semibold ml-2",
                      tx.points >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {tx.points >= 0 ? '+' : ''}{tx.points}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
