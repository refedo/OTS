import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import db from '@/lib/db';
import { hasPermission, hasAnyPermission, hasAllPermissions } from './permissions';
import { filterPermissionsByModules } from './module-restrictions';

// Server-side permission checker with module restrictions support
export async function checkPermission(requiredPermission: string): Promise<boolean> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) return false;

  // Fetch user with role and permissions
  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });

  if (!user || !user.role) return false;

  let permissions = (user.role.permissions as string[]) || [];
  const restrictedModules = (user.role.restrictedModules as string[]) || [];
  
  // Apply module restrictions if any
  if (restrictedModules.length > 0) {
    permissions = filterPermissionsByModules(permissions, restrictedModules);
  }

  return hasPermission(permissions, requiredPermission);
}

// Server-side check for any permission with module restrictions support
export async function checkAnyPermission(requiredPermissions: string[]): Promise<boolean> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) return false;

  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });

  if (!user || !user.role) return false;

  let permissions = (user.role.permissions as string[]) || [];
  const restrictedModules = (user.role.restrictedModules as string[]) || [];
  
  // Apply module restrictions if any
  if (restrictedModules.length > 0) {
    permissions = filterPermissionsByModules(permissions, restrictedModules);
  }

  return hasAnyPermission(permissions, requiredPermissions);
}

// Server-side check for all permissions with module restrictions support
export async function checkAllPermissions(requiredPermissions: string[]): Promise<boolean> {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) return false;

  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });

  if (!user || !user.role) return false;

  let permissions = (user.role.permissions as string[]) || [];
  const restrictedModules = (user.role.restrictedModules as string[]) || [];
  
  // Apply module restrictions if any
  if (restrictedModules.length > 0) {
    permissions = filterPermissionsByModules(permissions, restrictedModules);
  }

  return hasAllPermissions(permissions, requiredPermissions);
}

// Get current user's permissions with module restrictions applied
export async function getCurrentUserPermissions(): Promise<string[]> {
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

  let permissions = (user.role.permissions as string[]) || [];
  const restrictedModules = (user.role.restrictedModules as string[]) || [];
  
  // Apply module restrictions if any
  if (restrictedModules.length > 0) {
    permissions = filterPermissionsByModules(permissions, restrictedModules);
  }

  return permissions;
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
