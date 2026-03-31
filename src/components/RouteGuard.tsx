'use client';

import { usePathname } from 'next/navigation';
import { checkPathAccess } from '@/lib/navigation-permissions';
import { AccessDenied } from '@/components/AccessDenied';
import { usePermissions } from '@/contexts/PermissionsContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const { permissions, isAdmin, isLoading } = usePermissions();

  // Still loading permissions - don't block rendering
  if (isLoading) {
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
