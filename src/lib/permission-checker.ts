import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import db from '@/lib/db';
import { hasPermission, hasAnyPermission, hasAllPermissions } from './permissions';
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';
import { logger } from '@/lib/logger';

// Server-side permission checker with module restrictions support
export async function checkPermission(requiredPermission: string): Promise<boolean> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    logger.warn({ requiredPermission }, '[RBAC] No session found, denying permission');
    return false;
  }

  const permissions = await resolveUserPermissions(session.sub);
  const hasAccess = hasPermission(permissions, requiredPermission);
  
  logger.info({ 
    userId: session.sub, 
    userName: session.name,
    requiredPermission, 
    hasAccess,
    hasPermissionInArray: permissions.includes(requiredPermission)
  }, '[RBAC] Permission check result');
  
  return hasAccess;
}

// Server-side check for any permission with module restrictions support
export async function checkAnyPermission(requiredPermissions: string[]): Promise<boolean> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) return false;

  const permissions = await resolveUserPermissions(session.sub);
  return hasAnyPermission(permissions, requiredPermissions);
}

// Server-side check for all permissions with module restrictions support
export async function checkAllPermissions(requiredPermissions: string[]): Promise<boolean> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) return false;

  const permissions = await resolveUserPermissions(session.sub);
  return hasAllPermissions(permissions, requiredPermissions);
}

// Get current user's permissions with module restrictions applied
export async function getCurrentUserPermissions(): Promise<string[]> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) return [];

  return resolveUserPermissions(session.sub);
}

// Get current user's restricted modules
export async function getCurrentUserRestrictedModules(): Promise<string[]> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) return [];

  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });

  if (!user || !user.role) return [];

  return (user.role.restrictedModules as string[]) || [];
}
