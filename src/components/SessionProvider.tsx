'use client';

/**
 * Session Provider Component
 * Validates user session on initial load and when page becomes visible
 * Re-validates when user returns to page (e.g., after clicking back button)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SessionActivityProvider } from './session-activity-provider';
import { UpdateNotificationDialog } from './update-notification-dialog';

interface SessionProviderProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function SessionProvider({ children }: SessionProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isValidating, setIsValidating] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const hasValidated = useRef(false);

  const validateSession = useCallback(async (isVisibilityCheck = false) => {
    // Skip validation for public paths
    if (PUBLIC_PATHS.includes(pathname)) {
      setIsValidating(false);
      setSessionValid(true);
      return;
    }

    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.warn('Session invalid, redirecting to login');
        setShouldRedirect(true);
        setIsValidating(false);
        setSessionValid(false);
        window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
        return;
      }

      const data = await response.json();
      
      if (data.valid) {
        setSessionValid(true);
      } else {
        setShouldRedirect(true);
        setIsValidating(false);
        setSessionValid(false);
        window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
        return;
      }
    } catch (error) {
      console.error('Session validation error:', error);
      setShouldRedirect(true);
      setIsValidating(false);
      setSessionValid(false);
      window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
      return;
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
        // Re-validate session when page becomes visible
        validateSession(true);
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // bfcache (back-forward cache) restoration
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
          {children}
        </SessionActivityProvider>
      </NotificationProvider>
    );
  }

  // For public paths or while redirecting
  return <>{children}</>;
}
