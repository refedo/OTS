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
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        const data = await response.json();
        
        if (data.valid) {
          setSessionValid(true);
        } else {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
        }
      } catch (error) {
        console.error('Session validation error:', error);
        // On network error, allow through but log warning
        setSessionValid(true);
      } finally {
        setIsValidating(false);
      }
    }

    validateSession();
  }, [pathname, router]);

  // Show loading state while validating (only on initial load)
  if (isValidating && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  // For authenticated pages, wrap with activity tracker and notification provider
  if (!PUBLIC_PATHS.includes(pathname)) {
    return (
      <NotificationProvider>
        <SessionActivityProvider>
          {children}
        </SessionActivityProvider>
      </NotificationProvider>
    );
  }

  return <>{children}</>;
}
