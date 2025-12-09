'use client';

/**
 * Session Provider Component
 * Validates user session on mount and shows loading state
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SessionProviderProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function SessionProvider({ children }: SessionProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isValidating, setIsValidating] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    // Skip validation for public paths
    if (PUBLIC_PATHS.includes(pathname)) {
      setIsValidating(false);
      setSessionValid(true);
      return;
    }

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
          
          if (data.refreshed) {
            console.log('Session refreshed with updated user data');
          }
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

  // Show loading state while validating
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

  return <>{children}</>;
}
