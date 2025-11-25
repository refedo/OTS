import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SessionPayload } from '@/lib/jwt';

export type Role = 'Admin' | 'Manager' | 'Engineer' | 'Operator';

export function getSessionFromCookie(token?: string | null): SessionPayload | null {
  if (!token) return null;
  return verifySession(token);
}

export function hasRole(session: SessionPayload | null, roles: Role[]) {
  if (!session) return false;
  return roles.includes(session.role as Role);
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const token = req.cookies.get(cookieName)?.value;
  return getSessionFromCookie(token);
}
