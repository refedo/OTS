import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import db from '@/lib/db';
import { hasPermission, hasAnyPermission, hasAllPermissions } from './permissions';

// Server-side permission checker
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

  const permissions = (user.role.permissions as string[]) || [];
  return hasPermission(permissions, requiredPermission);
}

// Server-side check for any permission
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

  const permissions = (user.role.permissions as string[]) || [];
  return hasAnyPermission(permissions, requiredPermissions);
}

// Server-side check for all permissions
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

  const permissions = (user.role.permissions as string[]) || [];
  return hasAllPermissions(permissions, requiredPermissions);
}

// Get current user's permissions
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

  return (user.role.permissions as string[]) || [];
}
