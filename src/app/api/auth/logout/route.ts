import { NextResponse } from 'next/server';

export async function POST() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const res = NextResponse.redirect(new URL('/login', process.env.APP_URL || 'http://localhost:3000'));
  res.headers.append('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  return res;
}
