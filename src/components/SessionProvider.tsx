'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SessionActivityProvider } from './session-activity-provider';
import { UpdateNotificationDialog } from './update-notification-dialog';
import { DelayedTasksNotificationDialog } from './delayed-tasks-notification-dialog';

interface SessionProviderProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

// Only re-check session on visibility change if this much time has passed since the last check.
const REVALIDATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function redirectToLogin(pathname: string) {
  window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const pathname = usePathname();
  const [isValidating, setIsValidating] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const hasValidated = useRef(false);
  const lastValidatedAt = useRef<number>(0);

  const validateSession = useCallback(async (isVisibilityCheck = false) => {
    if (PUBLIC_PATHS.includes(pathname)) {
      setIsValidating(false);
      setSessionValid(true);
      return;
    }

    // Visibility re-checks are rate-limited to avoid hammering the DB on every tab switch.
    if (isVisibilityCheck) {
      const msSinceLast = Date.now() - lastValidatedAt.current;
      if (msSinceLast < REVALIDATION_COOLDOWN_MS) return;
    }

    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });

      // Only redirect to login for explicit auth failures (401).
      // 5xx / network issues are transient server problems — keep the user where they are.
      if (response.status === 401) {
        setShouldRedirect(true);
        setIsValidating(false);
        setSessionValid(false);
        redirectToLogin(pathname);
        return;
      }

      if (!response.ok) {
        // Server error — don't kick the user out, just log and continue.
        console.warn('Session check returned', response.status, '— keeping current session');
        setSessionValid(true);
        setIsValidating(false);
        lastValidatedAt.current = Date.now();
        return;
      }

      const data = await response.json();

      if (data.valid) {
        setSessionValid(true);
        lastValidatedAt.current = Date.now();
      } else {
        // Server explicitly said session is not valid.
        setShouldRedirect(true);
        setIsValidating(false);
        setSessionValid(false);
        redirectToLogin(pathname);
        return;
      }
    } catch (error) {
      // Network / fetch error — don't redirect. Assume session is still valid.
      console.warn('Session validation network error — keeping current session:', error);
      setSessionValid(true);
    } finally {
      setIsValidating(false);
    }
  }, [pathname]);

  // Initial validation on mount
  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) {
      setIsValidating(false);
      setSessionValid(true);
      return;
    }

    if (hasValidated.current) {
      return;
    }

    hasValidated.current = true;
    validateSession();
  }, [pathname, validateSession]);

  // Re-validate when page becomes visible (handles back button after logout)
  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validateSession(true);
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        validateSession(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [pathname, validateSession]);

  // Show loading state while validating or redirecting
  if ((isValidating || shouldRedirect) && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">
            {shouldRedirect ? 'Redirecting to login...' : 'Validating session...'}
          </p>
        </div>
      </div>
    );
  }

  // For authenticated pages, wrap with activity tracker and notification provider
  if (!PUBLIC_PATHS.includes(pathname) && sessionValid) {
    return (
      <NotificationProvider>
        <SessionActivityProvider>
          <UpdateNotificationDialog />
          <DelayedTasksNotificationDialog />
          {children}
        </SessionActivityProvider>
      </NotificationProvider>
    );
  }

  // For public paths or while redirecting
  return <>{children}</>;
}
