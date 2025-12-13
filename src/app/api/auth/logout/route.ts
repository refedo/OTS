import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  
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
