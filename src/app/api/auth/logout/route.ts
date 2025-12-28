import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { logSystemEvent } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  
  // Get session before clearing cookie for logging
  const token = request.cookies.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  
  // Log logout event if we have a session
  if (session) {
    await logSystemEvent({
      eventType: 'logout',
      category: 'auth',
      title: `User logged out: ${session.name}`,
      description: `${session.name} logged out`,
      userId: session.sub,
      metadata: { role: session.role },
    });
  }
  
  // Get the origin from the request to handle both localhost and production
  const origin = request.headers.get('origin') || request.headers.get('host') || '';
  const protocol = origin.includes('localhost') ? 'http' : 'https';
  
  // Use APP_URL from env, or construct from request origin
  let baseUrl = process.env.APP_URL;
  if (!baseUrl) {
    const host = request.headers.get('host') || 'localhost:3000';
    baseUrl = `${protocol}://${host}`;
  }
  
  const res = NextResponse.redirect(new URL('/login', baseUrl));
  res.headers.append('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  return res;
}
