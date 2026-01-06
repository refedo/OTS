'use client';

/**
 * Session Provider Component
 * Validates user session ONCE on initial load only
 * Does NOT re-validate on every route change to prevent refresh issues
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SessionActivityProvider } from './session-activity-provider';

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

  useEffect(() => {
    // Skip validation for public paths
    if (PUBLIC_PATHS.includes(pathname)) {
      setIsValidating(false);
      setSessionValid(true);
      return;
    }

    // Only validate ONCE on initial mount, not on every route change
    if (hasValidated.current) {
      return;
    }

    hasValidated.current = true;

    async function validateSession() {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          console.warn('Session invalid, redirecting to login');
          setShouldRedirect(true);
          setIsValidating(false);
          // Use window.location for a full page redirect to avoid client-side errors
          window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
          return;
        }

        const data = await response.json();
        
        if (data.valid) {
          setSessionValid(true);
        } else {
          setShouldRedirect(true);
          setIsValidating(false);
          window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
          return;
        }
      } catch (error) {
        console.error('Session validation error:', error);
        // On network error, redirect to login
        setShouldRedirect(true);
        setIsValidating(false);
        window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
        return;
      } finally {
        setIsValidating(false);
      }
    }

    validateSession();
  }, [pathname, router]);

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
          {children}
        </SessionActivityProvider>
      </NotificationProvider>
    );
  }

  // For public paths or while redirecting
  return <>{children}</>;
}
