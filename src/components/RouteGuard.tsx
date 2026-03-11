'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { checkPathAccess } from '@/lib/navigation-permissions';
import { AccessDenied } from '@/components/AccessDenied';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setPermissions(data.permissions ?? []);
          setIsAdmin(data.isAdmin ?? false);
        }
      })
      .catch(() => {
        // Auth failures are handled by SessionProvider/middleware
      });
    return () => { cancelled = true; };
  }, []);

  // Still loading permissions - don't block rendering
  if (permissions === null) {
    return <>{children}</>;
  }

  // Admins bypass all route permission checks
  if (isAdmin) {
    return <>{children}</>;
  }

  const { allowed } = checkPathAccess(permissions, pathname);

  if (!allowed) {
    return <AccessDenied modulePath={pathname} />;
  }

  return <>{children}</>;
}
