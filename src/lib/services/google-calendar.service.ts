import { google } from 'googleapis';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';

interface MeetLinkResult {
  meetLink: string;
  googleEventId: string;
  htmlLink: string;
}

interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails?: string[];
  organizerEmail?: string;
}

// ─── OAuth2 client factory ────────────────────────────────────────────────────

function getOAuth2Client() {
  return new google.auth.OAuth2(
    env.GOOGLE_OAUTH_CLIENT_ID,
    env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${env.NEXT_PUBLIC_APP_URL}/api/settings/google-calendar/callback`,
  );
}

async function getAuthenticatedClient() {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return null;
  }

  const token = await prisma.googleOAuthToken.findUnique({ where: { id: 1 } });
  if (!token) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  // Auto-persist refreshed access token
  oauth2Client.on('tokens', async (tokens) => {
    try {
      await prisma.googleOAuthToken.update({
        where: { id: 1 },
        data: {
          accessToken: tokens.access_token!,
          ...(tokens.expiry_date && { expiresAt: new Date(tokens.expiry_date) }),
        },
      });
      logger.info({ service: 'google-calendar' }, 'Access token auto-refreshed and persisted');
    } catch (err) {
      logger.warn({ service: 'google-calendar', err }, 'Failed to persist refreshed access token');
    }
  });

  return oauth2Client;
}

// ─── Public: generate OAuth consent URL ──────────────────────────────────────

export function generateAuthUrl(): string | null {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) return null;

  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

// ─── Public: exchange code for tokens and persist ────────────────────────────

export async function exchangeCodeAndStore(code: string): Promise<{ email: string } | null> {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) return null;

  const oauth2Client = getOAuth2Client();
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    await prisma.googleOAuthToken.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
        email: userInfo.email!,
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
        email: userInfo.email!,
      },
    });

    logger.info({ service: 'google-calendar', email: userInfo.email }, 'Google Calendar OAuth token stored');
    return { email: userInfo.email! };
  } catch (err) {
    logger.error({ service: 'google-calendar', err }, 'Failed to exchange OAuth code for tokens');
    return null;
  }
}

// ─── Public: disconnect (delete stored token) ────────────────────────────────

export async function revokeOAuthToken(): Promise<void> {
  await prisma.googleOAuthToken.deleteMany({});
  logger.info({ service: 'google-calendar' }, 'Google Calendar OAuth token revoked');
}

// ─── Public: connection status ────────────────────────────────────────────────

export async function getOAuthStatus(): Promise<{ connected: boolean; email: string | null; updatedAt: Date | null }> {
  const token = await prisma.googleOAuthToken.findUnique({
    where: { id: 1 },
    select: { email: true, updatedAt: true },
  });
  return { connected: !!token, email: token?.email ?? null, updatedAt: token?.updatedAt ?? null };
}

// ─── Public: create a Google Calendar event with Meet link ───────────────────

export async function createGoogleMeetLink(params: CreateEventParams): Promise<MeetLinkResult | null> {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    logger.info({ service: 'google-calendar' }, 'Google Calendar not configured — skipping Meet link generation');
    return null;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startTime.toISOString(), timeZone: 'Asia/Riyadh' },
        end: { dateTime: params.endTime.toISOString(), timeZone: 'Asia/Riyadh' },
        conferenceData: {
          createRequest: {
            requestId: `ots-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        attendees: (params.attendeeEmails ?? []).map((email) => ({ email })),
      },
    });

    const data = event.data;
    const meetLink = data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri;
    const googleEventId = data.id;
    const htmlLink = data.htmlLink;

    if (!meetLink || !googleEventId) {
      logger.warn({ service: 'google-calendar', eventId: googleEventId }, 'Event created but no Meet link returned');
      return null;
    }

    logger.info({ service: 'google-calendar', googleEventId }, 'Google Meet link created');
    return { meetLink, googleEventId, htmlLink: htmlLink ?? '' };
  } catch (err) {
    logger.error({ service: 'google-calendar', err }, 'Failed to create Google Calendar event');
    return null;
  }
}

// ─── Public: delete a Google Calendar event ──────────────────────────────────

export async function deleteGoogleCalendarEvent(googleEventId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId });
    logger.info({ service: 'google-calendar', googleEventId }, 'Google Calendar event deleted');
  } catch (err) {
    logger.warn({ service: 'google-calendar', googleEventId, err }, 'Failed to delete Google Calendar event');
  }
}
