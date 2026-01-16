import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  // Avoid throwing at build; runtime APIs should fail fast if used without secret
  console.warn('JWT_SECRET is not set. Auth routes will fail until configured.');
}

export type SessionPayload = {
  sub: string; // user id
  name: string; // user name
  role: string; // role name
  departmentId?: string | null;
};

export function signSession(payload: SessionPayload, remember = false) {
  const expiresIn = remember ? '30d' : '1d';
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    // Check if token is invalidated
    const invalidatedTokens = (global as any).__invalidatedTokens || new Set();
    if (invalidatedTokens.has(token)) {
      return null;
    }
    
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch (e) {
    return null;
  }
}
