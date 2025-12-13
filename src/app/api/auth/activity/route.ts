import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, signSession } from '@/lib/jwt';

const cookieName = process.env.COOKIE_NAME || 'ots_session';

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(cookieName)?.value;

    if (!token) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Create a new token with updated timestamp (extends session)
    const newToken = signSession({
      sub: session.sub,
      name: session.name,
      role: session.role,
      departmentId: session.departmentId,
    }, false);

    // Update cookie with new token
    store.set(cookieName, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 1 day
      path: '/',
    });

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error('Activity update error:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}
