import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { exchangeCodeAndStore } from '@/lib/services/google-calendar.service';
import { systemEventService } from '@/services/system-events.service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const base = env.NEXT_PUBLIC_APP_URL;
  const settingsUrl = `${base}/settings?tab=integrations`;

  if (error || !code) {
    logger.warn({ service: 'google-calendar', error }, 'Google OAuth callback received error');
    return NextResponse.redirect(`${settingsUrl}&google_calendar=error`);
  }

  const result = await exchangeCodeAndStore(code);
  if (!result) {
    return NextResponse.redirect(`${settingsUrl}&google_calendar=error`);
  }

  systemEventService.log({
    eventType: 'GOOGLE_CALENDAR_CONNECTED',
    eventCategory: 'SYSTEM',
    severity: 'INFO',
    summary: `Google Calendar connected as ${result.email}`,
  });

  return NextResponse.redirect(`${settingsUrl}&google_calendar=connected`);
}
