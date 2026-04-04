'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import RecentLinksPanel from '@/components/RecentLinksPanel';
import Link from 'next/link';

interface UserPoints {
  totalPoints: number;
  rank: number | null;
}

export default function TopBar() {
  const router = useRouter();
  const [points, setPoints] = useState<UserPoints | null>(null);

  useEffect(() => {
    fetch('/api/points/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setPoints(data); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      const tracker = (window as any).__sessionActivityTracker;
      if (tracker) {
        tracker.stop();
        delete (window as any).__sessionActivityTracker;
      }

      // Preserve bookmarks across logout — they're user-device preferences, not session data
      const savedBookmarks = localStorage.getItem('ots_bookmarks');
      localStorage.clear();
      if (savedBookmarks) localStorage.setItem('ots_bookmarks', savedBookmarks);
      sessionStorage.clear();

      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});

      const loginUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://ots.hexasteel.sa/login?t=' + Date.now()
          : '/login?t=' + Date.now();

      window.location.href = loginUrl;
    } catch {
      const loginUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://ots.hexasteel.sa/login?t=' + Date.now()
          : '/login?t=' + Date.now();
      window.location.href = loginUrl;
    }
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex items-center gap-1 p-2 lg:p-3 print:hidden">
      <GlobalSearch />
      <RecentLinksPanel />
      {points !== null && (
        <Link
          href="/points"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
          title={points.rank ? `Rank #${points.rank}` : 'Your points'}
        >
          <Star className="h-3.5 w-3.5 fill-amber-500" />
          <span>{points.totalPoints.toLocaleString()}</span>
          {points.rank && (
            <span className="text-amber-500/70">#{points.rank}</span>
          )}
        </Link>
      )}
      <NotificationBell />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="Logout"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
}
