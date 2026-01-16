'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionActivityTracker } from '@/lib/session-activity';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SessionActivityProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [tracker, setTracker] = useState<SessionActivityTracker | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(5);

  useEffect(() => {
    const activityTracker = new SessionActivityTracker(
      () => {
        setShowWarning(true);
      },
      () => {
        // Clean up everything before redirect
        (window as any).__sessionActivityTracker?.stop();
        delete (window as any).__sessionActivityTracker;
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/login?reason=idle&t=' + Date.now());
      }
    );

    activityTracker.start();
    setTracker(activityTracker);
    
    // Store tracker globally for logout access
    (window as any).__sessionActivityTracker = activityTracker;

    return () => {
      activityTracker.stop();
      delete (window as any).__sessionActivityTracker;
    };
  }, []);

  useEffect(() => {
    if (!showWarning || !tracker) return;

    const interval = setInterval(() => {
      const remaining = tracker.getRemainingTime();
      const minutes = Math.ceil(remaining / 60000);
      setRemainingMinutes(minutes);

      if (minutes <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning, tracker]);

  const handleContinue = () => {
    if (tracker) {
      tracker.resetActivity();
    }
    setShowWarning(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    window.location.href = '/login';
  };

  return (
    <>
      {children}
      
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session Timeout Warning</DialogTitle>
            <DialogDescription>
              Your session will expire in <strong>{remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''}</strong> due to inactivity.
              <br /><br />
              Click "Continue Working" to stay logged in, or you will be automatically logged out for security reasons.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleLogout}>
              Logout Now
            </Button>
            <Button onClick={handleContinue}>
              Continue Working
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
