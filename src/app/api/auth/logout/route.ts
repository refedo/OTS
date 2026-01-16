import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { logSystemEvent } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  
  // Get session before clearing cookie for logging
  const token = request.cookies.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  
  // Invalidate session on server side by adding to invalidation list
  if (token && session) {
    try {
      // Store invalidated token in a simple in-memory store (for production, use Redis)
      const invalidatedTokens = (global as any).__invalidatedTokens || new Set();
      invalidatedTokens.add(token);
      (global as any).__invalidatedTokens = invalidatedTokens;
      
      // Clean up old tokens (keep only last 1000)
      if (invalidatedTokens.size > 1000) {
        const tokensArray = Array.from(invalidatedTokens);
        (global as any).__invalidatedTokens = new Set(tokensArray.slice(-500));
      }
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }
  
  // Log logout event if we have a session
  if (session) {
    try {
      await logSystemEvent({
        eventType: 'logout',
        category: 'auth',
        title: `User logged out: ${session.name}`,
        description: `${session.name} logged out`,
        userId: session.sub,
        metadata: { role: session.role },
      });
    } catch (error) {
      console.error('Failed to log logout event:', error);
      // Continue with logout even if logging fails
    }
  }
  
  // Build the redirect URL - always redirect to /login
  // Use the request URL to determine the base
  const requestUrl = new URL(request.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  
  // In production, use the correct domain and base path
  let loginUrl: string;
  if (process.env.NODE_ENV === 'production') {
    // Production: redirect to ots.hexasteel.sa/login
    loginUrl = 'https://ots.hexasteel.sa/login';
  } else {
    // Development: use the request host
    loginUrl = `${baseUrl}/login`;
  }
  
  const res = NextResponse.redirect(loginUrl, { status: 302 });
  
  // Clear the session cookie with all necessary attributes
  // Use delete() method for more reliable cookie removal
  res.cookies.delete({
    name: cookieName,
    path: '/',
    domain: requestUrl.hostname === 'localhost' ? undefined : '.hexasteel.sa',
  });
  
  // Also set to empty with maxAge 0 as backup
  res.cookies.set(cookieName, '', {
    httpOnly: true,
    secure: requestUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  
  return res;
}
