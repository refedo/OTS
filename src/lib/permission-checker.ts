import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import db from '@/lib/db';
import { hasPermission, hasAnyPermission, hasAllPermissions, ALL_PERMISSIONS } from './permissions';
import { filterPermissionsByModules } from './module-restrictions';

// Helper: resolve effective permissions for a user (handles isAdmin, role, module restrictions)
async function resolveUserPermissions(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || !user.role) return [];

  // isAdmin flag grants all permissions regardless of role
  if (user.isAdmin) {
    return ALL_PERMISSIONS.map(p => p.id);
  }

  let permissions = (user.role.permissions as string[]) || [];
  const restrictedModules = (user.role.restrictedModules as string[]) || [];
  
  // Apply module restrictions if any
  if (restrictedModules.length > 0) {
    permissions = filterPermissionsByModules(permissions, restrictedModules);
  }

  return permissions;
}

// Server-side permission checker with module restrictions support
export async function checkPermission(requiredPermission: string): Promise<boolean> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) return false;

  const permissions = await resolveUserPermissions(session.sub);
  return hasPermission(permissions, requiredPermission);
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
