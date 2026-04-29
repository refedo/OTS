import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { generateAuthUrl } from '@/lib/services/google-calendar.service';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await checkPermission('meetings.google_calendar');
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = generateAuthUrl();
  if (!url) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ url });
}
