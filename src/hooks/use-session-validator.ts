'use client';

/**
 * Session Validator Hook
 * Validates and refreshes user session on app load
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  department?: string;
}

interface SessionValidationResult {
  valid: boolean;
  refreshed: boolean;
  user?: SessionUser;
}

export function useSessionValidator() {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    async function validateSession() {
      try {
        const response = await fetch('/api/auth/session');
        
        if (!response.ok) {
          // Session invalid, redirect to login
          console.warn('Session invalid, redirecting to login');
          router.push('/login');
          return;
        }

        const data: SessionValidationResult = await response.json();
        
        if (data.valid) {
          setSessionValid(true);
          
          if (data.refreshed) {
            console.log('Session refreshed with updated user data');
            // Optionally trigger a page reload to ensure all components get fresh data
            // window.location.reload();
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Session validation error:', error);
        // Don't redirect on network errors, allow retry
        setSessionValid(true); // Assume valid to avoid blocking user
      } finally {
        setIsValidating(false);
      }
    }

    validateSession();
  }, [router]);

  return { isValidating, sessionValid };
}
