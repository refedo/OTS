'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';

export default function TopBar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const tracker = (window as any).__sessionActivityTracker;
      if (tracker) {
        tracker.stop();
        delete (window as any).__sessionActivityTracker;
      }

      localStorage.clear();
      sessionStorage.clear();

      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});

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
    <div className="fixed top-0 right-0 z-50 flex items-center gap-1 p-2 lg:p-3">
      <GlobalSearch />
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
