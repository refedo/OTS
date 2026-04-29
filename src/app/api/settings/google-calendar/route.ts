import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { revokeOAuthToken } from '@/lib/services/google-calendar.service';
import { systemEventService } from '@/services/system-events.service';

export async function DELETE() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await checkPermission('meetings.google_calendar');
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await revokeOAuthToken();

  systemEventService.log({
    eventType: 'GOOGLE_CALENDAR_DISCONNECTED',
    eventCategory: 'SYSTEM',
    severity: 'INFO',
    userId: session.sub,
    summary: `Google Calendar integration disconnected by ${session.name}`,
  });

  return NextResponse.json({ disconnected: true });
}
